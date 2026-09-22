import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg, type Membership } from "@/lib/useOrg";

/** Renders children with the active membership, an org switcher, or a creation card. */
export function OrgGate({ children }: { children: (m: Membership) => ReactNode }) {
  const { loading, membership, memberships, setActiveOrg, reload } = useOrg();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("organizations").insert({ name });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setName("");
    await reload();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!membership) {
    return (
      <form onSubmit={create} className="max-w-md glass-panel rounded-xl p-6 space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Create your organization</h1>
        <p className="text-sm text-muted-foreground">
          Your workspace starts with clearly labelled demo data so you can explore the control console.
        </p>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Inc."
          className="w-full rounded-md bg-background/60 border border-border px-3 py-2 text-sm outline-none focus-visible:ring-2 ring-primary/50"
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          disabled={busy}
          className="rounded-md bg-primary text-primary-foreground text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create organization"}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="org-switcher" className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Organization
        </label>
        <select
          id="org-switcher"
          value={membership.org_id}
          onChange={(e) => setActiveOrg(e.target.value)}
          className="rounded-md bg-background/60 border border-border px-2 py-1 text-xs outline-none focus-visible:ring-2 ring-primary/50"
        >
          {memberships.map((x) => (
            <option key={x.org_id} value={x.org_id}>
              {x.organizations?.name ?? x.org_id.slice(0, 8)} · {x.role}
            </option>
          ))}
        </select>
      </div>
      <div key={membership.org_id}>{children(membership)}</div>
    </div>
  );
}
