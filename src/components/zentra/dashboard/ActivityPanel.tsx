import { format } from "date-fns";
import { useMemo, useState } from "react";

import { fmt } from "@/lib/zentra/decimal";
import { TX_KIND_LABEL, TX_STATUS_LABEL, useZentra } from "@/lib/zentra/store";
import type { TxRecord } from "@/lib/zentra/types";
import { cn } from "@/lib/utils";
import { Panel, SimBadge } from "../Panel";
import { EmptyRow } from "./shared";

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-2">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-full border border-panel-border bg-field px-3 text-xs text-foreground focus:border-lime/60 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

const STATUS_TONE: Partial<Record<TxRecord["status"], string>> = {
  confirmed: "text-success",
  failed: "text-destructive",
  rejected: "text-destructive",
  expired: "text-muted-foreground",
};

const RANGES = { all: Infinity, "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5 } as const;

export function ActivityPanel() {
  const { state, session } = useZentra();
  const [kind, setKind] = useState("all");
  const [asset, setAsset] = useState("all");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState<keyof typeof RANGES>("all");

  const rows = useMemo(() => {
    const now = Date.now();
    return state.txs.filter(
      (t) =>
        (kind === "all" || t.kind === kind) &&
        (asset === "all" || t.assetId === asset || t.counterAssetId === asset) &&
        (status === "all" || t.status === status) &&
        now - t.createdAt <= RANGES[range],
    );
  }, [state.txs, kind, asset, status, range]);

  if (!session) return null;

  return (
    <Panel
      title="Activity"
      action={
        <div className="flex flex-wrap gap-2">
          <FilterSelect label="Type" value={kind} onChange={setKind} options={[{ value: "all", label: "All types" }, ...Object.entries(TX_KIND_LABEL).map(([value, label]) => ({ value, label }))]} />
          <FilterSelect label="Asset" value={asset} onChange={setAsset} options={[{ value: "all", label: "All assets" }, ...state.assets.map((a) => ({ value: a.id, label: a.symbol }))]} />
          <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "all", label: "Any status" }, ...Object.entries(TX_STATUS_LABEL).map(([value, label]) => ({ value, label }))]} />
          <FilterSelect label="Date" value={range} onChange={(v) => setRange(v as keyof typeof RANGES)} options={[{ value: "all", label: "All time" }, { value: "24h", label: "Last 24h" }, { value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }]} />
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyRow>{state.txs.length === 0 ? "Your transactions this session will appear here." : "No transactions match these filters."}</EmptyRow>
      ) : (
        <div className="overflow-x-auto scrollbar-lime">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead className="text-text-2">
              <tr>
                <th className="px-3 py-2 font-normal">Type</th>
                <th className="px-3 py-2 font-normal">Amount</th>
                <th className="px-3 py-2 font-normal">Status</th>
                <th className="px-3 py-2 font-normal">Time</th>
                <th className="px-3 py-2 font-normal">Reference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-panel-border/50">
                  <td className="px-3 py-2.5 font-medium">{TX_KIND_LABEL[t.kind]}</td>
                  <td className="px-3 py-2.5 tabular">
                    {t.kind === "claim"
                      ? t.counterAmount ? `${fmt(t.counterAmount, 4, { trim: true })} ${t.assetId}` : "—"
                      : `${fmt(t.amount, 6, { trim: true })} ${t.assetId}`}
                    {t.kind === "swap" && t.counterAssetId && (
                      <span className="text-text-2"> → {t.counterAmount ? fmt(t.counterAmount, 6, { trim: true }) : ""} {t.counterAssetId}</span>
                    )}
                  </td>
                  <td className={cn("px-3 py-2.5", STATUS_TONE[t.status] ?? "text-warning")}>
                    {TX_STATUS_LABEL[t.status]}
                    {t.error && <span className="block text-xs text-text-2">{t.error}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-text-2 tabular">{format(t.createdAt, "MMM d, HH:mm:ss")}</td>
                  <td className="px-3 py-2.5 text-text-2">
                    <span className="flex items-center gap-2 font-mono text-xs">
                      {t.id.slice(0, 14)} {t.simulated && <SimBadge />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
