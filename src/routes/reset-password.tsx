import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — FlowGuard" },
      { name: "description", content: "Choose a new password for your FlowGuard control console account." },
      { property: "og:title", content: "Set a new password — FlowGuard" },
      { property: "og:description", content: "Choose a new password for your FlowGuard account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="min-h-screen grid-bg flex items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-md glass-panel rounded-xl p-7 space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <label className="block text-xs text-muted-foreground" htmlFor="np">
          New password
        </label>
        <input
          id="np"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md bg-background/60 border border-border px-3 py-2 text-sm outline-none focus-visible:ring-2 ring-primary/50"
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          disabled={busy}
          className="w-full rounded-md bg-primary text-primary-foreground text-sm font-medium py-2.5 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </main>
  );
}
