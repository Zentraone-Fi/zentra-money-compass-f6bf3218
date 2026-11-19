import { Puzzle } from "lucide-react";
import { useState } from "react";

import { QUESTS, type LedgerEvidence, type QuestCategory, type QuestProgress } from "@/lib/zentra/quests";
import { cn } from "@/lib/utils";
import { QuestCard, type QuestCardProps } from "./QuestCard";

type Tab = "all" | QuestCategory;
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All Quests" },
  { id: "onchain", label: "Onchain" },
  { id: "social", label: "Social" },
  { id: "creative", label: "Creative" },
];

type Shared = Omit<QuestCardProps, "quest" | "entry" | "blurred" | "expanded" | "onToggle" | "onComplete" | "onSubmit">;

export function QuestBoard({
  progress,
  onComplete,
  onSubmit,
  ...shared
}: Shared & {
  progress: QuestProgress;
  onComplete: (id: string, tx?: LedgerEvidence) => Promise<void>;
  onSubmit: (id: string, url: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<string | null>("x-follow");
  const list = QUESTS.filter((q) => tab === "all" || q.category === tab);
  return (
    <section aria-labelledby="explore-title" className="min-w-0">
      <h2 id="explore-title" className="flex items-center gap-2 text-xl font-medium tracking-tight">
        <Puzzle className="size-5" strokeWidth={1.75} /> Explore Quests
      </h2>
      <p className="mt-1.5 text-[12px] text-text-2">
        Explore the ecosystem, from onchain quests to creative challenges, and earn XP that converts to $ZNT at the end of the
        season.
      </p>

      <div role="tablist" aria-label="Quest categories" className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {TABS.map((t) => {
          const count = t.id === "all" ? QUESTS.length : QUESTS.filter((q) => q.category === t.id).length;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex h-[30px] items-center justify-between rounded-md border px-2.5 text-[12px] font-medium transition-colors",
                active
                  ? "border-foreground/55 bg-foreground/[0.06] text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]"
                  : "border-panel-border/80 bg-field/40 text-text-2 hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "grid h-[18px] min-w-[18px] place-items-center rounded-[4px] px-1 text-[10px] tabular",
                  active ? "bg-lime text-primary-foreground" : "bg-foreground/10 text-text-2",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3.5 space-y-2" role="tabpanel">
        {list.map((q, i) => (
          <QuestCard
            key={q.id}
            {...shared}
            quest={q}
            entry={progress[q.id]}
            blurred={!shared.signedIn && i >= 2}
            expanded={open === q.id}
            onToggle={() => setOpen((o) => (o === q.id ? null : q.id))}
            onComplete={(tx) => onComplete(q.id, tx)}
            onSubmit={(url) => onSubmit(q.id, url)}
          />
        ))}
      </div>
    </section>
  );
}
