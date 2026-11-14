import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/zentra/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — ZENTRA Finance" },
      { name: "description", content: "The terms for using the ZENTRA app and protocol." },
      { property: "og:title", content: "Terms & Conditions — ZENTRA Finance" },
      { property: "og:description", content: "The terms for using the ZENTRA app and protocol." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title="Terms & Conditions"
      sections={[
        { h: "Using ZENTRA", p: "ZENTRA is a non-custodial interface to smart contracts on Canton Network. You stay in control of your wallet and authorize every transaction yourself." },
        { h: "No guaranteed returns", p: "Interest and reward rates are variable and can change at any time. Nothing in the app is financial advice or a promise of returns." },
        { h: "Risks", p: "Using decentralized finance involves smart contract, liquidation, oracle, liquidity and counterparty risks. You may lose some or all of the assets you deposit." },
        { h: "Availability", p: "Markets can be paused or frozen by authorized governance to protect users. Features shown as development previews are not live." },
      ]}
    />
  ),
});
