import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — FlowGuard Control" },
      { name: "description", content: "Sign in or create a FlowGuard account to access the AI workflow control console." },
      { property: "og:title", content: "Sign in — FlowGuard Control" },
      { property: "og:description", content: "Access the FlowGuard AI workflow control console." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        setMsg("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setMsg("Password reset link sent. Check your inbox.");
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      setErr("Google sign-in is unavailable right now.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="min-h-screen grid-bg flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md glass-panel rounded-xl p-7">
        <Link to="/" className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground hover:text-foreground">
          ← FLOWGUARD
        </Link>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          {mode === "login" ? "Sign in" : mode === "signup" ? "Create your account" : "Reset password"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mode === "forgot"
            ? "We'll email you a link to set a new password."
            : "Access the FlowGuard control console."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-xs text-muted-foreground" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-background/60 border border-border px-3 py-2 text-sm outline-none focus-visible:ring-2 ring-primary/50"
          />
          {mode !== "forgot" && (
            <>
              <label className="block text-xs text-muted-foreground" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md bg-background/60 border border-border px-3 py-2 text-sm outline-none focus-visible:ring-2 ring-primary/50"
              />
            </>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}
          {msg && <p className="text-sm text-primary">{msg}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary text-primary-foreground text-sm font-medium py-2.5 transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "Working…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </button>
        </form>

        {mode !== "forgot" && (
          <button
            onClick={google}
            className="mt-3 w-full rounded-md border border-border text-sm py-2.5 transition hover:bg-foreground/5"
          >
            Continue with Google
          </button>
        )}

        <div className="mt-5 flex justify-between text-xs text-muted-foreground">
          {mode === "login" ? (
            <>
              <button onClick={() => setMode("signup")} className="hover:text-foreground">
                Create an account
              </button>
              <button onClick={() => setMode("forgot")} className="hover:text-foreground">
                Forgot password?
              </button>
            </>
          ) : (
            <button onClick={() => setMode("login")} className="hover:text-foreground">
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
