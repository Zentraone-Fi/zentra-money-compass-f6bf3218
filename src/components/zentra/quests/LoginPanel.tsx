import type { ReactNode } from "react";
import { Check, X as XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IS_SIMULATED } from "@/lib/zentra/env";
import type { LinkedAccounts } from "@/lib/zentra/quest-store";
import type { SocialPlatform } from "@/lib/zentra/quests";
import type { WalletSession } from "@/lib/zentra/wallet";
import { cn } from "@/lib/utils";
import { SimBadge } from "../Panel";
import { Telegram, XLogo } from "../SocialIcons";

const PROVIDERS: { id: SocialPlatform; label: string; Icon: (p: { className?: string }) => ReactNode }[] = [
  { id: "telegram", label: "Telegram", Icon: ({ className }) => <Telegram className={className} /> },
  { id: "x", label: "X", Icon: ({ className }) => <XLogo className={className} /> },
];

export function LoginPanel({
  session,
  linked,
  onConnectWallet,
  onLink,
  onUnlink,
}: {
  session: WalletSession | null;
  linked: LinkedAccounts;
  onConnectWallet: () => void;
  onLink: (p: SocialPlatform) => void;
  onUnlink: (p: SocialPlatform) => void;
}) {
  return (
    <section className="quest-panel px-3 pb-3 pt-3 sm:px-3.5" aria-label="Sign in">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1">
        {session ? (
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden />
            <span className="truncate">
              Signed in as <span className="tabular text-text-2">{session.partyId.slice(0, 18)}…</span>
            </span>
            {session.simulated && <SimBadge className="hidden sm:inline-flex" />}
          </div>
        ) : (
          <p className="truncate text-sm text-foreground/90">Sign up with your wallet.</p>
        )}
        {!session && (
          <Button variant="action" className="h-8 rounded-md px-5 text-xs" onClick={onConnectWallet}>
            Connect wallet
          </Button>
        )}
      </div>
      <div className="my-3 text-center text-[9.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {session ? "Linked accounts" : "Or log in with"}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {PROVIDERS.map(({ id, label, Icon }) => {
          const handle = linked[id];
          return (
            <button
              key={id}
              type="button"
              disabled={!IS_SIMULATED}
              title={IS_SIMULATED ? undefined : `${label} sign-in is not configured yet`}
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
