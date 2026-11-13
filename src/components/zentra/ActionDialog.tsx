import { AlertTriangle, ArrowRight, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { D, Decimal, fmt, fmtPct, fmtUsd, parseAmount, ZERO } from "@/lib/zentra/decimal";
import { displayPrice } from "@/lib/zentra/oracle";
import { availableLiquidity, supplyRate, variableBorrowRate } from "@/lib/zentra/rates";
import {
  marketOf,
  maxBorrowable,
  validateBorrow,
  validateRepay,
  validateSupply,
  validateWithdraw,
  type ActionPreview,
} from "@/lib/zentra/risk";
import { useZentra } from "@/lib/zentra/store";
import type { ValidationResult } from "@/lib/zentra/types";
import { HealthFactor } from "./HealthFactor";
import { SimBadge } from "./Panel";
import { TokenIcon } from "./TokenIcon";

export type LendingAction = "supply" | "withdraw" | "borrow" | "repay";

const VERB: Record<LendingAction, string> = { supply: "Supply", withdraw: "Withdraw", borrow: "Borrow", repay: "Repay" };

export function ActionDialog({
  action,
  assetId,
  onClose,
}: {
  action: LendingAction | null;
  assetId: string | null;
  onClose: () => void;
}) {
  const open = !!action && !!assetId;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="panel max-h-[92vh] max-w-md overflow-y-auto border-panel-border">
        {open && <ActionBody key={`${action}-${assetId}`} action={action!} assetId={assetId!} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-text-2">{label}</span>
      <span className="text-right tabular">{children}</span>
    </div>
  );
}

function ActionBody({ action, assetId, onClose }: { action: LendingAction; assetId: string; onClose: () => void }) {
  const { state, submit, session, setConnectOpen } = useZentra();
  const [input, setInput] = useState("");
  const [step, setStep] = useState<"form" | "review">("form");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setNow(Date.now()), [input]);

  const asset = state.assets.find((a) => a.id === assetId)!;
  const market = marketOf(state.markets, assetId)!;
  const price = displayPrice(state.prices, assetId);
  const wallet = D(state.wallet[assetId] ?? 0);
  const supplied = D(state.supplies.find((p) => p.assetId === assetId)?.amount ?? 0);
  const debt = D(state.borrows.find((b) => b.assetId === assetId)?.amount ?? 0);
  const rate = action === "supply" || action === "withdraw" ? supplyRate(market) : variableBorrowRate(market);

  const max: Decimal = useMemo(() => {
    switch (action) {
      case "supply":
        return wallet;
      case "withdraw":
        return Decimal.min(supplied, availableLiquidity(market));
      case "borrow":
        return maxBorrowable(state, assetId).mul(0.99);
      case "repay":
        return Decimal.min(debt, wallet);
    }
  }, [action, wallet, supplied, market, state, assetId, debt]);

  const amount = parseAmount(input);
  const tooManyDp = amount && (amount.decimalPlaces() ?? 0) > asset.decimals;
  const result: ValidationResult<ActionPreview> | null = useMemo(() => {
    if (!input) return null;
    if (!amount) return { ok: false, error: "Enter a valid number." };
    if (tooManyDp) return { ok: false, error: `${asset.symbol} supports up to ${asset.decimals} decimals.` };
    switch (action) {
      case "supply":
        return validateSupply(state, assetId, amount);
      case "withdraw":
        return validateWithdraw(state, assetId, amount, now);
      case "borrow":
        return validateBorrow(state, assetId, amount, now);
      case "repay":
        return validateRepay(state, assetId, amount);
    }
  }, [input, amount, tooManyDp, action, state, assetId, now, asset]);

  const preview = result?.ok ? result.value : null;
  const hfAfter = preview?.after.healthFactor ?? null;
  const risky = (action === "borrow" || action === "withdraw") && hfAfter !== null && hfAfter.lt(1.5);
  const balanceLabel = { supply: "Wallet balance", withdraw: "Supplied", borrow: "Available to borrow", repay: "Outstanding debt" }[action];
  const balanceValue = { supply: wallet, withdraw: supplied, borrow: max, repay: debt }[action];

  const onSubmit = async () => {
    if (!session) {
      setConnectOpen(true);
      return;
    }
    if (!amount) return;
    onClose();
    await submit({ kind: action, assetId, amount: amount.toString() });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 text-xl font-medium">
          <TokenIcon kind={asset.icon} className="size-8" />
          {VERB[action]} {asset.symbol}
          {session?.simulated && <SimBadge />}
        </DialogTitle>
        <DialogDescription className="text-text-2">{asset.name}</DialogDescription>
      </DialogHeader>

      {step === "form" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-panel-border bg-field p-3 focus-within:border-lime/60">
            <div className="flex items-center justify-between text-xs text-text-2">
              <label htmlFor="amount">Amount</label>
              <span className="tabular">
                {balanceLabel}: {fmt(balanceValue, 4, { trim: true })} {asset.symbol}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                id="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={input}
                onChange={(e) => setInput(e.target.value.replace(",", "."))}
                className="min-w-0 flex-1 bg-transparent text-2xl font-medium tabular placeholder:text-muted-foreground focus:outline-none"
              />
              <Button
                type="button"
                variant="pill"
                size="row"
                onClick={() => setInput(max.gt(0) ? max.toDecimalPlaces(Math.min(asset.decimals, 8), Decimal.ROUND_DOWN).toString() : "0")}
              >
                {action === "repay" ? "Full" : "Max"}
              </Button>
            </div>
            <div className="mt-1 text-xs text-muted-foreground tabular">≈ {fmtUsd((amount ?? ZERO).mul(price))}</div>
          </div>

          {result && !result.ok && (
            <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {result.error}
            </p>
          )}

          <div className="panel-row divide-y divide-panel-border/50 px-4 py-2">
            <Row label={action === "supply" || action === "withdraw" ? "Supply APY (variable)" : "Borrow APY (variable)"}>
              {fmtPct(rate)}
            </Row>
            {(action === "supply" || action === "borrow") && (
              <Row label={action === "supply" ? "Est. annual interest" : "Est. annual cost"}>
                {fmt((amount ?? ZERO).mul(rate), 4, { trim: true })} {asset.symbol}
              </Row>
            )}
            {market.collateralEnabled && action === "supply" && (
              <Row label="Collateral">Yes · max LTV {fmtPct(market.maxLtv, 0)}</Row>
            )}
            <Row label="Health factor">
              <span className="inline-flex items-center gap-1.5">
                <HealthFactor value={preview?.before.healthFactor ?? null} />
                {preview && (
                  <>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    <HealthFactor value={hfAfter} />
                  </>
                )}
              </span>
            </Row>
            {preview && (
              <Row label="Borrow capacity after">{fmtUsd(preview.after.availableToBorrowUsd)}</Row>
            )}
            {preview && preview.after.totalCollateralUsd.gt(0) && (
              <Row label="Loan-to-value after">{fmtPct(preview.after.currentLtv)}</Row>
            )}
          </div>

          {risky && (
            <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Your health factor would be close to 1. If it drops below 1, part of your collateral can be liquidated.
            </p>
          )}

          <Button variant="action" size="xl" className="w-full" disabled={!preview} onClick={() => setStep("review")}>
            Review {VERB[action].toLowerCase()}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="panel-row divide-y divide-panel-border/50 px-4 py-2">
            <Row label="Action">{VERB[action]}</Row>
            <Row label="Amount">
              {fmt(amount!, 6, { trim: true })} {asset.symbol}
            </Row>
            <Row label="Value">{fmtUsd(amount!.mul(price))}</Row>
            <Row label="APY (variable)">{fmtPct(rate)}</Row>
            <Row label="Health factor after">
              <HealthFactor value={hfAfter} />
            </Row>
            <Row label="Network">Canton Network{session?.simulated ? " (simulated)" : ""}</Row>
          </div>
          <p className="flex items-start gap-2 text-xs text-text-2">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Rates are variable and not guaranteed. Your position updates only after the ledger confirms the
            transaction.
          </p>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button variant="pill" size="xl" onClick={() => setStep("form")}>
              Back
            </Button>
            <Button variant="action" size="xl" onClick={onSubmit}>
              {session ? "Authorize in wallet" : "Connect wallet"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
