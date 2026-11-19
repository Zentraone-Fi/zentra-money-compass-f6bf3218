import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/zentra/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — ZENTRA Finance" },
      { name: "description", content: "Choose a new password for your ZENTRA account." },
      { property: "og:title", content: "Set a new ZENTRA password" },
      { property: "og:description", content: "Choose a new password for your ZENTRA account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setRecovery(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    const t = setTimeout(() => setRecovery((r) => r ?? false), 2500);
    return () => {
      clearTimeout(t);
      data.subscription.unsubscribe();
    };
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Couldn't update password", { description: error.message });
      return;
    }
    toast.success("Password updated");
    void navigate({ to: "/quests", replace: true });
  };

  const ok = password.length >= 8 && password === confirm;
  return (
    <div className="mx-auto w-full max-w-[400px] px-4 pb-16 pt-10">
      <div className="quest-panel p-6">
        <Logo />
        <h1 className="mt-6 text-xl font-medium tracking-tight">Set a new password</h1>
        {recovery === false ? (
          <p className="mt-2 text-sm text-text-2">This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
        ) : (
          <form onSubmit={save} className="mt-5 space-y-3">
            {(["New password", "Confirm password"] as const).map((label, i) => (
              <div key={label}>
                <label htmlFor={`pw-${i}`} className="block text-xs text-text-2">
                  {label}
                </label>
                <input
                  id={`pw-${i}`}
                  type="password"
                  autoComplete="new-password"
                  value={i === 0 ? password : confirm}
                  onChange={(e) => (i === 0 ? setPassword(e.target.value) : setConfirm(e.target.value))}
                  className="quest-field mt-1.5 h-10 w-full px-3 text-sm focus:border-lime/60 focus:outline-none"
                />
              </div>
            ))}
            {confirm && password !== confirm && <p className="text-xs text-destructive">Passwords don't match.</p>}
            <Button type="submit" variant="action" className="h-10 w-full rounded-md" disabled={!ok || busy || !recovery}>
              {busy && <Loader2 className="animate-spin" />} Save password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
