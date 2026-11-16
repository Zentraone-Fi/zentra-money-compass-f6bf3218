import { Link } from "@tanstack/react-router";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useZentra } from "@/lib/zentra/store";
import { Logo } from "./Logo";
import { SimBadge } from "./Panel";

const NAV = [
  { to: "/", label: "Dashboard", exact: true },
  { to: "/markets", label: "Markets", exact: false },
  { to: "/stake", label: "Stake", exact: false },
  { to: "/swap", label: "Swap", exact: false },
  { to: "/quests", label: "Quests", exact: false },
  { to: "/docs", label: "Docs", exact: false },
] as const;

function WalletButton() {
  const { session, setConnectOpen, disconnect } = useZentra();
  if (!session) {
    return (
      <Button variant="wallet" size="xl" onClick={() => setConnectOpen(true)}>
        Connect Wallet
      </Button>
    );
  }
  const short = `${session.partyId.slice(0, 12)}…${session.partyId.slice(-4)}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="wallet" size="xl" className="gap-2 px-4">
          <span className="size-2 rounded-full bg-success" aria-hidden />
          <span className="tabular text-sm">{short}</span>
          <ChevronDown className="size-4 text-text-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border-panel-border bg-popover">
        <DropdownMenuLabel className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            {session.label} {session.simulated && <SimBadge />}
          </div>
          <div className="break-all text-xs font-normal text-text-2">{session.partyId}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => disconnect()}>
          <LogOut className="size-4" /> Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-[84px] max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-12 lg:gap-20">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.exact }}
                className="relative py-1.5 text-[1.05rem] font-medium text-foreground/90 transition-colors hover:text-foreground data-[status=active]:text-foreground data-[status=active]:after:absolute data-[status=active]:after:inset-x-0 data-[status=active]:after:-bottom-0.5 data-[status=active]:after:h-px data-[status=active]:after:bg-lime"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-panel-border bg-surface">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="mt-4 flex flex-col gap-1 px-4">
                {NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    activeOptions={{ exact: n.exact }}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-medium text-text-2 hover:bg-accent data-[status=active]:bg-lime/10 data-[status=active]:text-lime"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 px-4 sm:hidden">
                <WalletButton />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
