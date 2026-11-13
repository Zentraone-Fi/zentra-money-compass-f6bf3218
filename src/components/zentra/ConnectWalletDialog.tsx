import { Loader2, ShieldCheck, Wallet } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useZentra } from "@/lib/zentra/store";
import { WALLETS } from "@/lib/zentra/wallet";
import { cn } from "@/lib/utils";
import { SimBadge } from "./Panel";

export function ConnectWalletDialog() {
  const { connectOpen, setConnectOpen, connect, connecting } = useZentra();
  return (
    <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
      <DialogContent className="panel max-w-md border-panel-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Connect a wallet</DialogTitle>
          <DialogDescription className="text-text-2">
            ZENTRA runs on Canton Network. You sign as your own Canton party — not an EVM address.
          </DialogDescription>
        </DialogHeader>
        <ul className="mt-2 space-y-2">
          {WALLETS.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                disabled={!w.available || connecting}
                onClick={() => connect(w.id)}
                className={cn(
                  "panel-row flex w-full items-start gap-3 p-4 text-left transition-colors",
                  w.available ? "hover:border-lime/60" : "cursor-not-allowed opacity-60",
                )}
              >
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-lime/15 text-lime">
                  {w.simulated ? <Wallet className="size-4" /> : <ShieldCheck className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    {w.name}
                    {w.simulated && <SimBadge />}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-2">
                    {w.available ? w.description : w.unavailableReason}
                  </span>
                </span>
                {connecting && w.available && <Loader2 className="size-4 animate-spin text-lime" />}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          ZENTRA never asks for your seed phrase or private keys.
        </p>
      </DialogContent>
    </Dialog>
  );
}
