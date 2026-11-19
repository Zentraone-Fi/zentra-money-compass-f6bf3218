import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Check, Mail, Pencil, X as XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IS_SIMULATED } from "@/lib/zentra/env";
import type { LinkedAccounts, SocialPlatform } from "@/lib/zentra/quests";
import type { WalletSession } from "@/lib/zentra/wallet";
import { cn } from "@/lib/utils";
import { GoogleButton } from "../auth/GoogleButton";
import { SimBadge } from "../Panel";
import { Telegram, XLogo } from "../SocialIcons";

const PROVIDERS: { id: SocialPlatform; label: string; Icon: (p: { className?: string | undefined }) => ReactNode }[] = [
  { id: "telegram", label: "Telegram", Icon: ({ className }) => <Telegram className={className} /> },
  { id: "x", label: "X", Icon: ({ className }) => <XLogo className={className} /> },
];

export function LoginPanel({
  account,
  session,
  linked,
  onConnectWallet,
  onEditName,
  onLink,
  onUnlink,
}: {
  /** Signed-in app account; null when signed out, undefined while loading. */
  account: { displayName: string } | null | undefined;
  session: WalletSession | null;
  linked: LinkedAccounts;
  onConnectWallet: () => void;
  onEditName: () => void;
  onLink: (p: SocialPlatform) => void;
  onUnlink: (p: SocialPlatform) => void;
}) {
  if (account === null) {
    return (
      <section className="quest-panel px-3 pb-3 pt-3 sm:px-3.5" aria-label="Sign in">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1">
          <p className="truncate text-sm text-foreground/90">Sign in to save your XP on every device.</p>
          <Button asChild variant="action" className="h-8 rounded-md px-5 text-xs">
            <Link to="/auth" search={{ redirect: "/quests" }}>
              Sign in
            </Link>
          </Button>
        </div>
        <div className="my-3 text-center text-[9.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Or continue with</div>
        <div className="grid grid-cols-2 gap-1.5">
          <GoogleButton next="/quests" className="h-[30px] rounded-[5px] text-xs" />
          <Link
            to="/auth"
            search={{ redirect: "/quests" }}
            className="quest-field flex h-[30px] items-center justify-center gap-2 px-3 text-xs font-semibold text-foreground transition-colors hover:border-lime/50 hover:bg-lime/5"
          >
            <Mail className="size-3.5" /> Email
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="quest-panel px-3 pb-3 pt-3 sm:px-3.5" aria-label="Your account">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden />
          {account ? (
            <>
              <span className="truncate">
                Signed in as <span className="font-semibold">{account.displayName}</span>
              </span>
              <button type="button" onClick={onEditName} className="shrink-0 text-text-2 hover:text-lime" aria-label="Edit display name">
                <Pencil className="size-3.5" />
              </button>
            </>
          ) : (
            <span className="h-4 w-40 animate-pulse rounded bg-foreground/10" aria-label="Loading account" />
          )}
        </div>
        {session ? (
          <span className="flex min-w-0 items-center gap-2 text-xs text-text-2">
            <span className="hidden truncate tabular sm:inline">Wallet {session.partyId.slice(0, 14)}…</span>
            {session.simulated && <SimBadge />}
          </span>
        ) : (
          <Button variant="action" className="h-8 rounded-md px-5 text-xs" onClick={onConnectWallet}>
            Connect wallet
          </Button>
        )}
      </div>
      <div className="my-3 text-center text-[9.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Linked accounts</div>
      <div className="grid grid-cols-2 gap-1.5">
        {PROVIDERS.map(({ id, label, Icon }) => {
          const handle = linked[id];
          return (
            <button
              key={id}
              type="button"
              disabled={!IS_SIMULATED || !account}
              title={IS_SIMULATED ? undefined : `${label} linking is not configured yet`}
              onClick={() => (handle ? onUnlink(id) : onLink(id))}
              className={cn(
                "group quest-field flex h-[30px] items-center justify-center gap-2 px-3 text-xs font-semibold text-foreground transition-colors",
                "hover:border-lime/50 hover:bg-lime/5 disabled:cursor-not-allowed disabled:opacity-50",
                handle && "border-lime/40",
              )}
            >
              <span className="grid size-4 place-items-center rounded-[3px] border border-foreground/25">
                <Icon className="size-2.5" />
              </span>
              {handle ? (
                <>
                  <span className="truncate">@{handle}</span>
                  <Check className="size-3.5 text-lime group-hover:hidden" />
                  <XIcon className="hidden size-3.5 text-destructive group-hover:block" aria-label={`Unlink ${label}`} />
                </>
              ) : (
                label
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
