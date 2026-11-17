import { Copy, ExternalLink, Gift, UserPlus, Waves } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LINKS } from "@/lib/zentra/env";
import { cn } from "@/lib/utils";

function Stat({ value, label, unit }: { value: ReactNode | null; label: string; unit?: string }) {
  return (
    <div className="min-w-0">
      <div className="flex h-6 items-center gap-1.5">
        {value === null ? (
          <span className="block h-0.5 w-6 rounded-full bg-foreground/80" aria-label="none" />
        ) : (
          <span className="tabular text-lg font-medium leading-none">{value}</span>
        )}
        {unit && <span className="text-[11px] font-semibold text-gold">{unit}</span>}
      </div>
      <div className="mt-1 truncate text-[10.5px] text-text-2">{label}</div>
    </div>
  );
}

export function ProgressPanel({
  xp,
  rank,
  completed,
  total,
  referralXp,
  friends,
  inviteCode,
}: {
  xp: number;
  rank: number | null;
  completed: number;
  total: number;
  referralXp: number;
  friends: number;
  inviteCode: string | null;
}) {
  const copy = async () => {
    if (!inviteCode) {
      toast.error("Connect a wallet to get your referral link");
      return;
    }
    const url = `${window.location.origin}/quests?ref=${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Referral link copied", { description: url });
    } catch {
      toast.error("Couldn't copy", { description: url });
    }
  };

  return (
    <section className="quest-panel" aria-labelledby="progress-title">
      <header className="flex items-center justify-between gap-3 border-b border-panel-border/70 px-3.5 py-2.5">
        <h2 id="progress-title" className="flex items-center gap-2 text-[15px] font-medium">
          <Waves className="size-4 text-foreground" strokeWidth={1.75} /> Your Progress
        </h2>
        <div className="flex gap-1.5">
          <Button asChild variant="outline" className="h-6 gap-1.5 rounded-[5px] border-foreground/25 bg-transparent px-2.5 text-[11px]">
            <a href={LINKS.docs} target="_blank" rel="noreferrer">
              Docs <ExternalLink className="!size-3" />
            </a>
          </Button>
          <Button asChild variant="outline" className="h-6 gap-1.5 rounded-[5px] border-lime/70 bg-lime/5 px-2.5 text-[11px] hover:bg-lime/10">
            <a href={LINKS.telegram} target="_blank" rel="noreferrer">
              Support <ExternalLink className="!size-3" />
            </a>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 px-3.5 py-3 md:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] md:items-center md:gap-0">
        <div className="grid grid-cols-2 gap-6 md:pr-8">
          <Stat value={xp > 0 ? xp.toLocaleString("en-US") : null} unit="XP" label="Total XP" />
          <Stat value={rank ? `#${rank}` : null} label="Your Rank" />
        </div>
        <div className="hidden h-9 w-px bg-panel-border md:block" aria-hidden />

        <div className="min-w-0 md:px-5">
          <div className="flex h-6 items-end gap-[3px]" role="img" aria-label={`${completed} of ${total} quests completed`}>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-full w-[5px] shrink-0 rounded-[1.5px] transition-colors duration-500",
                  i < completed ? "bg-lime shadow-[0_0_8px_-1px_var(--lime)]" : "bg-foreground/15",
                )}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10.5px]">
            <span className="font-semibold text-foreground">Quest Progress</span>
            <span className="tabular text-text-2">
              {completed} / {total} completed
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 md:border-l md:border-panel-border md:px-5">
          <div className="min-w-0">
            <div className="flex h-6 items-center gap-1.5">
              {referralXp > 0 ? (
                <span className="tabular text-lg font-medium leading-none">{referralXp}</span>
              ) : (
                <span className="block h-0.5 w-6 rounded-full bg-gold/80" aria-label="none" />
              )}
              <span className="text-[11px] font-semibold text-gold">XP</span>
              <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-[4px] border border-foreground/25 px-1 text-[10px] tabular" title="Friends referred">
                {friends}
              </span>
              <UserPlus className="size-3.5 text-text-2" aria-label="Friends referred" />
            </div>
            <div className="mt-1 text-[10.5px] text-text-2">Referral XP</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md border border-gold/40 bg-gradient-to-r from-gold/10 via-gold/[0.06] to-transparent px-3 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-gold/10 text-gold">
              <Gift className="size-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 leading-tight">
              <div className="text-[11px]">
                Earn <span className="text-lg font-light text-gold">10%</span>
              </div>
              <div className="whitespace-nowrap text-[10.5px] font-semibold">of your friends' quest XP</div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center justify-between gap-3 text-[10.5px]">
              <span className="text-text-2">Invite Code</span>
              <span className="tabular font-semibold">{inviteCode ?? "—"}</span>
            </div>
            <button
              type="button"
              onClick={copy}
              className="mt-1 inline-flex h-5 items-center gap-1.5 rounded-[4px] border border-gold/60 px-1.5 text-[10px] text-gold transition-colors hover:bg-gold/10"
            >
              Copy Referral Link <Copy className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
