import { IS_SIMULATED } from "./env";
import type { TxRecord } from "./types";

export interface WalletSession {
  walletId: string;
  partyId: string;
  label: string;
  simulated: boolean;
}

/**
 * Canton wallet boundary. Real adapters wrap a Canton-compatible wallet SDK
 * (party-based identity, no EVM chain IDs) and sign through the wallet's own flow.
 */
export interface WalletAdapter {
  id: string;
  name: string;
  description: string;
  simulated: boolean;
  available: boolean;
  unavailableReason?: string;
  connect(): Promise<WalletSession>;
  authorize(tx: TxRecord): Promise<boolean>;
  disconnect(): Promise<void>;
}

const devWallet: WalletAdapter = {
  id: "zentra-dev",
  name: "ZENTRA Dev Wallet",
  description: "Simulated wallet for local development. Nothing touches Canton Network.",
  simulated: true,
  available: IS_SIMULATED,
  unavailableReason: "Development wallet is disabled outside local development.",
  async connect() {
    await new Promise((r) => setTimeout(r, 400));
    return {
      walletId: "zentra-dev",
      partyId: "dev-party::1220a9f3c7e2b4d8",
      label: "Dev party",
      simulated: true,
    };
  },
  async authorize() {
    await new Promise((r) => setTimeout(r, 600));
    return true;
  },
  async disconnect() {},
};

const cantonWallet: WalletAdapter = {
  id: "canton",
  name: "Canton-compatible wallet",
  description: "Connect a Canton Network wallet to sign as your own party.",
  simulated: false,
  available: false,
  unavailableReason: "No Canton wallet integration is configured for this environment yet.",
  async connect() {
    throw new Error("Canton wallet integration not configured.");
  },
  async authorize() {
    return false;
  },
  async disconnect() {},
};

export const WALLETS: WalletAdapter[] = [cantonWallet, devWallet];
export const walletById = (id: string) => WALLETS.find((w) => w.id === id);
