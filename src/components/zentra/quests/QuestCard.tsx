import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Clock, ExternalLink, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { IS_SIMULATED } from "@/lib/zentra/env";
import type { LinkedAccounts } from "@/lib/zentra/quest-store";
import {
  QUEST_CATEGORY_LABEL,
  findVerifyingTx,
  isQuestAvailable,
  isQuestDone,
  type Quest,
  type QuestProgressEntry,
  type SocialPlatform,
} from "@/lib/zentra/quests";
import type { TxRecord } from "@/lib/zentra/types";
import { cn } from "@/lib/utils";
import { QuestIcon } from "./QuestIcon";

const PLATFORM: Record<SocialPlatform, string> = { x: "X", telegram: "Telegram" };

function untilUtcMidnight(now: number) {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  const mins = Math.max(0, Math.round((next - now) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function linkify(text: string) {
  return text.split(/(@zentra_hq)/g).map((part, i) =>
    part === "@zentra_hq" ? (
      <a key={i} href="https://x.com/zentra_hq" target="_blank" rel="noreferrer" className="text-lime underline underline-offset-2 hover:text-foreground">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

type Badge = "locked" | "open" | "review" | "done";

function StatusBadge({ badge }: { badge: Badge }) {
  const map = {
    locked: { icon: <Lock className="size-3 text-destructive" />, label: "Locked", cls: "border-foreground/20 text-foreground/90" },
    open: { icon: <span className="size-1.5 rounded-full bg-lime" />, label: "Open", cls: "border-lime/40 text-lime" },
    review: { icon: <Clock className="size-3" />, label: "In review", cls: "border-gold/50 text-gold" },
    done: { icon: <Check className="size-3" />, label: "Completed", cls: "border-lime/60 bg-lime/10 text-lime" },
  }[badge];
  return (
    <span className={cn("inline-flex h-[22px] shrink-0 items-center gap-1 rounded-[4px] border bg-field/70 px-1.5 text-[11px] font-medium", map.cls)}>
      {map.icon}
      {map.label}
    </span>
  );
}

export interface QuestCardProps {
  quest: Quest;
  entry: QuestProgressEntry | undefined;
  hasWallet: boolean;
  blurred: boolean;
  expanded: boolean;
  onToggle: () => void;
  linked: LinkedAccounts;
  txs: TxRecord[];
  onConnectWallet: () => void;
  onLink: (p: SocialPlatform) => void;
  onComplete: () => void;
  onSubmit: (url: string) => void;
}

export function QuestCard(props: QuestCardProps) {
  const { quest, entry, hasWallet, blurred, expanded, onToggle, linked } = props;
  const now = Date.now();
  const done = isQuestDone(quest, entry, now);
  const v = quest.verification;
  const needsLink = v.type === "social" && !linked[v.platform];
  const badge: Badge =
    entry?.status === "pending_review" ? "review" : done ? "done" : !hasWallet || needsLink ? "locked" : "open";
  const bodyId = `quest-${quest.id}`;

  return (
    <article
      className={cn(
        "quest-panel overflow-hidden transition-[border-color,background] duration-200",
        expanded ? "border-foreground/20" : "hover:border-lime/30",
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={blurred ? props.onConnectWallet : onToggle}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left sm:px-3.5"
      >
        <QuestIcon kind={quest.icon} className={cn(blurred && "blur-[3px]")} />
        <span className={cn("min-w-0", blurred && "select-none blur-[4px]")} aria-hidden={blurred}>
          <span className="block truncate text-[15px] font-medium leading-tight">{quest.title}</span>
          <span className="mt-0.5 block text-[9.5px] font-bold uppercase tracking-[0.08em]">
            <span className="text-text-2">{QUEST_CATEGORY_LABEL[quest.category]}</span>
            <span className="text-text-2"> · </span>
            <span className="text-gold">{quest.frequency}</span>
          </span>
        </span>
        {blurred && <span className="sr-only">Connect a wallet to see this quest</span>}
        <span className="flex shrink-0 items-center gap-3 sm:gap-5">
          <span className="hidden sm:inline-flex">
            <StatusBadge badge={badge} />
          </span>
          <span className="flex items-start gap-1 tabular">
            <span className={cn("text-[22px] font-normal leading-none sm:text-2xl", done && "text-lime")}>+{quest.xp}</span>
            <span className="text-[10px] font-semibold text-text-2">XP</span>
          </span>
          <ChevronDown
            className={cn("size-4 text-text-2 transition-transform duration-200", expanded && "rotate-180", blurred && "opacity-40")}
            aria-hidden
          />
        </span>
      </button>

      <div
        id={bodyId}
        className={cn("grid transition-[grid-template-rows] duration-300 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="min-h-0 overflow-hidden" inert={!expanded}>
          <div className="px-3 pb-3 sm:px-3.5">
            <div className="mb-2 sm:hidden">
              <StatusBadge badge={badge} />
            </div>
            <p className="text-[12.5px] leading-relaxed text-foreground/85">{linkify(quest.description)}</p>
            <p className="mt-3 text-[12.5px] text-foreground/85">{requirementText(quest)}</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-[340px] text-[10px] italic leading-snug text-gold/90">
                Undoing actions before the season ends or using AI-only content may cost XP. Repeated abuse may lead to a ban.
              </p>
              <QuestActions {...props} done={done} needsLink={needsLink} now={now} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function requirementText(q: Quest) {
  const v = q.verification;
  if (v.type === "social") return `In order to complete the Quest the ${PLATFORM[v.platform]} account needs to be verified.`;
  if (v.type === "visit") return "Open the link, then claim your XP. This quest can't be checked against an account.";
  if (v.type === "ledger") return "Verified automatically from your confirmed transactions on the Canton ledger.";
  return "Submissions are reviewed by the ZENTRA team. XP is awarded once approved.";
}

const actionBtn = "h-8 min-w-[150px] gap-2 rounded-[5px] px-5 text-xs";

function QuestActions({
  quest,
  entry,
  hasWallet,
  linked,
  txs,
  done,
  needsLink,
  now,
  onConnectWallet,
  onLink,
  onComplete,
  onSubmit,
}: QuestCardProps & { done: boolean; needsLink: boolean; now: number }) {
  const [visited, setVisited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const v = quest.verification;

  if (entry?.status === "pending_review") {
    return <span className="text-xs text-gold">Submitted — waiting for review</span>;
  }
  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-lime">
        <Check className="size-3.5" />
        {quest.frequency === "daily" ? `Done today · resets in ${untilUtcMidnight(now)}` : `+${quest.xp} XP claimed`}
      </span>
    );
  }
  if (!hasWallet) {
    return (
      <Button variant="action" className={actionBtn} onClick={onConnectWallet}>
        <Lock /> Connect wallet
      </Button>
    );
  }
  if (!IS_SIMULATED) {
    return (
      <Button variant="action" className={actionBtn} disabled>
        <Lock /> Verification opens at launch
      </Button>
    );
  }
  if (v.type === "social" && needsLink) {
    return (
      <Button variant="action" className={actionBtn} onClick={() => onLink(v.platform)}>
        <Lock /> Connect {PLATFORM[v.platform]}
      </Button>
    );
  }

  const verify = (check: () => boolean, failMsg: string) => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (check()) {
        onComplete();
        toast.success(`+${quest.xp} XP earned`, { description: `${quest.title} · simulated verification` });
      } else toast.error("Not verified yet", { description: failMsg });
    }, 1100);
  };

  if (v.type === "social" || v.type === "visit") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-8 gap-1.5 rounded-[5px] border-foreground/25 bg-transparent px-3 text-xs">
          <a href={v.url} target="_blank" rel="noreferrer" onClick={() => setVisited(true)}>
            {v.action} <ExternalLink className="!size-3" />
          </a>
        </Button>
        <Button
          variant="action"
          className={actionBtn}
          disabled={!visited || busy}
          title={visited ? undefined : "Open the link first"}
          onClick={() => verify(() => true, "")}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          {v.type === "visit" ? "Claim XP" : `Verify${linked[v.platform] ? ` @${linked[v.platform]}` : ""}`}
        </Button>
      </div>
    );
  }

  if (v.type === "ledger") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-8 rounded-[5px] border-foreground/25 bg-transparent px-3 text-xs">
          <Link to={v.to}>{v.action}</Link>
        </Button>
        <Button
          variant="action"
          className={actionBtn}
          disabled={busy}
          onClick={() =>
            verify(
              () => !!findVerifyingTx(quest, txs, Date.now()),
              `No confirmed ${v.txKind} found${quest.frequency === "daily" ? " today" : ""}. Complete one, then verify again.`,
            )
          }
        >
          {busy ? <Loader2 className="animate-spin" /> : <Check />} Verify
        </Button>
      </div>
    );
  }

  const validUrl = /^https:\/\/[^\s]+\.[^\s]+$/.test(url.trim());
  return (
    <form
      className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (validUrl) onSubmit(url.trim());
      }}
    >
      <label className="sr-only" htmlFor={`sub-${quest.id}`}>
        {v.prompt}
      </label>
      <input
        id={`sub-${quest.id}`}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={`${v.prompt} (https://…)`}
        className="quest-field h-8 min-w-0 px-2.5 text-xs placeholder:text-muted-foreground focus:border-lime/60 focus:outline-none sm:w-56"
      />
      <Button type="submit" variant="action" className={actionBtn} disabled={!validUrl || isQuestAvailable(quest, entry, now) === false}>
        Submit for review
      </Button>
    </form>
  );
}
