import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { PageHeader, PageShell } from "@/components/zentra/PageHeader";
import { SOCIALS } from "@/components/zentra/SocialIcons";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — ZENTRA Finance" },
      { name: "description", content: "Reach the ZENTRA team on Telegram, GitHub, LinkedIn or our website." },
      { property: "og:title", content: "Contact — ZENTRA Finance" },
      { property: "og:description", content: "Reach the ZENTRA team on Telegram, GitHub, LinkedIn or our website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

const NOTES: Record<string, string> = {
  Telegram: "Community chat and announcements",
  GitHub: "Source code and issues",
  LinkedIn: "Company news and careers",
  "Docs on GitBook": "Full protocol documentation",
  Website: "zentraone.xyz",
};

function Contact() {
  return (
    <PageShell>
      <PageHeader title="Contact" subtitle="The fastest way to reach the team is our Telegram community." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SOCIALS.map(({ label, href, Icon }) => (
          <li key={label}>
            <a href={href} target="_blank" rel="noreferrer" className="panel group flex items-center gap-4 p-5 transition-colors hover:border-lime/60">
              <span className="grid size-12 place-items-center rounded-full bg-lime/10 text-lime">
                <Icon />
              </span>
              <span className="flex-1">
                <span className="block font-medium">{label}</span>
                <span className="text-sm text-text-2">{NOTES[label]}</span>
              </span>
              <ArrowUpRight className="size-5 text-text-2 group-hover:text-lime" />
            </a>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
