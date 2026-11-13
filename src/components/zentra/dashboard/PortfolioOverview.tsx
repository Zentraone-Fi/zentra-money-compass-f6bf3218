import { fmtPct, fmtUsd } from "@/lib/zentra/decimal";
import { summarize } from "@/lib/zentra/risk";
import { useZentra } from "@/lib/zentra/store";
import { HealthFactor } from "../HealthFactor";
import { Panel, SimBadge, StatTile } from "../Panel";

export function PortfolioOverview() {
  const { state, session } = useZentra();
  if (!session) return null;
  const s = summarize(state);
  return (
    <Panel title={<span className="flex items-center gap-3">Portfolio overview {session.simulated && <SimBadge />}</span>}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Net value" value={fmtUsd(s.netUsd)} />
        <StatTile label="Total supplied" value={fmtUsd(s.totalSuppliedUsd)} />
        <StatTile label="Collateral" value={fmtUsd(s.totalCollateralUsd)} />
        <StatTile label="Total borrowed" value={fmtUsd(s.totalBorrowedUsd)} />
        <StatTile label="Available to borrow" value={fmtUsd(s.availableToBorrowUsd)} hint={`LTV ${fmtPct(s.currentLtv)}`} />
        <StatTile label="Health factor" value={<HealthFactor value={s.healthFactor} />} hint="Liquidation below 1.00" />
      </div>
    </Panel>
  );
}
