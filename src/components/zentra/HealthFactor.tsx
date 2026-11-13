import type { Decimal } from "@/lib/zentra/decimal";
import { fmt } from "@/lib/zentra/decimal";
import { healthBand } from "@/lib/zentra/risk";
import { cn } from "@/lib/utils";

const TONE = {
  none: "text-text-2",
  safe: "text-success",
  caution: "text-warning",
  danger: "text-destructive",
} as const;

export function HealthFactor({ value, className }: { value: Decimal | null; className?: string }) {
  const band = healthBand(value);
  return (
    <span className={cn("tabular font-medium", TONE[band], className)}>
      {value === null ? "∞" : value.gt(99) ? ">99" : fmt(value, 2)}
    </span>
  );
}
