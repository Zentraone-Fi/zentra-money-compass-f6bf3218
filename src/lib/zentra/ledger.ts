import { D, Decimal } from "./decimal";
import { createDevState } from "./dev-data";
import { validateBorrow, validateRepay, validateSupply, validateWithdraw, marketOf } from "./risk";
import { supplyRate, variableBorrowRate } from "./rates";
import { quoteSwap } from "./swap";
import type { AssetId, LedgerState, TxKind, TxRecord, TxStatus, ValidationResult } from "./types";

export interface TxRequest {
  kind: TxKind;
  assetId: AssetId;
  amount: string;
  counterAssetId?: AssetId;
  /** Swap only: reject if output falls below this. */
  minOut?: string;
}

export type Authorize = (tx: TxRecord) => Promise<boolean>;

/**
 * Boundary between the UI and the protocol. The Canton implementation talks to the
 * backend API, which exercises Daml choices on a participant node. The UI only ever
 * marks a tx confirmed once the adapter reports ledger confirmation.
 */
export interface LedgerAdapter {
  readonly mode: "simulated" | "canton";
  getState(): LedgerState;
  subscribe(listener: () => void): () => void;
  submit(req: TxRequest, authorize: Authorize, onStatus?: (tx: TxRecord) => void): Promise<TxRecord>;
  tick(now: number): void;
}

const YEAR_MS = 365 * 24 * 3600 * 1000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let seq = 0;
const newId = () => `sim-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** Applies a confirmed request to state after re-validating it (ledger-side checks). */
export function applyRequest(s: LedgerState, req: TxRequest, now: number): ValidationResult<LedgerState> {
  const amt = D(req.amount);
  const add = (map: Record<string, string>, id: string, d: Decimal) => ({
    ...map,
    [id]: D(map[id] ?? 0).add(d).toString(),
  });
  const bumpMarket = (st: LedgerState, id: string, supplied: Decimal, borrowed: Decimal) => ({
    ...st,
    markets: st.markets.map((m) =>
      m.assetId === id
        ? {
            ...m,
            totalSupplied: D(m.totalSupplied).add(supplied).toString(),
            totalBorrowed: D(m.totalBorrowed).add(borrowed).toString(),
          }
        : m,
    ),
  });

  switch (req.kind) {
    case "supply": {
      const v = validateSupply(s, req.assetId, amt);
      if (!v.ok) return v;
      const exists = s.supplies.some((p) => p.assetId === req.assetId);
      const supplies = exists
        ? s.supplies.map((p) => (p.assetId === req.assetId ? { ...p, amount: D(p.amount).add(amt).toString() } : p))
        : [
            ...s.supplies,
            {
              assetId: req.assetId,
              amount: amt.toString(),
              useAsCollateral: !!marketOf(s.markets, req.assetId)?.collateralEnabled,
            },
          ];
      return { ok: true, value: bumpMarket({ ...s, supplies, wallet: add(s.wallet, req.assetId, amt.neg()) }, req.assetId, amt, D(0)) };
    }
    case "withdraw": {
      const v = validateWithdraw(s, req.assetId, amt, now);
      if (!v.ok) return v;
      const supplies = s.supplies
        .map((p) => (p.assetId === req.assetId ? { ...p, amount: D(p.amount).sub(amt).toString() } : p))
        .filter((p) => D(p.amount).gt(0));
      return { ok: true, value: bumpMarket({ ...s, supplies, wallet: add(s.wallet, req.assetId, amt) }, req.assetId, amt.neg(), D(0)) };
    }
    case "borrow": {
      const v = validateBorrow(s, req.assetId, amt, now);
      if (!v.ok) return v;
      const exists = s.borrows.some((b) => b.assetId === req.assetId);
      const borrows = exists
        ? s.borrows.map((b) => (b.assetId === req.assetId ? { ...b, amount: D(b.amount).add(amt).toString() } : b))
        : [...s.borrows, { assetId: req.assetId, amount: amt.toString(), rateMode: "variable" as const }];
      return { ok: true, value: bumpMarket({ ...s, borrows, wallet: add(s.wallet, req.assetId, amt) }, req.assetId, D(0), amt) };
    }
    case "repay": {
      const v = validateRepay(s, req.assetId, amt);
      if (!v.ok) return v;
      const borrows = s.borrows
        .map((b) => (b.assetId === req.assetId ? { ...b, amount: D(b.amount).sub(amt).toString() } : b))
        .filter((b) => D(b.amount).gt(0));
      return { ok: true, value: bumpMarket({ ...s, borrows, wallet: add(s.wallet, req.assetId, amt.neg()) }, req.assetId, D(0), amt.neg()) };
    }
    case "swap": {
      if (!req.counterAssetId) return { ok: false, error: "Missing output token." };
      if (amt.gt(s.wallet[req.assetId] ?? 0)) return { ok: false, error: "Amount exceeds your wallet balance." };
      const q = quoteSwap(s.pools, req.assetId, req.counterAssetId, amt, D(0));
      if (!q.ok) return q;
      if (req.minOut && q.value.amountOut.lt(req.minOut))
        return { ok: false, error: "Price moved beyond your slippage tolerance." };
      let pools = s.pools;
      for (const h of q.value.hops) {
        pools = pools.map((p) => {
          if (p.id !== h.poolId) return p;
          const inA = p.assetA === h.from;
          const netIn = h.amountIn; // fee stays in the pool
          return inA
            ? { ...p, reserveA: D(p.reserveA).add(netIn).toString(), reserveB: D(p.reserveB).sub(h.amountOut).toString() }
            : { ...p, reserveB: D(p.reserveB).add(netIn).toString(), reserveA: D(p.reserveA).sub(h.amountOut).toString() };
        });
      }
      let wallet = add(s.wallet, req.assetId, amt.neg());
      wallet = add(wallet, req.counterAssetId, q.value.amountOut);
      return { ok: true, value: { ...s, pools, wallet } };
    }
    case "stake": {
      if (amt.lte(0)) return { ok: false, error: "Enter an amount greater than zero." };
      if (amt.gt(s.wallet[s.staking.assetId] ?? 0)) return { ok: false, error: "Amount exceeds your wallet balance." };
      return {
        ok: true,
        value: {
          ...s,
          wallet: add(s.wallet, s.staking.assetId, amt.neg()),
          staking: {
            ...s.staking,
            staked: D(s.staking.staked).add(amt).toString(),
            totalStaked: D(s.staking.totalStaked).add(amt).toString(),
          },
        },
      };
    }
    case "unstake": {
      if (amt.lte(0)) return { ok: false, error: "Enter an amount greater than zero." };
      if (amt.gt(s.staking.staked)) return { ok: false, error: "Amount exceeds your staked balance." };
      return {
        ok: true,
        value: {
          ...s,
          wallet: add(s.wallet, s.staking.assetId, amt),
          staking: {
            ...s.staking,
            staked: D(s.staking.staked).sub(amt).toString(),
            totalStaked: D(s.staking.totalStaked).sub(amt).toString(),
          },
        },
      };
    }
    case "claim": {
      const r = D(s.staking.pendingRewards);
      if (r.lte(0)) return { ok: false, error: "No rewards to claim yet." };
      return {
        ok: true,
        value: { ...s, wallet: add(s.wallet, s.staking.assetId, r), staking: { ...s.staking, pendingRewards: "0" } },
      };
    }
  }
}

/** Deterministic simple-interest accrual over `dtMs` using current utilization rates. */
export function accrue(s: LedgerState, dtMs: number): LedgerState {
  if (dtMs <= 0) return s;
  const f = D(dtMs).div(YEAR_MS);
  return {
    ...s,
    supplies: s.supplies.map((p) => {
      const m = marketOf(s.markets, p.assetId);
      return m ? { ...p, amount: D(p.amount).mul(D(1).add(supplyRate(m).mul(f))).toString() } : p;
    }),
    borrows: s.borrows.map((b) => {
      const m = marketOf(s.markets, b.assetId);
      if (!m) return b;
      const rate = b.rateMode === "stable" && m.stableBorrowRate ? D(m.stableBorrowRate) : variableBorrowRate(m);
      return { ...b, amount: D(b.amount).mul(D(1).add(rate.mul(f))).toString() };
    }),
    staking: {
      ...s.staking,
      pendingRewards: D(s.staking.pendingRewards)
        .add(D(s.staking.staked).mul(s.staking.rewardRate).mul(f))
        .toString(),
    },
  };
}

/** In-memory adapter for local development. Every record it produces is flagged simulated. */
export function createDevLedger(now = Date.now()): LedgerAdapter {
  let state = createDevState(now);
  let lastTick = now;
  const listeners = new Set<() => void>();
  const set = (next: LedgerState) => {
    state = next;
    listeners.forEach((l) => l());
  };
  const patchTx = (id: string, status: TxStatus, error?: string) => {
    let rec: TxRecord | undefined;
    set({
      ...state,
      txs: state.txs.map((t) => {
        if (t.id !== id) return t;
        rec = { ...t, status, updatedAt: Date.now(), ...(error ? { error } : {}) };
        return rec;
      }),
    });
    return rec!;
  };

  return {
    mode: "simulated",
    getState: () => state,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    tick(t) {
      const dt = t - lastTick;
      lastTick = t;
      // Dev oracle: refresh timestamps so prices stay valid.
      set({ ...accrue(state, dt), prices: state.prices.map((p) => ({ ...p, observedAt: t })) });
    },
    async submit(req, authorize, onStatus) {
      const t = Date.now();
      const tx: TxRecord = {
        id: newId(),
        kind: req.kind,
        assetId: req.assetId,
        amount: req.amount,
        counterAssetId: req.counterAssetId,
        status: "draft",
        createdAt: t,
        updatedAt: t,
        simulated: true,
      };
      set({ ...state, txs: [tx, ...state.txs] });
      onStatus?.(patchTx(tx.id, "awaiting_authorization"));
      const approved = await authorize(tx).catch(() => false);
      if (!approved) {
        const r = patchTx(tx.id, "rejected", "Authorization was declined in the wallet.");
        onStatus?.(r);
        return r;
      }
      onStatus?.(patchTx(tx.id, "submitted"));
      await wait(500);
      onStatus?.(patchTx(tx.id, "pending_confirmation"));
      await wait(900);
      const before = state;
      const result = applyRequest(state, req, Date.now());
      if (!result.ok) {
        const r = patchTx(tx.id, "failed", result.error);
        onStatus?.(r);
        return r;
      }
      let counterAmount: string | undefined;
      if (req.kind === "swap" && req.counterAssetId) {
        counterAmount = D(result.value.wallet[req.counterAssetId] ?? 0)
          .sub(before.wallet[req.counterAssetId] ?? 0)
          .toString();
      }
      if (req.kind === "claim") counterAmount = before.staking.pendingRewards;
      const confirmed: TxRecord = { ...tx, status: "confirmed", updatedAt: Date.now(), counterAmount };
      set({ ...result.value, txs: state.txs.map((x) => (x.id === tx.id ? confirmed : x)) });
      onStatus?.(confirmed);
      return confirmed;
    },
  };
}
