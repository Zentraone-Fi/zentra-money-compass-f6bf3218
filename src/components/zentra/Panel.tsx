import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel min-w-0 p-4 sm:p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          {title && <h2 className="text-xl font-medium tracking-tight sm:text-[1.4rem]">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function SearchField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex h-9 w-full max-w-[180px] items-center gap-2 rounded-full border border-panel-border bg-field px-4 text-sm focus-within:border-lime/60">
      <Search className="size-4 shrink-0 text-foreground" aria-hidden />
      <span className="sr-only">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search ..."
        className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </label>
  );
}

export function SimBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning",
        className,
      )}
    >
      Simulated
    </span>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="panel-row px-4 py-3">
      <div className="text-xs text-text-2">{label}</div>
      <div className="mt-1 text-lg font-medium tabular">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
