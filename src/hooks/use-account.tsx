import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Context, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

interface AccountValue {
  user: User | null;
  /** False until the stored session has been checked. */
  ready: boolean;
  signOut: () => Promise<void>;
}

// Same hot-reload-safe pattern as ZentraProvider: keep one context instance across module reloads.
const host = globalThis as typeof globalThis & { __zentraAccountContext?: Context<AccountValue | null> };
const AccountContext = (host.__zentraAccountContext ??= createContext<AccountValue | null>(null));

/** ZENTRA app account (email/password or Google). Owns the single auth-state listener. */
export function AccountProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      setReady(true);
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient, router]);

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  }, [queryClient]);

  const value = useMemo(() => ({ user, ready, signOut }), [user, ready, signOut]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}

/** Same-origin path to return to after sign-in; anything else falls back to /quests. */
export function safeNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/quests";
}

const NEXT_KEY = "zentra.auth.next";
export const rememberNext = (path: string) => {
  try {
    sessionStorage.setItem(NEXT_KEY, safeNext(path));
  } catch {
    /* storage disabled */
  }
};
export const takeNext = () => {
  try {
    const v = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    return v ? safeNext(v) : null;
  } catch {
    return null;
  }
};
