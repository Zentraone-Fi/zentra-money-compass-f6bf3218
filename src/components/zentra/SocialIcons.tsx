import { BookOpen, Globe } from "lucide-react";

import { LINKS } from "@/lib/zentra/env";

const svg = (d: string) =>
  function Icon() {
    return (
      <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
        <path d={d} />
      </svg>
    );
  };

const Telegram = svg(
  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.64 6.8-1.64 7.74c-.12.55-.45.68-.9.42l-2.5-1.84-1.2 1.16c-.14.13-.25.24-.5.24l.18-2.54 4.62-4.18c.2-.18-.04-.28-.31-.1L8.68 13.3l-2.46-.77c-.53-.17-.54-.53.11-.79l9.6-3.7c.45-.16.84.11.71.76Z",
);
const GitHub = svg(
  "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z",
);
const XLogo = svg(
  "M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z",
);
const LinkedIn = svg(
  "M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM8.34 18.34H5.67V9.75h2.67v8.59ZM7 8.58a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1Zm11.34 9.76h-2.67v-4.18c0-1 0-2.28-1.39-2.28s-1.6 1.09-1.6 2.21v4.25H10V9.75h2.56v1.17h.04a2.8 2.8 0 0 1 2.53-1.39c2.7 0 3.2 1.78 3.2 4.09v4.72Z",
);

export const SOCIALS = [
  { label: "X", href: LINKS.x, Icon: XLogo },
  { label: "Telegram", href: LINKS.telegram, Icon: Telegram },
  { label: "GitHub", href: LINKS.github, Icon: GitHub },
  { label: "LinkedIn", href: LINKS.linkedin, Icon: LinkedIn },
  {
    label: "Docs on GitBook",
    href: LINKS.docs,
    Icon: function Docs() {
      return <BookOpen className="size-6" aria-hidden />;
    },
  },
  {
    label: "Website",
    href: LINKS.website,
    Icon: function Web() {
      return <Globe className="size-6" aria-hidden />;
    },
  },
];

export function SocialLinks() {
  return (
    <ul className="flex items-center gap-4">
      {SOCIALS.map(({ label, href, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            title={label}
            className="text-foreground transition-colors hover:text-lime"
          >
            <Icon />
          </a>
        </li>
      ))}
    </ul>
  );
}
