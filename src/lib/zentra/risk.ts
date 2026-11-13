import { D, Decimal, ZERO } from "./decimal";
import { displayPrice, validPrice } from "./oracle";
import { availableLiquidity } from "./rates";
import type { AssetId, LedgerState, Market, ValidationResult } from "./types";

/**
 * Frontend risk previews. These mirror the rules the Daml RiskEngine must enforce;
 * the ledger remains authoritative and re-checks every transition.
 */
export interface AccountSummary {
  totalSuppliedUsd: Decimal;
  totalCollateralUsd: Decimal;
  totalBorrowedUsd: Decimal;
  netUsd: Decimal;
  /** Σ collateral × maxLtv */
  borrowLimitUsd: Decimal;
  /** Σ collateral × liquidationThreshold */
  liquidationLimitUsd: Decimal;
  availableToBorrowUsd: Decimal;
  currentLtv: Decimal;
  /** null when there is no debt (infinite health). */
  healthFactor: Decimal | null;
}

type Positions = Pick<LedgerState, "supplies" | "borrows" | "markets" | "prices">;

export function marketOf(markets: Market[], assetId: AssetId): Market | undefined {
  return markets.find((m) => m.assetId === assetId);
}

export function summarize(s: Positions): AccountSummary {
  let supplied = ZERO;
  let collateral = ZERO;
  let borrowLimit = ZERO;
  let liqLimit = ZERO;
  let borrowed = ZERO;
  for (const p of s.supplies) {
    const m = marketOf(s.markets, p.assetId);
    const usd = D(p.amount).mul(displayPrice(s.prices, p.assetId));
    supplied = supplied.add(usd);
    if (p.useAsCollateral && m?.collateralEnabled) {
      collateral = collateral.add(usd);
      borrowLimit = borrowLimit.add(usd.mul(m.maxLtv));
      liqLimit = liqLimit.add(usd.mul(m.liquidationThreshold));
    }
  }
  for (const b of s.borrows) {
    borrowed = borrowed.add(D(b.amount).mul(displayPrice(s.prices, b.assetId)));
  }
  return {
    totalSuppliedUsd: supplied,
    totalCollateralUsd: collateral,
    totalBorrowedUsd: borrowed,
    netUsd: supplied.sub(borrowed),
    borrowLimitUsd: borrowLimit,
    liquidationLimitUsd: liqLimit,
    availableToBorrowUsd: Decimal.max(borrowLimit.sub(borrowed), 0),
    currentLtv: collateral.gt(0) ? borrowed.div(collateral) : ZERO,
    healthFactor: borrowed.gt(0) ? liqLimit.div(borrowed) : null,
  };
}

export interface ActionPreview {
  before: AccountSummary;
  after: AccountSummary;
}

function withSupplyDelta(s: Positions, assetId: AssetId, delta: Decimal): Positions {
  const existing = s.supplies.find((p) => p.assetId === assetId);
  const m = marketOf(s.markets, assetId);
  const supplies = existing
    ? s.supplies.map((p) =>
        p.assetId === assetId ? { ...p, amount: Decimal.max(D(p.amount).add(delta), 0).toString() } : p,
      )
    : [...s.supplies, { assetId, amount: delta.toString(), useAsCollateral: !!m?.collateralEnabled }];
  return { ...s, supplies };
}

function withBorrowDelta(s: Positions, assetId: AssetId, delta: Decimal): Positions {
  const existing = s.borrows.find((b) => b.assetId === assetId);
  const borrows = existing
    ? s.borrows.map((b) =>
        b.assetId === assetId ? { ...b, amount: Decimal.max(D(b.amount).add(delta), 0).toString() } : b,
      )
    : [...s.borrows, { assetId, amount: delta.toString(), rateMode: "variable" as const }];
  return { ...s, borrows };
}

const positive = (amount: Decimal): string | null =>
  amount.lte(0) ? "Enter an amount greater than zero." : null;

function marketGate(m: Market | undefined, action: "supply" | "borrow"): string | null {
  if (!m) return "This market is not available.";
  if (m.status === "paused") return "This market is paused.";
  if (m.status === "frozen" && (action === "supply" || action === "borrow"))
    return "This market is frozen for new positions.";
  if (action === "supply" && !m.supplyEnabled) return "Supplying is not enabled for this market.";
  if (action === "borrow" && !m.borrowEnabled) return "Borrowing is not enabled for this market.";
  return null;
}

export function validateSupply(
  s: LedgerState,
  assetId: AssetId,
  amount: Decimal,
): ValidationResult<ActionPreview> {
  const e = positive(amount) ?? marketGate(marketOf(s.markets, assetId), "supply");
  if (e) return { ok: false, error: e };
  const m = marketOf(s.markets, assetId)!;
  if (amount.gt(s.wallet[assetId] ?? 0)) return { ok: false, error: "Amount exceeds your wallet balance." };
  if (D(m.totalSupplied).add(amount).gt(m.supplyCap))
    return { ok: false, error: "This deposit would exceed the market's supply cap." };
  return { ok: true, value: { before: summarize(s), after: summarize(withSupplyDelta(s, assetId, amount)) } };
}

export function validateWithdraw(
  s: LedgerState,
  assetId: AssetId,
  amount: Decimal,
  now: number,
): ValidationResult<ActionPreview> {
  const e = positive(amount);
  if (e) return { ok: false, error: e };
  const m = marketOf(s.markets, assetId);
  if (!m) return { ok: false, error: "This market is not available." };
  if (m.status === "paused") return { ok: false, error: "This market is paused." };
  const pos = s.supplies.find((p) => p.assetId === assetId);
  if (!pos || amount.gt(pos.amount)) return { ok: false, error: "Amount exceeds your supplied balance." };
  if (amount.gt(availableLiquidity(m)))
    return { ok: false, error: "Not enough available liquidity in this market right now." };
  const after = summarize(withSupplyDelta(s, assetId, amount.neg()));
  if (pos.useAsCollateral && after.totalBorrowedUsd.gt(0)) {
    for (const b of s.borrows) {
      const p = validPrice(s.prices, b.assetId, now);
      if (!p.ok) return p;
    }
    const p = validPrice(s.prices, assetId, now);
    if (!p.ok) return p;
    if (after.healthFactor !== null && after.healthFactor.lt(1))
      return { ok: false, error: "This withdrawal would make your position eligible for liquidation." };
    if (after.totalBorrowedUsd.gt(after.borrowLimitUsd))
      return { ok: false, error: "This withdrawal would push your loan above the maximum LTV." };
  }
  return { ok: true, value: { before: summarize(s), after } };
}

export function validateBorrow(
  s: LedgerState,
  assetId: AssetId,
  amount: Decimal,
  now: number,
): ValidationResult<ActionPreview> {
  const m = marketOf(s.markets, assetId);
  const e = positive(amount) ?? marketGate(m, "borrow");
  if (e) return { ok: false, error: e };
  if (amount.gt(availableLiquidity(m!)))
    return { ok: false, error: "Not enough available liquidity in this market." };
  if (D(m!.totalBorrowed).add(amount).gt(m!.borrowCap))
    return { ok: false, error: "This loan would exceed the market's borrow cap." };
  // Risk-sensitive: every involved price must be fresh.
  const involved = new Set<AssetId>([assetId, ...s.borrows.map((b) => b.assetId)]);
  for (const p of s.supplies) if (p.useAsCollateral) involved.add(p.assetId);
  for (const id of involved) {
    const p = validPrice(s.prices, id, now);
    if (!p.ok) return p;
  }
  const before = summarize(s);
  if (before.totalCollateralUsd.lte(0)) return { ok: false, error: "Supply collateral before borrowing." };
  const after = summarize(withBorrowDelta(s, assetId, amount));
  if (after.totalBorrowedUsd.gt(after.borrowLimitUsd))
    return { ok: false, error: "This amount is above your maximum LTV. Lower it or add collateral." };
  return { ok: true, value: { before, after } };
}

export function validateRepay(
  s: LedgerState,
  assetId: AssetId,
  amount: Decimal,
): ValidationResult<ActionPreview> {
  const e = positive(amount);
  if (e) return { ok: false, error: e };
  const debt = s.borrows.find((b) => b.assetId === assetId);
  if (!debt || D(debt.amount).lte(0)) return { ok: false, error: "You have no debt in this asset." };
  if (amount.gt(debt.amount)) return { ok: false, error: "Amount is more than your outstanding debt." };
  if (amount.gt(s.wallet[assetId] ?? 0)) return { ok: false, error: "Amount exceeds your wallet balance." };
  return { ok: true, value: { before: summarize(s), after: summarize(withBorrowDelta(s, assetId, amount.neg())) } };
}

/** Largest amount the user can borrow of an asset without crossing max LTV or liquidity. */
export function maxBorrowable(s: LedgerState, assetId: AssetId): Decimal {
  const m = marketOf(s.markets, assetId);
  const price = displayPrice(s.prices, assetId);
  if (!m || price.lte(0)) return ZERO;
  const byLtv = summarize(s).availableToBorrowUsd.div(price);
  return Decimal.max(Decimal.min(byLtv, availableLiquidity(m), D(m.borrowCap).sub(m.totalBorrowed)), 0);
}

export type HealthBand = "none" | "safe" | "caution" | "danger";
export function healthBand(hf: Decimal | null): HealthBand {
  if (hf === null) return "none";
  if (hf.lt(1.1)) return "danger";
  if (hf.lt(1.5)) return "caution";
  return "safe";
}
