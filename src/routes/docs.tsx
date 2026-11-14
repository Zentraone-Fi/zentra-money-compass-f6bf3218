import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/zentra/PageHeader";
import { Panel } from "@/components/zentra/Panel";
import { LINKS } from "@/lib/zentra/env";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — ZENTRA Finance" },
      { name: "description", content: "How ZENTRA lending, borrowing, liquidations, swaps and staking work on Canton Network, plus risk disclosures and FAQs." },
      { property: "og:title", content: "Docs — ZENTRA Finance" },
      { property: "og:description", content: "How ZENTRA lending, borrowing, liquidations, swaps and staking work on Canton Network." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Docs,
});

const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "about",
    title: "About ZENTRA",
    body: [
      "ZENTRA is a decentralized lending, borrowing, liquidity, yield and trading protocol designed natively for Canton Network. Its token is $ZNT.",
      "Financial logic lives in Daml smart contracts. The Canton ledger is the single source of truth for assets, positions and executed transactions.",
    ],
  },
  {
    id: "lending",
    title: "How lending works",
    body: [
      "You deposit a supported asset into its market. Borrowers pay interest on what they take out, and that interest — minus the market's reserve factor — flows to suppliers.",
      "Supply APY is variable. It rises when more of the market is borrowed (higher utilization) and falls when less is. Withdrawals depend on available liquidity in the market.",
    ],
  },
  {
    id: "borrowing",
    title: "How borrowing works",
    body: [
      "Borrowing is overcollateralized. You supply eligible collateral, then borrow up to its maximum loan-to-value (LTV) without selling it.",
      "Your health factor is collateral × liquidation threshold ÷ debt. The app shows how every action changes it before you sign. Repay partly or in full at any time.",
    ],
  },
  {
    id: "liquidation",
    title: "Collateral and liquidation",
    body: [
      "Each collateral asset has a max LTV and a higher liquidation threshold. If prices move and your health factor falls below 1.00, part of your debt can be repaid by a liquidator in exchange for collateral plus a liquidation bonus.",
      "Liquidations are enforced by the smart contracts using validated oracle prices — never by the website. Stale or invalid prices are rejected for risk-sensitive actions.",
    ],
  },
  {
    id: "liquidity",
    title: "Liquidity provision",
    body: [
      "Liquidity providers deposit token pairs into swap pools and earn a share of trading fees. This is a separate product from lending deposits, with its own risks such as impermanent loss.",
    ],
  },
  {
    id: "swaps",
    title: "Trading and swaps",
    body: [
      "Swaps are priced from pool liquidity. Before you sign, you see the rate, price impact, trading fee, route and minimum received. If the price moves past your slippage tolerance, the swap is rejected.",
    ],
  },
  {
    id: "staking",
    title: "Yield and staking",
    body: [
      "Holding ZNT does not earn rewards by itself. Rewards accrue only on staked ZNT at a variable rate, once the token and staking contracts are deployed.",
      "Every yield strategy lists its source, reward asset, fees, lock-up, withdrawal conditions and risks.",
    ],
  },
  {
    id: "architecture",
    title: "Smart contract architecture",
    body: [
      "The protocol is organized into Daml modules: asset registry, lending markets, supply and borrow positions, collateral, interest-rate model, risk engine, liquidation, liquidity pools, swaps, yield strategies, staking, reward distribution, governance, treasury and events.",
      "Every state change checks ownership, authorization, balances, market status, risk limits and liquidity. Ledger semantics prevent replays and double spends.",
    ],
  },
  {
    id: "canton",
    title: "Canton Network integration",
    body: [
      "You act as your own Canton party through a Canton-compatible wallet — not an EVM address. Canton's privacy model means you see your own positions, and other participants don't automatically see your balances.",
    ],
  },
  {
    id: "risks",
    title: "Risk disclosures",
    body: [
      "Using ZENTRA involves smart contract risk, liquidation risk, oracle risk, liquidity risk and counterparty risk for integrated protocols. Rates are variable and returns are never guaranteed.",
      "The protocol has not been independently audited yet. Only use funds you can afford to lose.",
    ],
  },
  {
    id: "faq",
    title: "FAQs",
    body: [
      "Is ZENTRA live? Not yet. This app is running in development mode with simulated data until the Canton deployment is complete.",
      "Which wallets are supported? Canton-compatible wallets. Integrations will be listed in the Connect Wallet window as they go live.",
      "Can I lose my collateral? Yes — if your health factor drops below 1.00, part of it can be liquidated.",
    ],
  },
];

function Docs() {
  return (
    <PageShell>
      <PageHeader
        title="Docs"
        subtitle="A quick guide to how ZENTRA works. The full documentation lives on GitBook."
        action={
          <Button asChild variant="wallet" size="xl">
            <a href={LINKS.docs} target="_blank" rel="noreferrer">
              Open GitBook <ArrowUpRight />
            </a>
          </Button>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-full px-3 py-1.5 text-sm text-text-2 hover:bg-accent hover:text-foreground lg:rounded-lg">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <Panel key={s.id} className="scroll-mt-28">
              <article id={s.id} className="scroll-mt-28">
                <h2 className="text-xl font-medium">{s.title}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-text-2">
                  {s.body.map((p) => <p key={p}>{p}</p>)}
                </div>
              </article>
            </Panel>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
