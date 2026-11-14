import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/zentra/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ZENTRA Finance" },
      { name: "description", content: "How the ZENTRA app handles your information." },
      { property: "og:title", content: "Privacy Policy — ZENTRA Finance" },
      { property: "og:description", content: "How the ZENTRA app handles your information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title="Privacy Policy"
      sections={[
        { h: "What we collect", p: "The ZENTRA app does not ask for your name, email or private keys. When you connect a wallet, the app reads your Canton party identifier and the balances and positions you're authorized to see." },
        { h: "On-ledger data", p: "Protocol activity is recorded on Canton Network. Canton's privacy model limits who can see contract data to the parties involved and those with an authorized role." },
        { h: "App preferences", p: "We may store non-financial interface settings, such as display preferences, to improve your experience." },
        { h: "Contact", p: "Questions about privacy can be sent to the team through our Telegram community." },
      ]}
    />
  ),
});
