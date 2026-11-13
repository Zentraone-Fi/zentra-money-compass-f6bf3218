import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/zentra/PageHeader";
import { Panel, SearchField, SimBadge, StatTile } from "@/components/zentra/Panel";
import { TokenIcon } from "@/components/zentra/TokenIcon";
import { D, fmt, fmtPct, fmtUsd, ZERO } from "@/lib/zentra/decimal";
import { IS_SIMULATED } from "@/lib/zentra/env";
import { displayPrice } from "@/lib/zentra/oracle";
import { availableLiquidity, supplyRate, utilization, variableBorrowRate } from "@/lib/zentra/rates";
import { useZentra } from "@/lib/zentra/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/markets/")({
  head: () => ({
    meta: [
      { title: "Markets — ZENTRA Finance" },
      { name: "description", content: "Every ZENTRA lending market: prices, liquidity, utilization, variable rates and collateral rules." },
      { property: "og:title", content: "Markets — ZENTRA Finance" },
      { property: "og:description", content: "Liquidity, utilization, variable rates and collateral rules for every ZENTRA market." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Markets,
});

export const STATUS_STYLE = {
  active: "text-success",
  paused: "text-destructive",
  frozen: "text-warning",
} as const;

function Markets() {
  const { state } = useZentra();
  const [q, setQ] = useState("");
  let supplied = ZERO;
  let borrowed = ZERO;
  for (const m of state.markets) {
    const p = displayPrice(state.prices, m.assetId);
    supplied = supplied.add(D(m.totalSupplied).mul(p));
    borrowed = borrowed.add(D(m.totalBorrowed).mul(p));
  }
  const rows = state.markets.filter((m) => {
    const a = state.assets.find((x) => x.id === m.assetId)!;
    return !q || `${a.symbol} ${a.name}`.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <PageShell>
      <PageHeader
        title={<span className="flex items-center gap-3">Markets {IS_SIMULATED && <SimBadge />}</span>}
        subtitle="Rates move with utilization and are never fixed or guaranteed."
      />
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Total supplied" value={fmtUsd(supplied, 0)} />
        <StatTile label="Total borrowed" value={fmtUsd(borrowed, 0)} />
        <StatTile label="Available liquidity" value={fmtUsd(supplied.sub(borrowed), 0)} />
      </div>
      <Panel title="All markets" action={<SearchField value={q} onChange={setQ} label="Search markets" />}>
        <div className="overflow-x-auto scrollbar-lime">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="text-text-2">
              <tr>
                {["Asset", "Price", "Total supplied", "Available", "Utilization", "Supply APY", "Borrow APY", "Collateral", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const a = state.assets.find((x) => x.id === m.assetId)!;
                return (
                  <tr key={m.assetId} className="border-t border-panel-border/50">
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <TokenIcon kind={a.icon} />
                        <span>
                          <span className="block font-semibold">{a.symbol}</span>
                          <span className="text-xs text-text-2">{a.name}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular">{fmtUsd(displayPrice(state.prices, a.id), 4)}</td>
                    <td className="px-3 py-3 tabular">{fmt(m.totalSupplied, 2, { trim: true })}</td>
                    <td className="px-3 py-3 tabular">{fmt(availableLiquidity(m), 2, { trim: true })}</td>
                    <td className="px-3 py-3 tabular">{fmtPct(utilization(m), 1)}</td>
                    <td className="px-3 py-3 tabular">{m.supplyEnabled ? fmtPct(supplyRate(m)) : "—"}</td>
                    <td className="px-3 py-3 tabular">{m.borrowEnabled ? fmtPct(variableBorrowRate(m)) : "—"}</td>
                    <td className="px-3 py-3">{m.collateralEnabled ? `Yes · ${fmtPct(m.maxLtv, 0)}` : "No"}</td>
                    <td className={cn("px-3 py-3 capitalize", STATUS_STYLE[m.status])}>{m.status}</td>
                    <td className="px-3 py-3 text-right">
                      <Button asChild variant="pill" size="sm" className="h-7 px-4 text-xs">
                        <Link to="/markets/$assetId" params={{ assetId: a.id }}>Detail</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageShell>
  );
}
