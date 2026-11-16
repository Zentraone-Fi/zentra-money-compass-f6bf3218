import { useCallback, useEffect, useState } from "react";

import type { QuestProgress, SocialPlatform } from "./quests";

export type LinkedAccounts = Record<SocialPlatform, string | null>;

const NO_LINKS: LinkedAccounts = { x: null, telegram: null };
const progressKey = (partyId: string) => `zentra.quests.v1.${partyId}`;
const LINKS_KEY = "zentra.quests.links.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or disabled: keep in memory only */
  }
}

/**
 * Development-only quest state kept in this browser. The production quest service
 * owns XP and verifies accounts server-side; nothing here is authoritative.
 */
export function useQuestState(partyId: string | null) {
  const [progress, setProgressState] = useState<QuestProgress>({});
  const [linked, setLinkedState] = useState<LinkedAccounts>(NO_LINKS);

  useEffect(() => {
    setLinkedState(read(LINKS_KEY, NO_LINKS));
  }, []);

  useEffect(() => {
    setProgressState(partyId ? read<QuestProgress>(progressKey(partyId), {}) : {});
  }, [partyId]);

  const updateProgress = useCallback(
    (fn: (p: QuestProgress) => QuestProgress) => {
      setProgressState((prev) => {
        const next = fn(prev);
        if (partyId && next !== prev) write(progressKey(partyId), next);
        return next;
      });
    },
    [partyId],
  );

  const setLinked = useCallback((platform: SocialPlatform, handle: string | null) => {
    setLinkedState((prev) => {
      const next = { ...prev, [platform]: handle };
      write(LINKS_KEY, next);
      return next;
    });
  }, []);

  return { progress, updateProgress, linked, setLinked };
}

/** Short, stable invite code derived from the party id. */
export function inviteCodeFor(partyId: string) {
  let h = 2166136261;
  for (const c of partyId) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return `ZNT-${(h >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`;
}
