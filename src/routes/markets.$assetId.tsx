import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ActionDialog, type LendingAction } from "@/components/zentra/ActionDialog";
import { PageShell } from "@/components/zentra/PageHeader";
import { Panel, SimBadge, StatTile } from "@/components/zentra/Panel";
import { TokenIcon } from "@/components/zentra/TokenIcon";
import { ASSETS } from "@/lib/zentra/dev-data";
import { D, fmt, fmtPct, fmtUsd } from "@/lib/zentra/decimal";
import { IS_SIMULATED } from "@/lib/zentra/env";
import { displayPrice } from "@/lib/zentra/oracle";
import { availableLiquidity, supplyRate, utilization, variableBorrowRate } from "@/lib/zentra/rates";
import { marketOf } from "@/lib/zentra/risk";
import { useZentra } from "@/lib/zentra/store";
import type { Market } from "@/lib/zentra/types";

export const Route = createFileRoute("/markets/$assetId")({
  loader: ({ params }) => {
    const asset = ASSETS.find((a) => a.id === params.assetId);
    if (!asset) throw notFound();
    return { symbol: asset.symbol, name: asset.name };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.symbol} market — ZENTRA Finance` : "Market unavailable — ZENTRA Finance";
    const d = loaderData
      ? `${loaderData.name} on ZENTRA: liquidity, utilization, variable rates and risk parameters.`
      : "This market could not be found.";
    return {
      meta: [
        { title: t },
        { name: "description", content: d },
        { property: "og:title", content: t },
        { property: "og:description", content: d },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => (
    <PageShell>
      <div className="py-24 text-center">
        <h1 className="text-2xl font-medium">Market not found</h1>
        <Link to="/markets" className="mt-4 inline-block text-lime hover:underline">Back to markets</Link>
      </div>
    </PageShell>
  ),
  component: MarketDetail,
});

/** Draws the kinked borrow-rate curve for a market's rate model. */
function RateCurve({ m }: { m: Market }) {
  const pts: string[] = [];
  const supplyPts: string[] = [];
  let maxRate = D(0);
  const samples = Array.from({ length: 41 }, (_, i) => i / 40);
  const rates = samples.map((u) => {
    const mm = { ...m, totalSupplied: "1", totalBorrowed: String(u) };
    const r = variableBorrowRate(mm);
    const s = supplyRate(mm);
    if (r.gt(maxRate)) maxRate = r;
    return { u, r, s };
  });
  const W = 520, H = 180;
  for (const { u, r, s } of rates) {
    pts.push(`${(u * W).toFixed(1)},${(H - r.div(maxRate).mul(H).toNumber()).toFixed(1)}`);
    supplyPts.push(`${(u * W).toFixed(1)},${(H - s.div(maxRate).mul(H).toNumber()).toFixed(1)}`);
  }
  const curU = utilization(m).toNumber();
  return (
    <figure>
      <svg viewBox={`0 -8 ${W} ${H + 16}`} className="h-48 w-full" role="img" aria-label="Interest rate versus utilization">
        <line x1={0} y1={H} x2={W} y2={H} stroke="var(--panel-border)" />
        <polyline points={pts.join(" ")} fill="none" stroke="var(--lime)" strokeWidth={2} />
        <polyline points={supplyPts.join(" ")} fill="none" stroke="var(--gold)" strokeWidth={2} strokeDasharray="4 4" />
        <line x1={curU * W} y1={0} x2={curU * W} y2={H} stroke="var(--text-2)" strokeDasharray="2 4" />
        <text x={Math.min(curU * W + 6, W - 120)} y={12} fontSize={11} fill="var(--text-2)">
          Current {fmtPct(curU, 1)}
        </text>
      </svg>
      <figcaption className="mt-2 flex gap-4 text-xs text-text-2">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-lime" /> Borrow rate</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-warning" /> Supply rate</span>
        <span>X axis: utilization 0–100%</span>
      </figcaption>
    </figure>
  );
}

function MarketDetail() {
  const { assetId } = Route.useParams();
  const { state } = useZentra();
  const [dialog, setDialog] = useState<LendingAction | null>(null);
  const asset = state.assets.find((a) => a.id === assetId)!;
  const m = marketOf(state.markets, assetId)!;
  const price = displayPrice(state.prices, assetId);
  const obs = state.prices.find((p) => p.assetId === assetId);

  return (
    <PageShell>
      <Link to="/markets" className="mt-6 inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-foreground">
        <ArrowLeft className="size-4" /> Markets
      </Link>
      <div className="mb-6 mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TokenIcon kind={asset.icon} className="size-12" />
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-medium">
              {asset.symbol} {IS_SIMULATED && <SimBadge />}
            </h1>
            <p className="text-sm text-text-2">{asset.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {m.supplyEnabled && <Button variant="action" size="xl" onClick={() => setDialog("supply")}>Supply</Button>}
          {m.borrowEnabled && <Button variant="action" size="xl" onClick={() => setDialog("borrow")}>Borrow</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Oracle price" value={fmtUsd(price, 4)} hint={obs?.source} />
        <StatTile label="Total supplied" value={`${fmt(m.totalSupplied, 2, { trim: true })} ${asset.symbol}`} hint={fmtUsd(D(m.totalSupplied).mul(price), 0)} />
        <StatTile label="Available liquidity" value={`${fmt(availableLiquidity(m), 2, { trim: true })} ${asset.symbol}`} />
        <StatTile label="Utilization" value={fmtPct(utilization(m), 1)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Interest rate model">
          <RateCurve m={m} />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile label="Supply APY (variable)" value={m.supplyEnabled ? fmtPct(supplyRate(m)) : "—"} />
            <StatTile label="Borrow APY (variable)" value={m.borrowEnabled ? fmtPct(variableBorrowRate(m)) : "—"} />
            <StatTile label="Borrow APY (stable)" value={m.stableBorrowRate ? fmtPct(m.stableBorrowRate) : "—"} />
          </div>
        </Panel>
        <Panel title="Risk parameters">
          <dl className="divide-y divide-panel-border/50 text-sm">
            {[
              ["Status", <span key="s" className="capitalize">{m.status}</span>],
              ["Usable as collateral", m.collateralEnabled ? "Yes" : "No"],
              ["Max LTV", m.collateralEnabled ? fmtPct(m.maxLtv, 0) : "—"],
              ["Liquidation threshold", m.collateralEnabled ? fmtPct(m.liquidationThreshold, 0) : "—"],
              ["Liquidation bonus", fmtPct(m.liquidationBonus, 0)],
              ["Reserve factor", fmtPct(m.reserveFactor, 0)],
              ["Supply cap", `${fmt(m.supplyCap, 0)} ${asset.symbol}`],
              ["Borrow cap", m.borrowEnabled ? `${fmt(m.borrowCap, 0)} ${asset.symbol}` : "—"],
              ["Optimal utilization", fmtPct(m.rateModel.optimalUtilization, 0)],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between gap-4 py-2.5">
                <dt className="text-text-2">{k}</dt>
                <dd className="tabular">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      <ActionDialog action={dialog} assetId={dialog ? assetId : null} onClose={() => setDialog(null)} />
    </PageShell>
  );
}
