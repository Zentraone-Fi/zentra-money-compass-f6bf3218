import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SocialPlatform } from "@/lib/zentra/quests";
import { SimBadge } from "../Panel";
import { Telegram, XLogo } from "../SocialIcons";

const NAME: Record<SocialPlatform, string> = { x: "X", telegram: "Telegram" };

export function LinkAccountDialog({
  platform,
  onClose,
  onLink,
}: {
  platform: SocialPlatform | null;
  onClose: () => void;
  onLink: (platform: SocialPlatform, handle: string) => void;
}) {
  const [handle, setHandle] = useState("");
  useEffect(() => setHandle(""), [platform]);
  const clean = handle.trim().replace(/^@/, "");
  const valid = /^[A-Za-z0-9_]{3,32}$/.test(clean);

  return (
    <Dialog open={!!platform} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="quest-panel max-w-sm">
        {platform && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) onLink(platform, clean);
            }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-medium">
                {platform === "x" ? <XLogo className="size-4" /> : <Telegram className="size-5" />}
                Log in with {NAME[platform]} <SimBadge />
              </DialogTitle>
              <DialogDescription className="text-xs text-text-2">
                In production this opens {NAME[platform]}'s own sign-in so we can verify quests against your account. In
                development, enter a handle to simulate the link. It's saved to your ZENTRA account.
              </DialogDescription>
            </DialogHeader>
            <label className="mt-4 block text-xs text-text-2" htmlFor="link-handle">
              {NAME[platform]} username
            </label>
            <div className="quest-field mt-1.5 flex h-10 items-center gap-1 px-3 focus-within:border-lime/60">
              <span className="text-text-2">@</span>
              <input
                id="link-handle"
                autoFocus
                autoComplete="off"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="username"
                className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            {handle && !valid && <p className="mt-1.5 text-xs text-destructive">3–32 letters, numbers or underscores.</p>}
            <Button type="submit" variant="action" className="mt-5 h-9 w-full rounded-md" disabled={!valid}>
              Link {NAME[platform]} account
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
