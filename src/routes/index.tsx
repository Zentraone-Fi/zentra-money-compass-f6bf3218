import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ActionDialog, type LendingAction } from "@/components/zentra/ActionDialog";
import { ActivityPanel } from "@/components/zentra/dashboard/ActivityPanel";
import { BorrowAssetsPanel, SupplyAssetsPanel } from "@/components/zentra/dashboard/AssetPanels";
import { PortfolioOverview } from "@/components/zentra/dashboard/PortfolioOverview";
import { YourBorrowPanel, YourSupplyPanel } from "@/components/zentra/dashboard/PositionPanels";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ZENTRA Finance" },
      { name: "description", content: "Supply, borrow and manage your positions on ZENTRA, the lending protocol built for Canton Network." },
      { property: "og:title", content: "Dashboard — ZENTRA Finance" },
      { property: "og:description", content: "Supply, borrow and manage your positions on ZENTRA, built for Canton Network." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [dialog, setDialog] = useState<{ action: LendingAction; assetId: string } | null>(null);
  const open = (action: LendingAction, assetId: string) => setDialog({ action, assetId });
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 pt-6 sm:px-6">
      <h1 className="sr-only">ZENTRA dashboard</h1>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <YourSupplyPanel onAction={open} />
        <YourBorrowPanel onAction={open} />
        <SupplyAssetsPanel onAction={open} />
        <BorrowAssetsPanel onAction={open} />
      </div>
      <div className="mt-8 space-y-8">
        <PortfolioOverview />
        <ActivityPanel />
      </div>
      <ActionDialog action={dialog?.action ?? null} assetId={dialog?.assetId ?? null} onClose={() => setDialog(null)} />
    </div>
  );
}
