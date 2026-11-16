import { ArrowLeftRight, BookOpen, BookText, HandCoins, ImageIcon, PenLine, PiggyBank, Undo2 } from "lucide-react";

import type { QuestIconKind } from "@/lib/zentra/quests";
import { cn } from "@/lib/utils";
import { GitHub, LinkedIn, Telegram, XLogo } from "../SocialIcons";

const LUCIDE = {
  docs: BookOpen,
  supply: PiggyBank,
  borrow: HandCoins,
  repay: Undo2,
  swap: ArrowLeftRight,
  pen: PenLine,
  image: ImageIcon,
  book: BookText,
} as const;

export function QuestIcon({ kind, className }: { kind: QuestIconKind; className?: string }) {
  const inner = "size-[18px]";
  let icon;
  if (kind === "x") icon = <XLogo className="size-4" />;
  else if (kind === "telegram") icon = <Telegram className={inner} />;
  else if (kind === "linkedin") icon = <LinkedIn className={inner} />;
  else if (kind === "github") icon = <GitHub className={inner} />;
  else {
    const L = LUCIDE[kind];
    icon = <L className={inner} strokeWidth={1.75} />;
  }
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md border border-panel-border/80 bg-gradient-to-b from-lime/15 to-lime/5 text-lime",
        className,
      )}
      aria-hidden
    >
      {icon}
    </span>
  );
}
