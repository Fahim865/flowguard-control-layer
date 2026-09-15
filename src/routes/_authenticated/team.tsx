import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrgGate } from "@/components/fg/OrgGate";
import { Panel } from "@/components/fg/ui";
import { can, type Membership, type Role } from "@/lib/useOrg";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team & roles — FlowGuard" },
      { name: "description", content: "Manage organization members and least-privilege roles across the FlowGuard console." },
      { property: "og:title", content: "Team & roles — FlowGuard" },
      { property: "og:description", content: "Manage members and least-privilege roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <OrgGate>{(m) => <Team m={m} />}</OrgGate>,
});

const ROLES: Role[] = ["owner", "admin", "analyst", "viewer"];

type Member = { id: string; email: string | null; role: Role; user_id: string };

function Team({ m }: { m: Membership }) {
  const [members, setMembers] = useState<Member[]>([]);
  const editable = can.manageMembers(m.role);

  async function load() {
    const { data } = await supabase.from("organization_members").select("id,email,role,user_id").order("created_at");
    setMembers((data as Member[]) ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setRole(id: string, role: Role) {
    await supabase.from("organization_members").update({ role }).eq("id", id);
    await load();
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Owner and Admin manage members, policies and keys. Analyst can act on incidents. Viewer is read-only.
        </p>
      </header>

      <Panel className="p-5">
        <ul className="space-y-3">
          {members.map((x) => (
            <li key={x.id} className="flex items-center gap-3 text-sm">
              <span className="truncate">{x.email ?? x.user_id.slice(0, 8)}</span>
              {editable ? (
                <select
                  aria-label={`Role for ${x.email ?? "member"}`}
                  value={x.role}
                  onChange={(e) => setRole(x.id, e.target.value as Role)}
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
    </div>
  );
}
