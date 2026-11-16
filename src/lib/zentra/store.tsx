import { createContext, type Context, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";

import { fmt } from "./decimal";
import { createDevLedger, type LedgerAdapter, type TxRequest } from "./ledger";
import type { LedgerState, TxRecord, TxStatus } from "./types";
import { walletById, type WalletSession } from "./wallet";

interface ZentraContextValue {
  ledger: LedgerAdapter;
  state: LedgerState;
  session: WalletSession | null;
  connecting: boolean;
  connectOpen: boolean;
  setConnectOpen: (open: boolean) => void;
  connect: (walletId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  submit: (req: TxRequest) => Promise<TxRecord | null>;
}

// Keep one context instance across hot reloads: a re-evaluated module would otherwise create a
// new context that consumers read while the mounted provider still serves the old one.
const contextHost = globalThis as typeof globalThis & { __zentraContext?: Context<ZentraContextValue | null> };
const ZentraContext = (contextHost.__zentraContext ??= createContext<ZentraContextValue | null>(null));

export const TX_STATUS_LABEL: Record<TxStatus, string> = {
  draft: "Draft",
  awaiting_authorization: "Awaiting wallet authorization",
  submitted: "Submitted",
  pending_confirmation: "Pending ledger confirmation",
  confirmed: "Confirmed",
  rejected: "Rejected",
  failed: "Failed",
  expired: "Expired",
};

export const TX_KIND_LABEL: Record<TxRecord["kind"], string> = {
  supply: "Supply",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
  swap: "Swap",
  stake: "Stake",
  unstake: "Unstake",
  claim: "Claim rewards",
};

export function ZentraProvider({ children }: { children: ReactNode }) {
  const [ledger] = useState(() => createDevLedger());
  const state = useSyncExternalStore(ledger.subscribe, ledger.getState, ledger.getState);
  const [session, setSession] = useState<WalletSession | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    ledger.tick(Date.now());
    const id = setInterval(() => ledger.tick(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [ledger]);

  const connect = useCallback(async (walletId: string) => {
    const w = walletById(walletId);
    if (!w || !w.available) return;
    setConnecting(true);
    try {
      setSession(await w.connect());
      setConnectOpen(false);
      toast.success(`${w.name} connected`, {
        description: w.simulated ? "Development mode — balances and positions are simulated." : undefined,
      });
    } catch (e) {
      toast.error("Wallet connection failed", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (session) await walletById(session.walletId)?.disconnect();
    setSession(null);
  }, [session]);

  const submit = useCallback(
    async (req: TxRequest) => {
      if (!session) {
        setConnectOpen(true);
        return null;
      }
      const wallet = walletById(session.walletId);
      if (!wallet) return null;
      const title = `${TX_KIND_LABEL[req.kind]} ${req.kind === "claim" ? "" : `${fmt(req.amount, 6, { trim: true })} ${req.assetId}`}`.trim();
      const toastId = toast.loading(title, { description: TX_STATUS_LABEL.draft });
      const rec = await ledger.submit(req, (tx) => wallet.authorize(tx), (tx) => {
        const sim = tx.simulated ? " · simulated" : "";
        if (tx.status === "confirmed") {
          toast.success(title, { id: toastId, description: `Confirmed on ledger${sim}` });
          if (req.kind === "swap") {
            window.__lovableEvents?.track?.("project.swap_confirmed", {
              from_asset: req.assetId,
              to_asset: req.counterAssetId ?? "",
              simulated: tx.simulated,
            });
          } else if (req.kind === "supply" || req.kind === "withdraw" || req.kind === "borrow" || req.kind === "repay") {
            window.__lovableEvents?.track?.(`project.${req.kind}_confirmed`, { asset: req.assetId, simulated: tx.simulated });
          }
        }
        else if (tx.status === "failed" || tx.status === "rejected" || tx.status === "expired")
          toast.error(title, { id: toastId, description: `${TX_STATUS_LABEL[tx.status]}: ${tx.error ?? ""}` });
        else toast.loading(title, { id: toastId, description: `${TX_STATUS_LABEL[tx.status]}${sim}` });
      });
      return rec;
    },
    [ledger, session],
  );

  const value = useMemo(
    () => ({ ledger, state, session, connecting, connectOpen, setConnectOpen, connect, disconnect, submit }),
    [ledger, state, session, connecting, connectOpen, connect, disconnect, submit],
  );
  return <ZentraContext.Provider value={value}>{children}</ZentraContext.Provider>;
}

export function useZentra() {
  const ctx = useContext(ZentraContext);
  if (!ctx) throw new Error("useZentra must be used inside ZentraProvider");
  return ctx;
}

export function useAsset(id: string) {
  const { state } = useZentra();
  return state.assets.find((a) => a.id === id);
}
