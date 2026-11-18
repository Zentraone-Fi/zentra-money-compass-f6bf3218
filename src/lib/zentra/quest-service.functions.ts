/**
 * Quest service: XP claims, creative submissions and quest profile, stored per app account.
 * Claims are written only here (after `checkClaim`), never from the browser, so XP can't be self-granted.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { IS_SIMULATED } from "./env";
import { checkClaim, questById, type ClaimRecord, type SubmissionRecord } from "./quests";

const HANDLE = z
  .string()
  .trim()
  .transform((h) => h.replace(/^@/, ""))
  .pipe(z.string().regex(/^[A-Za-z0-9_]{3,32}$/, "3–32 letters, numbers or underscores"));

export interface QuestProfile {
  display_name: string;
  x_handle: string | null;
  telegram_handle: string | null;
  wallet_party_id: string | null;
  invite_code: string;
  referred: boolean;
}

export interface QuestAccount {
  profile: QuestProfile;
  claims: ClaimRecord[];
  submissions: SubmissionRecord[];
}

export const getQuestAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<QuestAccount> => {
    const { supabase, userId } = context;
    const [profile, claims, submissions] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, x_handle, telegram_handle, wallet_party_id, invite_code, referred_by")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("quest_claims").select("quest_id, claimed_at").eq("user_id", userId),
      supabase.from("quest_submissions").select("quest_id, url, status, submitted_at").eq("user_id", userId),
    ]);
    if (profile.error) throw new Error(profile.error.message);
    if (claims.error) throw new Error(claims.error.message);
    if (submissions.error) throw new Error(submissions.error.message);
    if (!profile.data) throw new Error("Your quest profile is missing. Sign out and back in to recreate it.");
    const { referred_by, ...rest } = profile.data;
    return {
      profile: { ...rest, referred: !!referred_by },
      claims: claims.data,
      submissions: submissions.data as SubmissionRecord[],
    };
  });

export type ClaimResult = { ok: true; xp: number; simulated: boolean } | { ok: false; reason: string };

export const claimQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        questId: z.string().min(1).max(64),
        tx: z
          .object({
            id: z.string().min(1).max(128),
            kind: z.enum(["supply", "withdraw", "borrow", "repay", "swap", "stake", "unstake", "claim"]),
            status: z.enum(["draft", "awaiting_authorization", "submitted", "pending_confirmation", "confirmed", "rejected", "failed", "expired"]),
            updatedAt: z.number().int().positive(),
          })
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ClaimResult> => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("x_handle, telegram_handle")
      .eq("id", userId)
      .maybeSingle();
    if (error || !profile) return { ok: false, reason: "Couldn't load your quest profile" };

    const quest = questById(data.questId);
    const now = Date.now();
    const check = checkClaim(quest, {
      simulated: IS_SIMULATED,
      linked: { x: profile.x_handle, telegram: profile.telegram_handle },
      ledgerTx: data.tx,
      now,
    });
    if (!check.ok || !quest) return { ok: false, reason: check.ok ? "Unknown quest" : check.reason };

    const v = quest.verification;
    const evidence =
      v.type === "ledger" ? `tx:${data.tx?.id}` : v.type === "social" ? `${v.platform}:@${v.platform === "x" ? profile.x_handle : profile.telegram_handle}` : "visited";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertError } = await supabaseAdmin.from("quest_claims").insert({
      user_id: userId,
      quest_id: quest.id,
      period: check.period,
      xp: check.xp,
      evidence,
      simulated: IS_SIMULATED,
    });
    if (insertError) {
      if (insertError.code === "23505") {
        return { ok: false, reason: quest.frequency === "daily" ? "Already claimed today" : "Already claimed" };
      }
      console.error("claimQuest insert failed", insertError);
      return { ok: false, reason: "Couldn't save your XP. Try again." };
    }
    return { ok: true, xp: check.xp, simulated: IS_SIMULATED };
  });

export const submitQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        questId: z.string().min(1).max(64),
        url: z.string().trim().max(500).regex(/^https:\/\/[^\s]+\.[^\s]+$/, "Use a full https:// link"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const quest = questById(data.questId);
    if (!quest || quest.verification.type !== "submission") return { ok: false, reason: "This quest doesn't take submissions" };

    const { data: existing } = await context.supabase
      .from("quest_submissions")
      .select("status")
      .eq("user_id", context.userId)
      .eq("quest_id", quest.id)
      .maybeSingle();
    if (existing && existing.status !== "rejected") return { ok: false, reason: "Already submitted" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("quest_submissions").upsert(
      { user_id: context.userId, quest_id: quest.id, url: data.url, status: "pending", submitted_at: new Date().toISOString(), reviewed_at: null },
      { onConflict: "user_id,quest_id" },
    );
    if (error) {
      console.error("submitQuest failed", error);
      return { ok: false, reason: "Couldn't save your submission. Try again." };
    }
    return { ok: true };
  });

export const updateQuestProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(2, "At least 2 characters").max(32, "At most 32 characters").optional(),
        x_handle: HANDLE.nullable().optional(),
        telegram_handle: HANDLE.nullable().optional(),
        wallet_party_id: z.string().trim().min(1).max(255).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const applyReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.string().trim().min(4).max(16) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("apply_referral", { p_code: data.code });
    if (error) throw new Error(error.message);
    return { result: result as "applied" | "already_referred" | "invalid" };
  });
