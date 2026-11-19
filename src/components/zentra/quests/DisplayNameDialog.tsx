import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DisplayNameDialog({
  open,
  current,
  onClose,
  onSave,
}: {
  open: boolean;
  current: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setName(current);
  }, [open, current]);
  const clean = name.trim();
  const valid = clean.length >= 2 && clean.length <= 32 && clean !== current;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="quest-panel max-w-sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!valid) return;
            setBusy(true);
            try {
              await onSave(clean);
            } finally {
              setBusy(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-medium">Leaderboard name</DialogTitle>
            <DialogDescription className="text-xs text-text-2">This is the name other explorers see next to your XP.</DialogDescription>
          </DialogHeader>
          <label htmlFor="display-name" className="mt-4 block text-xs text-text-2">
            Display name
          </label>
          <input
            id="display-name"
            autoFocus
            maxLength={32}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="quest-field mt-1.5 h-10 w-full px-3 text-sm focus:border-lime/60 focus:outline-none"
          />
          {name && clean.length < 2 && <p className="mt-1.5 text-xs text-destructive">At least 2 characters.</p>}
          <Button type="submit" variant="action" className="mt-5 h-9 w-full rounded-md" disabled={!valid || busy}>
            {busy && <Loader2 className="animate-spin" />} Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
