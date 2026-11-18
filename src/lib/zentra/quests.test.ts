import { describe, expect, it } from "vitest";

import {
  QUESTS,
  completeQuest,
  estimatedPrizeZnt,
  findVerifyingTx,
  questById,
  rankLeaderboard,
  referralXp,
  submitForReview,
  totalAllocatedShare,
  totalQuestXp,
} from "./quests";
import { LINKS } from "./env";
import type { TxRecord } from "./types";

const DAY = 24 * 3600 * 1000;
const T0 = Date.UTC(2026, 10, 16, 12);
const q = (id: string) => {
  const quest = questById(id);
  if (!quest) throw new Error(id);
  return quest;
};

describe("official quest links", () => {
  it("uses the requested Telegram join URL", () => {
    expect(q("tg-join").verification).toMatchObject({ url: "http://t.me/zentra_hq" });
  });

  it("uses the requested Support URL", () => {
    expect(LINKS.support).toBe("https://t.me/Phil_zentra");
  });

  it("adds the WhatsApp Channel as a 20 XP social quest", () => {
    expect(q("whatsapp-channel")).toMatchObject({
      category: "social",
      xp: 20,
      verification: { type: "visit", url: "https://whatsapp.com/channel/0029VbE8sBVJkK7AqNGbAh3a" },
    });
  });
});

describe("quest XP", () => {
  it("awards a one-time quest's XP only once", () => {
    let p = completeQuest({}, q("x-follow"), T0);
    p = completeQuest(p, q("x-follow"), T0 + 2 * DAY);
    expect(totalQuestXp(p)).toBe(20);
  });

  it("lets a daily quest be completed once per UTC day", () => {
    let p = completeQuest({}, q("daily-swap"), T0);
    p = completeQuest(p, q("daily-swap"), T0 + 1000);
    expect(totalQuestXp(p)).toBe(10);
    p = completeQuest(p, q("daily-swap"), T0 + DAY);
    expect(totalQuestXp(p)).toBe(20);
  });

  it("gives no XP for a creative submission until it is reviewed", () => {
    const p = submitForReview({}, q("creative-thread"), "https://x.com/me/status/1", T0);
    expect(totalQuestXp(p)).toBe(0);
  });

  it("gives referrers 10% of friends' quest XP, rounded down", () => {
    expect(referralXp([100, 55])).toBe(15);
    expect(referralXp([9])).toBe(0);
  });
});

describe("ledger quest verification", () => {
  const tx = (kind: TxRecord["kind"], status: TxRecord["status"], at: number): TxRecord => ({
    id: `${kind}-${at}`, kind, assetId: "CC", amount: "1", status, createdAt: at, updatedAt: at, simulated: true,
  });

  it("only counts confirmed transactions", () => {
    expect(findVerifyingTx(q("supply-first"), [tx("supply", "pending_confirmation", T0)], T0)).toBeUndefined();
    expect(findVerifyingTx(q("supply-first"), [tx("supply", "confirmed", T0)], T0)).toBeDefined();
  });

  it("only counts today's swap for the daily swap quest", () => {
    expect(findVerifyingTx(q("daily-swap"), [tx("swap", "confirmed", T0 - DAY)], T0)).toBeUndefined();
  });
});

describe("leaderboard and prizes", () => {
  it("ranks by XP, highest first", () => {
    const ranked = rankLeaderboard([
      { id: "a", name: "A", xp: 10 },
      { id: "b", name: "B", xp: 30 },
      { id: "c", name: "C", xp: 20 },
    ]);
    expect(ranked.map((r) => [r.id, r.rank])).toEqual([["b", 1], ["c", 2], ["a", 3]]);
  });

  it("allocates exactly 100% of the pool to the top 100", () => {
    expect(totalAllocatedShare().toString()).toBe("1");
  });

  it("gives rank 1 8% of the pool and nothing past rank 100", () => {
    expect(estimatedPrizeZnt(1, "1000000").toString()).toBe("80000");
    expect(estimatedPrizeZnt(100, "1000000").toString()).toBe("7400");
    expect(estimatedPrizeZnt(101, "1000000").toString()).toBe("0");
  });

  it("has unique quest ids", () => {
    expect(new Set(QUESTS.map((x) => x.id)).size).toBe(QUESTS.length);
  });
});
