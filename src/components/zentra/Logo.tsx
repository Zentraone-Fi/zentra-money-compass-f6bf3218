import { Link } from "@tanstack/react-router";

import logo from "@/assets/zentra-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return <img src={logo.url} alt="" aria-hidden className={cn("h-9 w-9 object-contain", className)} />;
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="ZENTRA home">
      <LogoMark />
      <span className="text-lg font-bold tracking-[0.08em] text-foreground">ZENTRA</span>
    </Link>
  );
}
