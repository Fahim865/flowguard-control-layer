import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrgGate } from "@/components/fg/OrgGate";
import { AmbientField } from "@/components/fg/AmbientField";
import { DemoTag, Panel } from "@/components/fg/ui";
import { can, type Membership, type Role } from "@/lib/useOrg";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team & roles — FlowGuard" },
      { name: "description", content: "Manage organization members, invitations and least-privilege roles across the FlowGuard console." },
      { property: "og:title", content: "Team & roles — FlowGuard" },
      { property: "og:description", content: "Manage members, invitations and least-privilege roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <OrgGate>{(m) => <Team m={m} />}</OrgGate>,
});

const ROLES: Role[] = ["owner", "admin", "analyst", "viewer"];

type Member = { id: string; email: string | null; role: Role; user_id: string };
type Invite = {
  id: string;
  email: string;
  role: Role;
  token: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
};

function Team({ m }: { m: Membership }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [msg, setMsg] = useState<string | null>(null);
  const editable = can.manageMembers(m.role);

  async function load() {
    const [mem, inv] = await Promise.all([
      supabase.from("organization_members").select("id,email,role,user_id").eq("org_id", m.org_id).order("created_at"),
      supabase
        .from("organization_invitations")
        .select("id,email,role,token,status,created_at,accepted_at")
        .eq("org_id", m.org_id)
        .order("created_at", { ascending: false }),
    ]);
    setMembers((mem.data as Member[]) ?? []);
    setInvites((inv.data as Invite[]) ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.org_id]);

  async function setMemberRole(id: string, next: Role) {
    await supabase.from("organization_members").update({ role: next }).eq("id", id).eq("org_id", m.org_id);
    await load();
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("organization_invitations")
      .insert({ org_id: m.org_id, email: email.trim().toLowerCase(), role, invited_by: auth.user?.id ?? null });
    if (error) {
      setMsg(error.message);
      return;
    }
    await supabase.from("audit_logs").insert({
      org_id: m.org_id,
      actor_id: auth.user?.id ?? null,
      action: "invitation.created",
      detail: `${email} invited as ${role}`,
    });
    setEmail("");
    setMsg("Invitation created. Copy the acceptance link and share it — demo mode does not send email.");
    await load();
  }

  async function revoke(id: string) {
    await supabase.from("organization_invitations").update({ status: "revoked" }).eq("id", id).eq("org_id", m.org_id);
    await load();
  }

  function copyLink(token: string) {
    void navigator.clipboard?.writeText(`${window.location.origin}/invite/${token}`);
    setMsg("Acceptance link copied.");
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-xl glass-panel p-6">
        <AmbientField variant="orbit" />
        <div className="relative flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
            <p className="text-sm text-muted-foreground">
              Owner and Admin manage members, policies and keys. Analyst can act on incidents. Viewer is read-only.
            </p>
          </div>
          <DemoTag className="ml-auto" />
        </div>
      </header>

      <Panel className="p-5">
        <h2 className="text-sm font-medium">Members</h2>
        <ul className="mt-3 space-y-3">
          {members.map((x) => (
            <li key={x.id} className="flex items-center gap-3 text-sm">
              <span className="truncate">{x.email ?? x.user_id.slice(0, 8)}</span>
              {editable ? (
                <select
                  aria-label={`Role for ${x.email ?? "member"}`}
                  value={x.role}
                  onChange={(e) => setMemberRole(x.id, e.target.value as Role)}
                  className="ml-auto rounded-md bg-background/60 border border-border px-2 py-1 text-xs"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="ml-auto font-mono text-[11px] uppercase text-muted-foreground">{x.role}</span>
              )}
            </li>
          ))}
        </ul>
        {!editable && (
          <p className="mt-4 text-xs text-muted-foreground">Your role does not allow changing team membership.</p>
        )}
      </Panel>

      <Panel className="p-5">
        <h2 className="text-sm font-medium">Invitations</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Demo mode: no email is sent. Share the secure acceptance link with the invited person — it only works for
          their email address.
        </p>

        {editable && (
          <form onSubmit={invite} className="mt-4 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="invite-email">
              Invite email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="flex-1 min-w-[14rem] rounded-md bg-background/60 border border-border px-3 py-2 text-sm outline-none focus-visible:ring-2 ring-primary/50"
            />
            <label className="sr-only" htmlFor="invite-role">
              Invite role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-md bg-background/60 border border-border px-2 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium transition active:scale-[0.99]">
              Send invite
            </button>
          </form>
        )}

        {msg && <p className="mt-3 text-xs text-muted-foreground">{msg}</p>}

        <ul className="mt-4 space-y-2">
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="truncate">{i.email}</span>
              <span className="font-mono text-[11px] uppercase text-muted-foreground">{i.role}</span>
              <span
                className={`ml-auto rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  i.status === "accepted"
                    ? "border-primary/40 text-primary"
                    : i.status === "revoked"
                      ? "border-border text-muted-foreground"
                      : "border-warning/40 text-warning"
                }`}
              >
                {i.status}
              </span>
              {i.status === "pending" && editable && (
                <>
                  <button
                    onClick={() => copyLink(i.token)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-foreground/5"
                  >
                    Copy link
                  </button>
                  <button
                    onClick={() => revoke(i.id)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-foreground/5"
                  >
                    Revoke
                  </button>
                </>
              )}
            </li>
          ))}
          {invites.length === 0 && <li className="text-xs text-muted-foreground">No invitations yet.</li>}
        </ul>
      </Panel>
    </div>
  );
}
