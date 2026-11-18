/**
 * ZENTRA Quests — XP rules, leaderboard ranking and season prize allocation.
 * XP is an off-ledger engagement score that converts to ZNT at season end; the pool
 * size and allocation below are drafts until the season is announced.
 */
import { D, Decimal } from "./decimal";
import type { TxKind, TxRecord } from "./types";

export type QuestCategory = "onchain" | "social" | "creative";
export type QuestFrequency = "one-time" | "daily";
export type SocialPlatform = "x" | "telegram";
export type LinkedAccounts = Record<SocialPlatform, string | null>;
export type QuestIconKind = "x" | "telegram" | "whatsapp" | "linkedin" | "github" | "docs" | "supply" | "borrow" | "repay" | "swap" | "pen" | "image" | "book";

export type QuestVerification =
  /** Needs the linked platform account; verified by the quest service against that account. */
  | { type: "social"; platform: SocialPlatform; url: string; action: string }
  /** Can't be checked against an account: completes once the link has been opened. */
  | { type: "visit"; url: string; action: string }
  /** Completed by a confirmed ledger transaction of this kind. */
  | { type: "ledger"; txKind: TxKind; to: "/" | "/swap"; action: string }
  /** A link to the user's own content, reviewed before XP is awarded. */
  | { type: "submission"; prompt: string };

export interface Quest {
  id: string;
  title: string;
  category: QuestCategory;
  frequency: QuestFrequency;
  xp: number;
  icon: QuestIconKind;
  description: string;
  verification: QuestVerification;
}

export interface QuestProgressEntry {
  status: "completed" | "pending_review";
  /** Number of times completed (daily quests can repeat once per UTC day). */
  completions: number;
  lastCompletedAt: number;
  submission?: string;
}

export type QuestProgress = Record<string, QuestProgressEntry>;

export const REFERRAL_SHARE = "0.10";

export const QUEST_CATEGORY_LABEL: Record<QuestCategory, string> = {
  onchain: "Onchain",
  social: "Social",
  creative: "Creative",
};

const X = "https://x.com/zentra_hq";

export const QUESTS: Quest[] = [
  {
    id: "tg-join",
    title: "Join the Official ZENTRA Telegram Group",
    category: "social",
    frequency: "one-time",
    xp: 20,
    icon: "telegram",
    description: "Join @zentra_hq on Telegram using your connected Telegram account. Verify your membership to claim your XP.",
    verification: { type: "social", platform: "telegram", url: "http://t.me/zentra_hq", action: "Join group" },
  },
  {
    id: "whatsapp-channel",
    title: "Join the ZENTRA WhatsApp Channel",
    category: "social",
    frequency: "one-time",
    xp: 20,
    icon: "whatsapp",
    description: "Join the official ZENTRA WhatsApp Channel for protocol announcements and community updates.",
    verification: {
      type: "visit",
      url: "https://whatsapp.com/channel/0029VbE8sBVJkK7AqNGbAh3a",
      action: "Join channel",
    },
  },
  {
    id: "x-follow",
    title: "Follow ZENTRA on X",
    category: "social",
    frequency: "one-time",
    xp: 20,
    icon: "x",
    description: "Follow @zentra_hq using your connected X account. Verify your follow to claim your XP.",
    verification: { type: "social", platform: "x", url: X, action: "Follow @zentra_hq" },
  },
  {
    id: "daily-swap",
    title: "Daily Swap",
    category: "onchain",
    frequency: "daily",
    xp: 10,
    icon: "swap",
    description: "Complete any swap on ZENTRA today. The quest verifies once the swap is confirmed on the ledger and resets every day at 00:00 UTC.",
    verification: { type: "ledger", txKind: "swap", to: "/swap", action: "Go to Swap" },
  },
  {
    id: "x-like-repost",
    title: "Like & Repost on X",
    category: "social",
    frequency: "one-time",
    xp: 20,
    icon: "x",
    description: "Like and repost the pinned @zentra_hq post from your connected X account.",
    verification: { type: "social", platform: "x", url: X, action: "Open pinned post" },
  },
  {
    id: "x-like-reply-genesis",
    title: "Like, Reply & Repost | GENESIS PHASE",
    category: "social",
    frequency: "one-time",
    xp: 20,
    icon: "x",
    description: "Like, reply to and repost the Genesis Phase announcement from @zentra_hq.",
    verification: { type: "social", platform: "x", url: X, action: "Open announcement" },
  },
  {
    id: "supply-first",
    title: "Supply Your First Asset",
    category: "onchain",
    frequency: "one-time",
    xp: 50,
    icon: "supply",
    description: "Supply any listed asset to a ZENTRA lending market. Verified once the supply is confirmed on the ledger.",
    verification: { type: "ledger", txKind: "supply", to: "/", action: "Go to Dashboard" },
  },
  {
    id: "borrow-first",
    title: "Open Your First Borrow Position",
    category: "onchain",
    frequency: "one-time",
    xp: 75,
    icon: "borrow",
    description: "Borrow against your collateral while keeping a healthy health factor. Verified on ledger confirmation.",
    verification: { type: "ledger", txKind: "borrow", to: "/", action: "Go to Dashboard" },
  },
  {
    id: "repay-first",
    title: "Repay a Loan",
    category: "onchain",
    frequency: "one-time",
    xp: 75,
    icon: "repay",
    description: "Repay part or all of a borrow position. Verified on ledger confirmation.",
    verification: { type: "ledger", txKind: "repay", to: "/", action: "Go to Dashboard" },
  },
  {
    id: "linkedin-follow",
    title: "Follow ZENTRA One on LinkedIn",
    category: "social",
    frequency: "one-time",
    xp: 20,
    icon: "linkedin",
    description: "Follow the ZENTRA One company page on LinkedIn for protocol and team updates.",
    verification: { type: "visit", url: "https://www.linkedin.com/company/zentra-one/", action: "Open LinkedIn" },
  },
  {
    id: "github-follow",
    title: "Follow Zentraone-Fi on GitHub",
    category: "social",
    frequency: "one-time",
    xp: 20,
    icon: "github",
    description: "Follow the Zentraone-Fi organisation on GitHub to track Daml contracts and releases.",
    verification: { type: "visit", url: "https://github.com/Zentraone-Fi", action: "Open GitHub" },
  },
  {
    id: "docs-read",
    title: "Read the ZENTRA Docs",
    category: "social",
    frequency: "one-time",
    xp: 20,
    icon: "docs",
    description: "Read how ZENTRA lending, risk parameters and liquidations work on Canton Network.",
    verification: { type: "visit", url: "https://zentra-fi.gitbook.io/zentra-finance", action: "Open GitBook" },
  },
  {
    id: "creative-thread",
    title: "Write an X Thread About ZENTRA",
    category: "creative",
    frequency: "one-time",
    xp: 150,
    icon: "pen",
    description: "Explain how lending on Canton Network works with ZENTRA in a thread of at least 5 posts. Tag @zentra_hq.",
    verification: { type: "submission", prompt: "Link to your thread" },
  },
  {
    id: "creative-meme",
    title: "Create a ZENTRA Meme",
    category: "creative",
    frequency: "one-time",
    xp: 100,
    icon: "image",
    description: "Make an original meme about ZENTRA or $ZNT and post it publicly. AI-only content is not accepted.",
    verification: { type: "submission", prompt: "Link to your post" },
  },
  {
    id: "creative-guide",
    title: "Publish a Beginner's Guide",
    category: "creative",
    frequency: "one-time",
    xp: 200,
    icon: "book",
    description: "Write a step-by-step guide to supplying and borrowing on ZENTRA, published on any blog or Medium.",
    verification: { type: "submission", prompt: "Link to your guide" },
  },
];

export const questById = (id: string) => QUESTS.find((q) => q.id === id);

export const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Whether the quest can be completed (again) right now. */
export function isQuestAvailable(quest: Quest, entry: QuestProgressEntry | undefined, now: number) {
  if (!entry) return true;
  if (quest.frequency === "daily") return entry.status === "completed" && utcDay(entry.lastCompletedAt) !== utcDay(now);
  return false;
}

/** A quest counts as done for today / for good. */
export function isQuestDone(quest: Quest, entry: QuestProgressEntry | undefined, now: number) {
  return !!entry && entry.status === "completed" && !isQuestAvailable(quest, entry, now);
}

/** Records a completion; returns the same object when the quest can't be completed now. */
export function completeQuest(progress: QuestProgress, quest: Quest, now: number, submission?: string): QuestProgress {
  const entry = progress[quest.id];
  if (!isQuestAvailable(quest, entry, now)) return progress;
  return {
    ...progress,
    [quest.id]: {
      status: "completed",
      completions: (entry?.completions ?? 0) + 1,
      lastCompletedAt: now,
      ...(submission ? { submission } : {}),
    },
  };
}

/** Creative quests wait for review; no XP until approved. */
export function submitForReview(progress: QuestProgress, quest: Quest, submission: string, now: number): QuestProgress {
  if (progress[quest.id]) return progress;
  return { ...progress, [quest.id]: { status: "pending_review", completions: 0, lastCompletedAt: now, submission } };
}

/** Total quest XP: only completed entries count; daily quests count every completion. */
export function totalQuestXp(progress: QuestProgress, quests: Quest[] = QUESTS) {
  return quests.reduce((sum, q) => {
    const e = progress[q.id];
    return e?.status === "completed" ? sum + q.xp * e.completions : sum;
  }, 0);
}

/* ---------- Account-backed quest service rules ---------- */

/** Claim slot a completion fills: "once" for one-time quests, the UTC day for daily quests. One claim per slot. */
export function claimPeriod(quest: Quest, now: number) {
  return quest.frequency === "daily" ? utcDay(now) : "once";
}

export type ClaimCheck = { ok: true; period: string; xp: number } | { ok: false; reason: string };

/**
 * Server-side gate for an XP claim. Social and ledger checks are simulated in development only;
 * outside development nothing can be claimed until real verification is wired in.
 */
export function checkClaim(
  quest: Quest | undefined,
  ctx: { simulated: boolean; linked: LinkedAccounts; ledgerTx?: LedgerEvidence | undefined; now: number },
): ClaimCheck {
  if (!quest) return { ok: false, reason: "Unknown quest" };
  const v = quest.verification;
  if (v.type === "submission") return { ok: false, reason: "Creative quests are reviewed before XP is awarded" };
  if (!ctx.simulated) return { ok: false, reason: "Verification opens at launch" };
  if (v.type === "social" && !ctx.linked[v.platform]) {
    return { ok: false, reason: `Link your ${v.platform === "x" ? "X" : "Telegram"} account first` };
  }
  if (v.type === "ledger" && !(ctx.ledgerTx && findVerifyingTx(quest, [ctx.ledgerTx], ctx.now))) {
    return { ok: false, reason: `No confirmed ${v.txKind} found${quest.frequency === "daily" ? " today" : ""}` };
  }
  return { ok: true, period: claimPeriod(quest, ctx.now), xp: quest.xp };
}

export interface ClaimRecord {
  quest_id: string;
  claimed_at: string;
}

export interface SubmissionRecord {
  quest_id: string;
  url: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
}

/** Rebuilds the board's progress from stored claims and pending submissions. */
export function progressFromRecords(claims: ClaimRecord[], submissions: SubmissionRecord[]): QuestProgress {
  const progress: QuestProgress = {};
  for (const c of claims) {
    const at = Date.parse(c.claimed_at);
    const prev = progress[c.quest_id];
    progress[c.quest_id] = {
      status: "completed",
      completions: (prev?.completions ?? 0) + 1,
      lastCompletedAt: Math.max(prev?.lastCompletedAt ?? 0, at),
    };
  }
  for (const s of submissions) {
    if (s.status === "pending" && !progress[s.quest_id]) {
      progress[s.quest_id] = { status: "pending_review", completions: 0, lastCompletedAt: Date.parse(s.submitted_at), submission: s.url };
    }
  }
  return progress;
}

/** Referral XP is 10% of referred friends' quest XP, rounded down to whole XP. */
export function referralXp(friendsQuestXp: number[]) {
  const total = friendsQuestXp.reduce((a, b) => a + Math.max(0, Math.floor(b)), 0);
  return D(total).mul(REFERRAL_SHARE).floor().toNumber();
}

/** Number of quests completed at least once (for the progress bar). */
export function completedQuestCount(progress: QuestProgress, quests: Quest[] = QUESTS) {
  return quests.filter((q) => progress[q.id]?.status === "completed").length;
}

/** The ledger quest's verifying tx: confirmed, of the right kind, and (for daily) from today. */
export type LedgerEvidence = Pick<TxRecord, "id" | "kind" | "status" | "updatedAt">;

export function findVerifyingTx<T extends LedgerEvidence>(quest: Quest, txs: T[], now: number): T | undefined {
  if (quest.verification.type !== "ledger") return undefined;
  const kind = quest.verification.txKind;
  return txs.find(
    (t) => t.kind === kind && t.status === "confirmed" && (quest.frequency !== "daily" || utcDay(t.updatedAt) === utcDay(now)),
  );
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  xp: number;
  isYou?: boolean;
}

export interface RankedEntry extends LeaderboardEntry {
  rank: number;
}

/** Highest XP first; ties share the earlier position order by id so ranks are stable. */
export function rankLeaderboard(entries: LeaderboardEntry[]): RankedEntry[] {
  return [...entries]
    .sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id))
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export interface PrizeTier {
  from: number;
  to: number;
  /** Share of the season pool for each rank in the tier. */
  sharePerRank: string;
}

/** Draft allocation of the season ZNT pool across the top 100 explorers (sums to 100%). */
export const PRIZE_TIERS: PrizeTier[] = [
  { from: 1, to: 1, sharePerRank: "0.08" },
  { from: 2, to: 2, sharePerRank: "0.055" },
  { from: 3, to: 3, sharePerRank: "0.04" },
  { from: 4, to: 10, sharePerRank: "0.015" },
  { from: 11, to: 25, sharePerRank: "0.01" },
  { from: 26, to: 50, sharePerRank: "0.008" },
  { from: 51, to: 100, sharePerRank: "0.0074" },
];

/** Draft season pool used for estimates until the real pool is announced. */
export const SEASON_POOL_ZNT = "1000000";

export function prizeShare(rank: number): Decimal {
  const tier = PRIZE_TIERS.find((t) => rank >= t.from && rank <= t.to);
  return tier ? D(tier.sharePerRank) : D(0);
}

export function estimatedPrizeZnt(rank: number, pool: string = SEASON_POOL_ZNT): Decimal {
  return D(pool).mul(prizeShare(rank));
}

export function totalAllocatedShare(tiers: PrizeTier[] = PRIZE_TIERS): Decimal {
  return tiers.reduce((s, t) => s.add(D(t.sharePerRank).mul(t.to - t.from + 1)), D(0));
}

/* ---------- Simulated leaderboard (development only) ---------- */

const HANDLES = [
  "zkFati", "Jxx3", "Toe L", "TrillaInManilaa", "WEST", "Thomas Gee", "0x Duppy", "Black Success", "cantonwhale",
  "dama.eth", "Lagos Degen", "NodeRunner", "Kemi", "ser_yield", "Ifeoluwa", "ZNT Maxi", "LiquidLuke", "Ama B",
  "partyOfOne", "Daml Dev", "CollateralKing", "HealthFactor2", "Tobi.xyz", "nightowl", "Rekt No More", "Chidi",
  "SuppliedSam", "MarketMaker", "Zara", "OliveBranch", "LimeLight", "Femi", "yieldfarmer", "SettledTx", "Bola",
];

/** Deterministic simulated explorers so the board looks the same across reloads. */
export function simulatedLeaderboard(count = 149, seed = 7): LeaderboardEntry[] {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let xp = 3652;
  return Array.from({ length: count }, (_, i) => {
    const base = HANDLES[i % HANDLES.length] ?? "explorer";
    const name = i < HANDLES.length ? base : `${base}${Math.floor(rand() * 90 + 10)}`;
    const entry = { id: `sim-${i.toString().padStart(3, "0")}`, name, xp };
    xp = Math.max(20, xp - Math.floor(rand() * (i < 10 ? 260 : 40)) - 1);
    return entry;
  });
}
