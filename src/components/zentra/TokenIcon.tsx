import logo from "@/assets/zentra-logo.png.asset.json";
import type { AssetIconKind } from "@/lib/zentra/types";
import { cn } from "@/lib/utils";

const GLYPHS: Record<Exclude<AssetIconKind, "znt">, React.ReactNode> = {
  cc: <path d="M15.5 8.6a5 5 0 1 0 0 6.8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />,
  eth: (
    <g fill="currentColor">
      <path d="M12 3.5 7 12l5 3 5-3-5-8.5Z" />
      <path d="m12 16.2-5-3 5 7.3 5-7.3-5 3Z" opacity=".75" />
    </g>
  ),
  bnb: (
    <g fill="currentColor">
      <path d="m12 5 2.2 2.2L12 9.4 9.8 7.2 12 5Zm0 9.6 2.2 2.2L12 19l-2.2-2.2L12 14.6ZM5 12l2.2-2.2L9.4 12l-2.2 2.2L5 12Zm9.6 0 2.2-2.2L19 12l-2.2 2.2-2.2-2.2ZM12 10l2 2-2 2-2-2 2-2Z" />
    </g>
  ),
  btc: (
    <text x="12" y="16.6" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">
      ₿
    </text>
  ),
  usdt: (
    <text x="12" y="16.8" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">
      ₮
    </text>
  ),
};

export function TokenIcon({ kind, className }: { kind: AssetIconKind; className?: string }) {
  if (kind === "znt") {
    return (
      <span className={cn("inline-grid size-6 shrink-0 place-items-center rounded-full bg-lime/15 ring-1 ring-lime/40", className)}>
        <img src={logo.url} alt="" className="size-[70%] object-contain" />
      </span>
    );
  }
  return (
    <span className={cn("inline-grid size-6 shrink-0 place-items-center rounded-full bg-lime text-primary-foreground", className)}>
      <svg viewBox="0 0 24 24" className="size-[78%]" aria-hidden>
        {GLYPHS[kind]}
      </svg>
    </span>
  );
}
