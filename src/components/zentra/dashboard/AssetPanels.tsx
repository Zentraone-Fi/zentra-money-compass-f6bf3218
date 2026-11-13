import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { D, Decimal, fmt, fmtPct } from "@/lib/zentra/decimal";
import { availableLiquidity, supplyRate, variableBorrowRate } from "@/lib/zentra/rates";
import { useZentra } from "@/lib/zentra/store";
import type { LendingAction } from "../ActionDialog";
import { Panel, SearchField } from "../Panel";
import { TokenIcon } from "../TokenIcon";
import { ColHead, EmptyRow } from "./shared";

type Open = (action: LendingAction, assetId: string) => void;
type Dir = 1 | -1;

function useSort<K extends string>(initial: K) {
  const [sort, setSort] = useState<{ key: K; dir: Dir }>({ key: initial, dir: -1 });
  const toggle = (key: K) => setSort((s) => ({ key, dir: s.key === key ? ((s.dir * -1) as Dir) : -1 }));
  return { sort, toggle };
}

const matches = (q: string, a: { symbol: string; name: string }) =>
  !q || a.symbol.toLowerCase().includes(q.toLowerCase()) || a.name.toLowerCase().includes(q.toLowerCase());

const SUPPLY_GRID = "grid grid-cols-[0.9fr_1.1fr_0.6fr_0.9fr_auto] items-center gap-3";

export function SupplyAssetsPanel({ onAction }: { onAction: Open }) {
  const { state, session } = useZentra();
  const [q, setQ] = useState("");
  const { sort, toggle } = useSort<"balance" | "apy">("apy");
  const rows = useMemo(() => {
    return state.markets
      .filter((m) => m.supplyEnabled)
      .map((m) => ({ m, a: state.assets.find((x) => x.id === m.assetId)!, apy: supplyRate(m), bal: D(state.wallet[m.assetId] ?? 0) }))
      .filter((r) => matches(q, r.a))
      .sort((x, y) => (sort.key === "apy" ? x.apy.cmp(y.apy) : x.bal.cmp(y.bal)) * sort.dir);
  }, [state, q, sort]);

  return (
    <Panel title="Supply Assets" action={<SearchField value={q} onChange={setQ} label="Search supply assets" />}>
      <div className="overflow-x-auto scrollbar-lime">
        <div className="min-w-[500px]">
          <div className={`${SUPPLY_GRID} mb-2 px-3`}>
            <ColHead>Assets</ColHead>
            <ColHead sortable active={sort.key === "balance"} onClick={() => toggle("balance")}>Wallet Balance</ColHead>
            <ColHead sortable active={sort.key === "apy"} onClick={() => toggle("apy")}>APY</ColHead>
            <ColHead>Collateral</ColHead>
            <span className="w-[136px]" />
          </div>
          <ul className="max-h-[196px] space-y-2 overflow-y-auto pr-2 scrollbar-lime">
            {rows.length === 0 && <EmptyRow>No assets match “{q}”.</EmptyRow>}
            {rows.map(({ m, a, apy, bal }) => (
              <li key={a.id} className={`${SUPPLY_GRID} panel-row px-3 py-2`}>
                <span className="flex items-center gap-2 text-[13px] font-semibold">
                  <TokenIcon kind={a.icon} /> {a.symbol}
                </span>
                <span className="text-[13px] tabular">
                  {session ? (
                    <>
                      {fmt(bal, 2, { trim: false })} <span className="font-semibold">{a.symbol}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
                <span className="text-[13px] tabular">{fmtPct(apy, 1)}</span>
                <span className="text-[13px] text-text-2">
                  {m.collateralEnabled ? <>Yes · {fmtPct(m.maxLtv, 0)} LTV</> : "No"}
                </span>
                <span className="flex gap-1.5">
                  <Button variant="action" size="sm" className="h-7 w-16 text-xs" onClick={() => onAction("supply", a.id)}>
                    Supply
                  </Button>
                  <Button asChild variant="pill" size="sm" className="h-7 w-16 text-xs">
                    <Link to="/markets/$assetId" params={{ assetId: a.id }}>Detail</Link>
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

const BORROW_GRID = "grid grid-cols-[0.8fr_1.1fr_0.9fr_0.8fr_auto] items-center gap-3";

export function BorrowAssetsPanel({ onAction }: { onAction: Open }) {
  const { state } = useZentra();
  const [q, setQ] = useState("");
  const { sort, toggle } = useSort<"available" | "variable" | "stable">("available");
  const rows = useMemo(() => {
    return state.markets
      .filter((m) => m.borrowEnabled)
      .map((m) => ({
        m,
        a: state.assets.find((x) => x.id === m.assetId)!,
        avail: availableLiquidity(m),
        variable: variableBorrowRate(m),
        stable: m.stableBorrowRate ? D(m.stableBorrowRate) : null,
      }))
      .filter((r) => matches(q, r.a))
      .sort((x, y) => {
        const v = (r: typeof x): Decimal =>
          sort.key === "available" ? r.avail : sort.key === "variable" ? r.variable : (r.stable ?? D(-1));
        return v(x).cmp(v(y)) * sort.dir;
      });
  }, [state, q, sort]);

  return (
    <Panel title="Borrow Assets" action={<SearchField value={q} onChange={setQ} label="Search borrow assets" />}>
      <div className="overflow-x-auto scrollbar-lime">
        <div className="min-w-[500px]">
          <div className={`${BORROW_GRID} mb-2 px-3`}>
            <ColHead>Assets</ColHead>
            <ColHead sortable active={sort.key === "available"} onClick={() => toggle("available")}>Available</ColHead>
            <ColHead sortable active={sort.key === "variable"} onClick={() => toggle("variable")}>APY Variable</ColHead>
            <ColHead sortable active={sort.key === "stable"} onClick={() => toggle("stable")}>APY Stable</ColHead>
            <span className="w-[136px]" />
          </div>
          <ul className="max-h-[196px] space-y-2 overflow-y-auto pr-2 scrollbar-lime">
            {rows.length === 0 && <EmptyRow>No assets match “{q}”.</EmptyRow>}
            {rows.map(({ a, avail, variable, stable }) => (
              <li key={a.id} className={`${BORROW_GRID} panel-row px-3 py-2`}>
                <span className="flex items-center gap-2 text-[13px]">
                  <TokenIcon kind={a.icon} /> {a.symbol}
                </span>
                <span className="text-[13px] tabular">
                  {fmt(avail, 2, { trim: true })} {a.symbol}
                </span>
                <span className="text-[13px] tabular">{fmtPct(variable, 1)}</span>
                <span className="text-[13px] tabular">{stable ? fmtPct(stable, 1) : <span className="text-muted-foreground">—</span>}</span>
                <span className="flex gap-1.5">
                  <Button variant="action" size="sm" className="h-7 w-16 text-xs" onClick={() => onAction("borrow", a.id)}>
                    Borrow
                  </Button>
                  <Button asChild variant="pill" size="sm" className="h-7 w-16 text-xs">
                    <Link to="/markets/$assetId" params={{ assetId: a.id }}>Detail</Link>
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
