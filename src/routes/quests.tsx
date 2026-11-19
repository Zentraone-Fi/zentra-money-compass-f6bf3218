import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DisplayNameDialog } from "@/components/zentra/quests/DisplayNameDialog";
import { Leaderboard } from "@/components/zentra/quests/Leaderboard";
import { LinkAccountDialog } from "@/components/zentra/quests/LinkAccountDialog";
import { LoginPanel } from "@/components/zentra/quests/LoginPanel";
import { ProgressPanel } from "@/components/zentra/quests/ProgressPanel";
import { QuestBoard } from "@/components/zentra/quests/QuestBoard";
import { useAccount } from "@/hooks/use-account";
import { supabase } from "@/integrations/supabase/client";
import { IS_SIMULATED } from "@/lib/zentra/env";
import { applyReferral, claimQuest, getQuestAccount, submitQuest, updateQuestProfile } from "@/lib/zentra/quest-service.functions";
import {
  QUESTS,
  completedQuestCount,
  progressFromRecords,
  questById,
  totalQuestXp,
  type LedgerEvidence,
  type LinkedAccounts,
  type RankedEntry,
  type SocialPlatform,
} from "@/lib/zentra/quests";
import { useZentra } from "@/lib/zentra/store";

const REF_CODE = /^ZNT-[A-Z0-9]{6}$/i;
const PENDING_REF_KEY = "zentra.quests.ref";

export const Route = createFileRoute("/quests")({
  validateSearch: (s: Record<string, unknown>): { ref?: string } =>
    typeof s["ref"] === "string" && REF_CODE.test(s["ref"]) ? { ref: s["ref"].toUpperCase() } : {},
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

const errText = (e: unknown) => (e instanceof Error ? e.message : "Please try again.");

function Quests() {
  const { session, state, setConnectOpen } = useZentra();
  const { user, ready } = useAccount();
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getQuestAccount);
  const claim = useServerFn(claimQuest);
  const submitFn = useServerFn(submitQuest);
  const updateProfile = useServerFn(updateQuestProfile);
  const applyRef = useServerFn(applyReferral);
  const [linkPlatform, setLinkPlatform] = useState<SocialPlatform | null>(null);
  const [editName, setEditName] = useState(false);

  const accountQuery = useQuery({
    queryKey: ["quest-account", user?.id],
    queryFn: () => fetchAccount(),
    enabled: !!user,
  });
  const boardQuery = useQuery({
    queryKey: ["quest-leaderboard", user?.id ?? "anon"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("quest_leaderboard", { p_limit: 200 });
      if (error) throw error;
      return data;
    },
    enabled: ready,
    refetchInterval: 20_000,
  });

  const account = user ? accountQuery.data : undefined;
  const refresh = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quest-account"] }),
        queryClient.invalidateQueries({ queryKey: ["quest-leaderboard"] }),
      ]),
    [queryClient],
  );

  useEffect(() => {
    if (accountQuery.error) toast.error("Couldn't load your quest progress", { description: errText(accountQuery.error) });
  }, [accountQuery.error]);

  // Remember an invite code from ?ref= until the visitor has an account, then apply it once.
  useEffect(() => {
    if (ref) localStorage.setItem(PENDING_REF_KEY, ref);
  }, [ref]);
  useEffect(() => {
    if (!account || account.profile.referred) return;
    const code = localStorage.getItem(PENDING_REF_KEY);
    if (!code) return;
    localStorage.removeItem(PENDING_REF_KEY);
    if (code === account.profile.invite_code) return;
    applyRef({ data: { code } })
      .then(({ result }) => {
        if (result === "applied") {
          toast.success("Invite code applied", { description: "Your friend earns 10% of the quest XP you collect." });
          void refresh();
        }
      })
      .catch(() => {});
  }, [account, applyRef, refresh]);

  // Keep the connected wallet's party ID on the account.
  useEffect(() => {
    if (!account || !session || account.profile.wallet_party_id === session.partyId) return;
    updateProfile({ data: { wallet_party_id: session.partyId } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["quest-account"] }))
      .catch(() => {});
  }, [account, session, updateProfile, queryClient]);

  const progress = useMemo(() => (account ? progressFromRecords(account.claims, account.submissions) : {}), [account]);
  const linked: LinkedAccounts = { x: account?.profile.x_handle ?? null, telegram: account?.profile.telegram_handle ?? null };

  const rows = boardQuery.data ?? [];
  const me = user ? rows.find((r) => r.is_you) : undefined;
  const refXp = Number(me?.referral_xp ?? 0);
  const friends = Number(me?.friends ?? 0);
  const xp = totalQuestXp(progress) + refXp;
  const ranked = useMemo<RankedEntry[]>(
    () =>
      rows
        .filter((r) => Number(r.xp) > 0)
        .map((r) => ({ id: `rank-${r.rank}`, name: r.display_name, xp: Number(r.xp), rank: Number(r.rank), isYou: r.is_you })),
    [rows],
  );
  const yourRank = me && xp > 0 ? Number(me.rank) : null;

  const signIn = () => void navigate({ to: "/auth", search: { redirect: "/quests" } });

  const complete = async (id: string, tx?: LedgerEvidence) => {
    const q = questById(id);
    if (!q) return;
    try {
      const res = await claim({ data: { questId: id, tx } });
      if (res.ok) {
        toast.success(`+${res.xp} XP earned`, {
          description: `${q.title} · saved to your account${res.simulated ? " · simulated verification" : ""}`,
        });
        await refresh();
      } else {
        toast.error("Not verified yet", { description: res.reason });
      }
    } catch (e) {
      toast.error("Couldn't save your XP", { description: errText(e) });
    }
  };

  const submit = async (id: string, url: string) => {
    const q = questById(id);
    if (!q) return;
    try {
      const res = await submitFn({ data: { questId: id, url } });
      if (res.ok) {
        toast.message("Submitted for review", { description: `${q.title} · XP is added once the ZENTRA team approves it` });
        await refresh();
      } else toast.error("Couldn't submit", { description: res.reason });
    } catch (e) {
      toast.error("Couldn't submit", { description: errText(e) });
    }
  };

  const setLinked = async (p: SocialPlatform, handle: string | null) => {
    const name = p === "x" ? "X" : "Telegram";
    try {
      await updateProfile({ data: p === "x" ? { x_handle: handle } : { telegram_handle: handle } });
      await refresh();
      if (handle) toast.success(`${name} linked as @${handle}`, { description: "Simulated account link · saved to your account" });
      else toast.message(`${name} account unlinked`);
    } catch (e) {
      toast.error(`Couldn't update ${name}`, { description: errText(e) });
    }
  };

  return (
    <div className="relative">
      <div className="bg-dots pointer-events-none absolute inset-x-0 -top-6 bottom-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
      <div className="relative mx-auto w-full max-w-[1120px] space-y-2.5 px-3 pb-10 pt-4 sm:px-6">
        <h1 className="sr-only">ZENTRA Quests</h1>
        <LoginPanel
          account={!ready ? undefined : !user ? null : account ? { displayName: account.profile.display_name } : undefined}
          session={session}
          linked={linked}
          onConnectWallet={() => setConnectOpen(true)}
          onEditName={() => setEditName(true)}
          onLink={setLinkPlatform}
          onUnlink={(p) => void setLinked(p, null)}
        />
        <ProgressPanel
          xp={xp}
          rank={yourRank}
          completed={completedQuestCount(progress)}
          total={QUESTS.length}
          referralXp={refXp}
          friends={friends}
          inviteCode={account?.profile.invite_code ?? null}
        />

        <div className="grid gap-4 pt-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-3">
          <QuestBoard
            progress={progress}
            signedIn={!!user && !!account}
            hasWallet={!!session}
            linked={linked}
            txs={state.txs}
            onSignIn={signIn}
            onConnectWallet={() => setConnectOpen(true)}
            onLink={setLinkPlatform}
            onComplete={complete}
            onSubmit={submit}
          />
          <div className="lg:pt-[1px]">
            <Leaderboard entries={ranked} live simulated={IS_SIMULATED} loading={boardQuery.isLoading} />
          </div>
        </div>
      </div>

      <LinkAccountDialog
        platform={linkPlatform}
        onClose={() => setLinkPlatform(null)}
        onLink={(p, handle) => {
          setLinkPlatform(null);
          void setLinked(p, handle);
        }}
      />
      <DisplayNameDialog
        open={editName}
        current={account?.profile.display_name ?? ""}
        onClose={() => setEditName(false)}
        onSave={async (name) => {
          try {
            await updateProfile({ data: { display_name: name } });
            await refresh();
            setEditName(false);
            toast.success("Display name updated");
          } catch (e) {
            toast.error("Couldn't update name", { description: errText(e) });
          }
        }}
      />
    </div>
  );
}
