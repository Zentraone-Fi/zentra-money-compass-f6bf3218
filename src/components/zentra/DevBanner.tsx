import { FlaskConical } from "lucide-react";

import { IS_SIMULATED } from "@/lib/zentra/env";

export function DevBanner() {
  if (!IS_SIMULATED) return null;
  return (
    <div className="border-b border-warning/25 bg-warning/[0.07] text-warning">
      <p className="mx-auto flex max-w-[1120px] items-center justify-center gap-2 px-4 py-1.5 text-center text-xs">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        Development mode — markets, prices and positions are simulated. Not connected to Canton Network.
      </p>
    </div>
  );
}
