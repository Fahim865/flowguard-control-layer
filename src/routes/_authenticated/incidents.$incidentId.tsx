import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrgGate } from "@/components/fg/OrgGate";
import { AmbientField } from "@/components/fg/AmbientField";
import { DemoTag, Panel } from "@/components/fg/ui";
import { can, type Membership } from "@/lib/useOrg";

export const Route = createFileRoute("/_authenticated/incidents/$incidentId")({
  head: () => ({
    meta: [
      { title: "Incident detail — FlowGuard" },
      { name: "description", content: "Review the workflow, agent events, evidence, recovery recommendations and audit history behind an incident." },
      { property: "og:title", content: "Incident detail — FlowGuard" },
      { property: "og:description", content: "Workflow, events, evidence, recovery and audit history for one incident." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <OrgGate>{(m) => <IncidentDetail m={m} />}</OrgGate>,
});

type Incident = {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  summary: string | null;
  agent_id: string | null;
  workflow_id: string | null;
  created_at: string;
};
type Workflow = { id: string; name: string; status: string; description: string | null };
type Agent = { id: string; name: string; status: string; risk_score: number };
type Ev = { id: string; action: string; risk_score: number; status: string; created_at: string };
type Evidence = { id: string; source: string; evidence_type: string; confidence: number; captured_at: string };
type Recovery = { id: string; action: string; state: string; note: string | null };
type Audit = { id: string; action: string; detail: string | null; created_at: string };

function IncidentDetail({ m }: { m: Membership }) {
  const { incidentId } = useParams({ from: "/_authenticated/incidents/$incidentId" });
  const [incident, setIncident] = useState<Incident | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [recovery, setRecovery] = useState<Recovery[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("incidents")
        .select("id,title,category,severity,status,summary,agent_id,workflow_id,created_at")
        .eq("id", incidentId)
        .eq("org_id", m.org_id)
        .maybeSingle();
      const inc = (data as Incident) ?? null;
      setIncident(inc);
      if (inc) {
        const [w, a, e, ev, r, au] = await Promise.all([
          inc.workflow_id
            ? supabase.from("workflows").select("id,name,status,description").eq("id", inc.workflow_id).eq("org_id", m.org_id).maybeSingle()
            : Promise.resolve({ data: null }),
          inc.agent_id
            ? supabase.from("agents").select("id,name,status,risk_score").eq("id", inc.agent_id).eq("org_id", m.org_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("agent_events")
            .select("id,action,risk_score,status,created_at")
            .eq("org_id", m.org_id)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("evidence_items")
            .select("id,source,evidence_type,confidence,captured_at")
            .eq("org_id", m.org_id)
            .eq("incident_id", inc.id)
            .order("captured_at"),
          supabase.from("recovery_actions").select("id,action,state,note").eq("org_id", m.org_id).eq("incident_id", inc.id),
          supabase
            .from("audit_logs")
            .select("id,action,detail,created_at")
            .eq("org_id", m.org_id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);
        setWorkflow((w.data as Workflow) ?? null);
        setAgent((a.data as Agent) ?? null);
        const all = (e.data as Ev[]) ?? [];
        setEvents(all.slice(0, 6));
        setEvidence((ev.data as Evidence[]) ?? []);
        setRecovery((r.data as Recovery[]) ?? []);
        setAudit((au.data as Audit[]) ?? []);
      }
      setLoading(false);
    })();
  }, [incidentId, m.org_id]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading incident…</p>;
  if (!incident)
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">This incident is not available in the current organization.</p>
        <Link to="/dashboard" className="text-sm text-primary underline">
          Back to dashboard
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-xl glass-panel p-6">
        <AmbientField variant="pulse" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/dashboard" className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
              ← Dashboard
            </Link>
            <DemoTag className="ml-auto" />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">{incident.title}</h1>
          <p className="mt-1 font-mono text-[11px] uppercase text-muted-foreground">
            {incident.category} · {incident.severity} · {incident.status} · {new Date(incident.created_at).toLocaleString()}
          </p>
          {incident.summary && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{incident.summary}</p>}
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-sm font-medium">Related workflow</h2>
          {workflow ? (
            <div className="mt-2 text-sm">
              <p className="font-medium">{workflow.name}</p>
              <p className="font-mono text-[11px] uppercase text-muted-foreground">{workflow.status}</p>
              {workflow.description && <p className="mt-1 text-muted-foreground">{workflow.description}</p>}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No workflow linked.</p>
          )}
        </Panel>

        <Panel className="p-5">
          <h2 className="text-sm font-medium">Responsible agent</h2>
          {agent ? (
            <div className="mt-2 text-sm">
              <p className="font-medium">{agent.name}</p>
              <p className="font-mono text-[11px] uppercase text-muted-foreground">
                {agent.status} · risk {agent.risk_score}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No agent linked.</p>
          )}
        </Panel>
      </section>

      <Panel className="p-5">
        <h2 className="text-sm font-medium">Agent events</h2>
        <ul className="mt-3 space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-3 text-sm">
              <span className="truncate">{e.action}</span>
              <span className="ml-auto font-mono text-[11px] uppercase text-muted-foreground">{e.status}</span>
              <span className="font-mono text-xs tabular-nums">{e.risk_score}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="p-5">
        <h2 className="text-sm font-medium">Evidence</h2>
        <ul className="mt-3 space-y-2">
          {evidence.map((x) => (
            <li key={x.id} className="flex items-center gap-3 text-sm">
              <span className="truncate">{x.source}</span>
              <span className="ml-auto font-mono text-[11px] uppercase text-muted-foreground">{x.evidence_type}</span>
              <span className="font-mono text-xs tabular-nums">{x.confidence}%</span>
            </li>
          ))}
          {evidence.length === 0 && <li className="text-xs text-muted-foreground">No evidence captured.</li>}
        </ul>
      </Panel>

      <Panel className="p-5">
        <h2 className="text-sm font-medium">Recovery recommendations</h2>
        <ul className="mt-3 space-y-2">
          {recovery.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 text-sm">
              <span>{r.action}</span>
              <span className="font-mono text-[11px] uppercase text-muted-foreground">{r.state} · recommendation only</span>
              {can.actOnIncidents(m.role) && (
                <button
                  onClick={() => window.alert("Recovery execution arrives in a later phase — recommendation only.")}
                  className="ml-auto rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-foreground/5"
                >
                  Review
                </button>
              )}
            </li>
          ))}
          {recovery.length === 0 && <li className="text-xs text-muted-foreground">No recommendations yet.</li>}
        </ul>
      </Panel>

      {can.viewAudit(m.role) && (
        <Panel className="p-5">
          <h2 className="text-sm font-medium">Organization audit history</h2>
          <ul className="mt-3 space-y-2">
            {audit.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="font-mono text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                <span className="font-mono text-[11px] uppercase">{a.action}</span>
                <span className="truncate text-muted-foreground">{a.detail}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
