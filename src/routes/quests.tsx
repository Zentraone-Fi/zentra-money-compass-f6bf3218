import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Leaderboard } from "@/components/zentra/quests/Leaderboard";
import { LinkAccountDialog } from "@/components/zentra/quests/LinkAccountDialog";
import { LoginPanel } from "@/components/zentra/quests/LoginPanel";
import { ProgressPanel } from "@/components/zentra/quests/ProgressPanel";
import { QuestBoard } from "@/components/zentra/quests/QuestBoard";
import { IS_SIMULATED } from "@/lib/zentra/env";
import { inviteCodeFor, useQuestState } from "@/lib/zentra/quest-store";
import {
  QUESTS,
  completeQuest,
  completedQuestCount,
  questById,
  rankLeaderboard,
  referralXp,
  simulatedLeaderboard,
  submitForReview,
  totalQuestXp,
  type SocialPlatform,
} from "@/lib/zentra/quests";
import { useZentra } from "@/lib/zentra/store";

export const Route = createFileRoute("/quests")({
  head: () => ({
    meta: [
      { title: "Quests — Earn XP for ZNT | ZENTRA Finance" },
      {
        name: "description",
        content: "Complete onchain, social and creative ZENTRA quests to earn XP that converts to $ZNT rewards at season end.",
      },
      { property: "og:title", content: "ZENTRA Quests — Earn XP for ZNT" },
      { property: "og:description", content: "Onchain, social and creative quests on ZENTRA. Earn XP, climb the leaderboard, convert to $ZNT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Quests,
});

function Quests() {
  const { session, state, setConnectOpen } = useZentra();
  const partyId = session?.partyId ?? null;
  const { progress, updateProgress, linked, setLinked } = useQuestState(partyId);
  const [linkPlatform, setLinkPlatform] = useState<SocialPlatform | null>(null);
  const [board, setBoard] = useState(() => (IS_SIMULATED ? simulatedLeaderboard() : []));

  // Simulated "live" activity: a few explorers gain XP every few seconds.
  useEffect(() => {
    if (!IS_SIMULATED) return;
    const id = setInterval(() => {
      setBoard((b) =>
        b.map((e, i) => (Math.random() < 0.04 && i < 60 ? { ...e, xp: e.xp + [10, 20, 50][Math.floor(Math.random() * 3)]! } : e)),
      );
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const friends: number[] = []; // referred friends' XP comes from the quest service
  const refXp = referralXp(friends);
  const questXp = totalQuestXp(progress);
  const xp = questXp + refXp;

  const ranked = useMemo(
    () => rankLeaderboard(session && board.length ? [...board, { id: "you", name: "You", xp, isYou: true }] : board),
    [board, session, xp],
  );
  const yourRank = session && xp > 0 ? (ranked.find((e) => e.isYou)?.rank ?? null) : null;

  const complete = (id: string) => {
    const q = questById(id);
    if (q) updateProgress((p) => completeQuest(p, q, Date.now()));
  };

  const submit = (id: string, url: string) => {
    const q = questById(id);
    if (!q) return;
    updateProgress((p) => submitForReview(p, q, url, Date.now()));
    toast.message("Submitted for review", { description: q.title });
    if (IS_SIMULATED) {
      // Simulated reviewer approves after a short delay so the flow can be exercised end to end.
      setTimeout(() => {
        updateProgress((p) => {
          const e = p[id];
          if (e?.status !== "pending_review") return p;
          const { [id]: _drop, ...rest } = p;
          return completeQuest(rest, q, Date.now(), e.submission);
        });
        toast.success(`+${q.xp} XP earned`, { description: `${q.title} · simulated review approved` });
      }, 3500);
    }
  };

  return (
    <div className="relative">
      <div className="bg-dots pointer-events-none absolute inset-x-0 -top-6 bottom-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1120px] space-y-2.5 px-3 pb-10 pt-4 sm:px-6">
        <h1 className="sr-only">ZENTRA Quests</h1>
        <LoginPanel
          session={session}
          linked={linked}
          onConnectWallet={() => setConnectOpen(true)}
          onLink={setLinkPlatform}
          onUnlink={(p) => {
            setLinked(p, null);
            toast.message(`${p === "x" ? "X" : "Telegram"} account unlinked`);
          }}
        />
        <ProgressPanel
          xp={xp}
          rank={yourRank}
          completed={completedQuestCount(progress)}
          total={QUESTS.length}
          referralXp={refXp}
          friends={friends.length}
          inviteCode={partyId ? inviteCodeFor(partyId) : null}
        />

        <div className="grid gap-4 pt-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-3">
          <QuestBoard
            progress={progress}
            hasWallet={!!session}
            linked={linked}
            txs={state.txs}
            onConnectWallet={() => setConnectOpen(true)}
            onLink={setLinkPlatform}
            onComplete={complete}
            onSubmit={submit}
          />
          <div className="lg:pt-[1px]">
            <Leaderboard entries={ranked} live={IS_SIMULATED} />
          </div>
        </div>
      </div>

      <LinkAccountDialog
        platform={linkPlatform}
        onClose={() => setLinkPlatform(null)}
        onLink={(p, handle) => {
          setLinked(p, handle);
          setLinkPlatform(null);
          toast.success(`${p === "x" ? "X" : "Telegram"} linked as @${handle}`, { description: "Simulated account link" });
        }}
      />
    </div>
  );
}
