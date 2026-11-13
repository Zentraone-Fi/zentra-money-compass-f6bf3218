import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 pt-6">
      <div>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-text-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">{children}</div>;
}
