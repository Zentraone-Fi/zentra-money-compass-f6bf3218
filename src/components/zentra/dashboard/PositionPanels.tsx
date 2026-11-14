import { Button } from "@/components/ui/button";
import { D, fmt, fmtPct, fmtUsd } from "@/lib/zentra/decimal";
import { displayPrice } from "@/lib/zentra/oracle";
import { supplyRate, variableBorrowRate } from "@/lib/zentra/rates";
import { marketOf, summarize } from "@/lib/zentra/risk";
import { useZentra } from "@/lib/zentra/store";
import type { LendingAction } from "../ActionDialog";
import { HealthFactor } from "../HealthFactor";
import { Panel } from "../Panel";
import { TokenIcon } from "../TokenIcon";
import { ColHead, ConnectEmpty, EmptyRow, InfoTip } from "./shared";

type Open = (action: LendingAction, assetId: string) => void;
const GRID = "grid grid-cols-[1fr_1.3fr_0.8fr_minmax(120px,1.3fr)] items-center gap-3";

export function YourSupplyPanel({ onAction }: { onAction: Open }) {
  const { state, session } = useZentra();
  return (
    <Panel title="Your Supply">
      {!session ? (
        <ConnectEmpty message="Connect your wallet to see what you've supplied." />
      ) : (
      <div className="overflow-x-auto scrollbar-lime">
        <div className="min-w-[440px]">
          <div className={`${GRID} mb-2 px-3`}>
            <ColHead>Assets</ColHead>
            <ColHead>Balance</ColHead>
            <ColHead>APY</ColHead>
            <span />
          </div>
          {state.supplies.length === 0 ? (
            <EmptyRow>Nothing supplied yet.</EmptyRow>
          ) : (
            <ul className="space-y-2">
              {state.supplies.map((p) => {
                const a = state.assets.find((x) => x.id === p.assetId)!;
                const m = marketOf(state.markets, p.assetId)!;
                return (
                  <li key={p.assetId} className={`${GRID} panel-row px-3 py-2`}>
                    <span className="flex items-center gap-2 text-lg font-medium">
                      <TokenIcon kind={a.icon} className="size-7" /> {a.symbol}
                    </span>
                    <span className="text-center text-xs leading-tight tabular">
                      <span className="block text-[13px]">
                        {fmt(p.amount, 2)} <span className="font-semibold">{a.symbol}</span>
                      </span>
                      <span className="text-text-2">{fmtUsd(D(p.amount).mul(displayPrice(state.prices, a.id)))}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[13px] tabular">
                      {fmtPct(supplyRate(m))}
                      <InfoTip text={`Variable supply APY. ${p.useAsCollateral ? "Used as collateral." : "Not used as collateral."}`} />
                    </span>
                    <Button variant="action" size="sm" className="h-7 w-full text-xs" onClick={() => onAction("withdraw", a.id)}>
                      Withdraw
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      )}
    </Panel>
  );
}

export function YourBorrowPanel({ onAction }: { onAction: Open }) {
  const { state, session } = useZentra();
  const summary = summarize(state);
  return (
    <Panel
      title="Your Borrow"
      action={
        session && state.borrows.length > 0 ? (
          <span className="flex items-center gap-2 text-sm text-text-2">
            Health factor <HealthFactor value={summary.healthFactor} className="text-base" />
            <InfoTip text="Collateral × liquidation threshold ÷ debt. Below 1.00 your position can be liquidated." />
          </span>
        ) : null
      }
    >
      {!session ? (
        <ConnectEmpty message="Connect your wallet to see your loans." />
      ) : (
      <div className="overflow-x-auto scrollbar-lime">
        <div className="min-w-[440px]">
          <div className={`${GRID} mb-2 px-3`}>
            <ColHead>Assets</ColHead>
            <ColHead>Balance</ColHead>
            <ColHead>APY</ColHead>
            <span />
          </div>
          {state.borrows.length === 0 ? (
            <EmptyRow>No open loans.</EmptyRow>
          ) : (
            <ul className="space-y-2">
              {state.borrows.map((b) => {
                const a = state.assets.find((x) => x.id === b.assetId)!;
                const m = marketOf(state.markets, b.assetId)!;
                return (
                  <li key={b.assetId} className={`${GRID} panel-row px-3 py-2`}>
                    <span className="flex items-center gap-2 text-[13px]">
                      <TokenIcon kind={a.icon} /> {a.symbol}
                    </span>
                    <span className="text-center text-xs leading-tight tabular">
                      <span className="block text-[13px]">
                        {fmt(b.amount, 4, { trim: true })} {a.symbol}
                      </span>
                      <span className="text-text-2">{fmtUsd(D(b.amount).mul(displayPrice(state.prices, a.id)))}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[13px] tabular">
                      {fmtPct(variableBorrowRate(m))}
                      <InfoTip text="Variable borrow APY, based on market utilization." />
                    </span>
                    <Button variant="action" size="sm" className="h-7 w-full text-xs" onClick={() => onAction("repay", a.id)}>
                      Repay
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      )}
    </Panel>
  );
}
