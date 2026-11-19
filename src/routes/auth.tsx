import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/zentra/auth/GoogleButton";
import { Logo } from "@/components/zentra/Logo";
import { safeNext, takeNext, useAccount } from "@/hooks/use-account";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } =>
    typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {},
  head: () => ({
    meta: [
      { title: "Sign in — ZENTRA Finance" },
      { name: "description", content: "Sign in to your ZENTRA account to keep your quest XP and rank on every device." },
      { property: "og:title", content: "Sign in to ZENTRA" },
      { property: "og:description", content: "Keep your ZENTRA quest XP, linked accounts and rank on every device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function Field({ id, label, ...props }: { id: string; label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-text-2">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="quest-field mt-1.5 h-10 w-full px-3 text-sm placeholder:text-muted-foreground focus:border-lime/60 focus:outline-none"
      />
    </div>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const next = safeNext(search.redirect);
  const navigate = useNavigate();
  const { user, ready } = useAccount();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "confirm" | "reset">(null);

  // Signed in (including after the Google round-trip): continue to where the user was going.
  useEffect(() => {
    if (ready && user) void navigate({ to: takeNext() ?? next, replace: true });
  }, [ready, user, next, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        toast.success("Signed in");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) setSent("confirm");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
      }
    } catch (err) {
      toast.error(mode === "signup" ? "Couldn't create account" : mode === "signin" ? "Couldn't sign in" : "Couldn't send reset link", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const nameOk = mode !== "signup" || (name.trim().length >= 2 && name.trim().length <= 32);
  const canSubmit = /.+@.+\..+/.test(email.trim()) && (mode === "forgot" || password.length >= 8) && nameOk;

  return (
    <div className="relative">
      <div className="bg-dots pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col px-4 pb-16 pt-10">
        <div className="quest-panel p-6">
          <Logo />
          {sent ? (
            <div className="mt-6 text-center">
              <MailCheck className="mx-auto size-8 text-lime" />
              <h1 className="mt-3 text-lg font-medium">Check your email</h1>
              <p className="mt-2 text-sm text-text-2">
                {sent === "confirm"
                  ? `We sent a confirmation link to ${email.trim()}. Open it to activate your account, then sign in.`
                  : `If ${email.trim()} has an account, a password reset link is on its way.`}
              </p>
              <Button variant="outline" className="mt-5 w-full" onClick={() => (setSent(null), setMode("signin"))}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="mt-6 text-xl font-medium tracking-tight">
                {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Sign in to ZENTRA"}
              </h1>
              <p className="mt-1 text-[13px] text-text-2">
                {mode === "forgot" ? "We'll email you a link to set a new password." : "Your quest XP, linked accounts and rank stay with your account on every device."}
              </p>

              {mode !== "forgot" && (
                <>
                  <GoogleButton next={next} className="mt-5 w-full" />
                  <div className="my-4 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="h-px flex-1 bg-panel-border" /> or with email <span className="h-px flex-1 bg-panel-border" />
                  </div>
                </>
              )}

              <form onSubmit={submit} className={cn("space-y-3", mode === "forgot" && "mt-5")}>
                {mode === "signup" && (
                  <Field id="auth-name" label="Display name (shown on the leaderboard)" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} autoComplete="nickname" />
                )}
                <Field id="auth-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                {mode !== "forgot" && (
                  <Field
                    id="auth-password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    placeholder={mode === "signup" ? "At least 8 characters" : undefined}
                  />
                )}
                {mode === "signin" && (
                  <button type="button" className="text-xs text-text-2 hover:text-lime" onClick={() => setMode("forgot")}>
                    Forgot password?
                  </button>
                )}
                <Button type="submit" variant="action" className="h-10 w-full rounded-md" disabled={!canSubmit || busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-text-2">
                {mode === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <button type="button" className="font-semibold text-foreground hover:text-lime" onClick={() => setMode("signin")}>
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    {mode === "forgot" ? "Remembered it? " : "New to ZENTRA? "}
                    <button
                      type="button"
                      className="font-semibold text-foreground hover:text-lime"
                      onClick={() => setMode(mode === "forgot" ? "signin" : "signup")}
                    >
                      {mode === "forgot" ? "Sign in" : "Create an account"}
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
