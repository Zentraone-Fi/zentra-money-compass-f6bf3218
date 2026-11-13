import { ArrowDownUp, HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useZentra } from "@/lib/zentra/store";
import { cn } from "@/lib/utils";

export function ColHead({ children, sortable, active, onClick, className }: {
  children: ReactNode;
  sortable?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  if (!sortable) return <div className={cn("text-[13px] text-text-2", className)}>{children}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex items-center gap-1 text-left text-[13px] text-text-2 hover:text-foreground", active && "text-foreground", className)}
    >
      {children}
      <ArrowDownUp className="size-3" aria-hidden />
    </button>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={text} className="text-text-2 hover:text-foreground">
            <HelpCircle className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-56 text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ConnectEmpty({ message }: { message: string }) {
  const { setConnectOpen } = useZentra();
  return (
    <div className="panel-row flex flex-col items-center justify-between gap-3 px-4 py-4 text-center sm:flex-row sm:text-left">
      <p className="text-sm text-text-2">{message}</p>
      <Button variant="action" size="sm" className="px-6" onClick={() => setConnectOpen(true)}>
        Connect Wallet
      </Button>
    </div>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <div className="panel-row px-4 py-4 text-center text-sm text-text-2">{children}</div>;
}
