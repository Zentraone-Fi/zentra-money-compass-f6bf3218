import { Crown, Trophy } from "lucide-react";
import { useState } from "react";

import { fmt } from "@/lib/zentra/decimal";
import { PRIZE_TIERS, SEASON_POOL_ZNT, estimatedPrizeZnt, type RankedEntry } from "@/lib/zentra/quests";
import { cn } from "@/lib/utils";
import { SimBadge } from "../Panel";

const PAGE = 100;

const AVATAR_TONES = ["bg-lime", "bg-gold", "bg-lime-deep", "bg-success", "bg-chart-4", "bg-text-2"];

function Avatar({ name, you }: { name: string; you?: boolean | undefined }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return (
    <span
      className={cn(
        "grid size-[22px] shrink-0 place-items-center rounded-full bg-gradient-to-br text-[9px] font-bold uppercase text-action-foreground",
        AVATAR_TONES[h % AVATAR_TONES.length],
        you && "ring-1 ring-lime ring-offset-1 ring-offset-panel",
      )}
      aria-hidden
    >
      {name.replace(/[^A-Za-z0-9]/g, "").slice(0, 1) || "?"}
    </span>
  );
}

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3)
    return (
      <span className="grid size-[17px] place-items-center rounded-[3px] border border-gold/80 bg-gold/10 text-[10px] font-semibold tabular text-gold">
        {rank}
      </span>
    );
  return <span className="w-[17px] text-center text-[11px] tabular text-foreground/90">{rank}</span>;
}

function Row({ e }: { e: RankedEntry }) {
  return (
    <li
      className={cn(
        "grid h-[38px] grid-cols-[24px_minmax(0,1fr)_52px_78px] items-center gap-2 border-b border-panel-border/50 px-3 text-[11px]",
        e.isYou && "bg-lime/[0.08]",
      )}
    >
      <RankCell rank={e.rank} />
      <span className="flex min-w-0 items-center gap-2">
        <Avatar name={e.name} you={e.isYou} />
        <span className={cn("truncate font-medium", e.isYou && "text-lime")}>{e.name}</span>
      </span>
      <span className="text-right tabular text-text-2">{e.xp.toLocaleString("en-US")}</span>
      <span className="text-right font-semibold tabular">{e.rank <= 100 ? fmt(estimatedPrizeZnt(e.rank), 0) : "—"}</span>
    </li>
  );
}

export function Leaderboard({
  entries,
  live,
  simulated,
  loading,
}: {
  entries: RankedEntry[];
  live: boolean;
  /** XP on the board was verified by development stand-ins, not real checks. */
  simulated: boolean;
  loading?: boolean;
}) {
  const [tab, setTab] = useState<"board" | "prizes">("board");
  const [shown, setShown] = useState(PAGE);
  const you = entries.find((e) => e.isYou);

  return (
    <aside className="min-w-0 space-y-2 lg:sticky lg:top-24" aria-label="Season leaderboard">
      <div className="quest-panel grid grid-cols-2 gap-1 p-1" role="tablist">
        {(
          [
            ["board", "Leaderboard", <Crown key="c" className="size-3.5 text-gold" />],
            ["prizes", "Prize Allocation", <Trophy key="t" className="size-3.5 text-gold" />],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex h-[30px] items-center justify-center gap-1.5 rounded-md border text-[12px] font-semibold transition-colors",
              tab === id ? "border-foreground/40 bg-foreground/[0.06]" : "border-transparent text-text-2 hover:text-foreground",
            )}
          >
            {tab === id && icon}
            {label}
          </button>
        ))}
      </div>

      {tab === "board" ? (
        <div className="quest-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-panel-border/60 px-3 py-1.5 text-[10px] text-text-2">
            <span className="inline-flex items-center gap-1.5">
              {live && (
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime/70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-lime" />
                </span>
              )}
              {live ? "Live" : "Season not started"}
            </span>
            {simulated && <SimBadge />}
          </div>
          <div className="grid grid-cols-[24px_minmax(0,1fr)_52px_78px] gap-2 border-b border-panel-border/60 px-3 py-2 text-[10.5px] text-text-2">
            <span className="text-center">#</span>
            <span>Explorer</span>
            <span className="text-right">XP</span>
            <span className="text-right">Est. ZNT</span>
          </div>
          {entries.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-text-2">
              {loading ? "Loading leaderboard…" : live ? "No XP earned yet. Complete a quest to be the first explorer on the board." : "The leaderboard opens when Season 1 starts."}
            </p>
          ) : (
            <ol className="scrollbar-lime max-h-[306px] overflow-y-auto" aria-label="Leaderboard">
              {entries.slice(0, shown).map((e) => (
                <Row key={e.id} e={e} />
              ))}
            </ol>
          )}
          {you && you.rank > shown && (
            <ol className="border-t border-lime/30" aria-label="Your position">
              <Row e={you} />
            </ol>
          )}
          <div className="flex items-center justify-between px-3 py-2.5 text-[10.5px]">
            <span className="tabular text-text-2">
              {Math.min(shown, entries.length)} of {entries.length}
              {entries.length > shown ? "+" : ""}
            </span>
            {entries.length > PAGE && (
              <button
                type="button"
                onClick={() => setShown((s) => (s >= entries.length ? PAGE : entries.length))}
                className="font-semibold text-foreground hover:text-lime"
              >
                {shown >= entries.length ? "Show less" : "Show more..."}
              </button>
            )}
            <span className="w-10" aria-hidden />
          </div>
        </div>
      ) : (
        <div className="quest-panel p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10.5px] text-text-2">Season 1 pool (draft)</div>
              <div className="mt-0.5 text-lg font-medium tabular">
                {fmt(SEASON_POOL_ZNT, 0)} <span className="text-xs font-semibold text-gold">ZNT</span>
              </div>
            </div>
            <SimBadge />
          </div>
          <ul className="mt-3 divide-y divide-panel-border/50 rounded-md border border-panel-border/60">
            {PRIZE_TIERS.map((t) => {
              const each = estimatedPrizeZnt(t.from);
              const n = t.to - t.from + 1;
              return (
                <li key={t.from} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-2 text-[11px]">
                  <span className="flex items-center gap-2">
                    {t.from <= 3 ? <RankCell rank={t.from} /> : <Trophy className="size-3.5 text-text-2" />}
                    <span className="font-medium">{n === 1 ? `Rank ${t.from}` : `Ranks ${t.from}–${t.to}`}</span>
                    <span className="text-text-2">{fmt(Number(t.sharePerRank) * 100, 2, { trim: true })}%{n > 1 ? " each" : ""}</span>
                  </span>
                  <span className="text-right font-semibold tabular">
                    {fmt(each, 0)} <span className="text-[9.5px] text-text-2">ZNT{n > 1 ? " ea." : ""}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[10.5px] leading-relaxed text-text-2">
            XP converts to $ZNT when the season ends. The pool size, split and conversion are drafts and will be confirmed
            before claims open. Ranks below 100 keep their XP for future seasons.
          </p>
        </div>
      )}
    </aside>
  );
}
