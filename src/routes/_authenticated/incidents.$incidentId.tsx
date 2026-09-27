import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OrgGate } from "@/components/fg/OrgGate";
import { AmbientField } from "@/components/fg/AmbientField";
import { DemoTag, Panel } from "@/components/fg/ui";
import { Button } from "@/components/ui/button";
import { diagnoseIncident } from "@/lib/incident-diagnosis.functions";
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
type Ev = { id: string; action: string; risk_score: number; status: string; created_at: string; agent_id: string | null; workflow_id: string | null };
type Evidence = { id: string; source: string; evidence_type: string; confidence: number; captured_at: string };
type Recovery = { id: string; action: string; state: string; note: string | null };
type Audit = { id: string; action: string; detail: string | null; created_at: string };

function IncidentDetail({ m }: { m: Membership }) {
  const { incidentId } = useParams({ from: "/_authenticated/incidents/$incidentId" });
  const diagnose = useServerFn(diagnoseIncident);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [recovery, setRecovery] = useState<Recovery[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    let live = true;
    setDiagnosis(null);
    setDiagnosisError(null);
    setSelectedEvents([]);
    setSelectedEvidence([]);
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("incidents")
        .select("id,title,category,severity,status,summary,agent_id,workflow_id,created_at")
        .eq("id", incidentId)
        .eq("org_id", m.org_id)
        .maybeSingle();
      const inc = (data as Incident) ?? null;
      if (!live) return;
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
            .select("id,action,risk_score,status,created_at,agent_id,workflow_id")
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
        if (!live) return;
        setWorkflow((w.data as Workflow) ?? null);
        setAgent((a.data as Agent) ?? null);
        const all = (e.data as Ev[]) ?? [];
        const related = all.filter((event) =>
          (inc.agent_id && event.agent_id === inc.agent_id) ||
          (inc.workflow_id && event.workflow_id === inc.workflow_id),
        ).slice(0, 6);
        const items = (ev.data as Evidence[]) ?? [];
        setEvents(related);
        setSelectedEvents(related.map((event) => event.id));
        setEvidence(items);
        setSelectedEvidence(items.map((item) => item.id));
        setRecovery((r.data as Recovery[]) ?? []);
        setAudit((au.data as Audit[]) ?? []);
      }
      if (live) setLoading(false);
    })();
    return () => { live = false; };
  }, [incidentId, m.org_id]);

  async function analyze() {
    if (analyzing || !incident) return;
    setAnalyzing(true);
    setDiagnosisError(null);
    setDiagnosis(null);
    try {
      const result = await diagnose({ data: {
        orgId: m.org_id, incidentId: incident.id,
        eventIds: selectedEvents, evidenceIds: selectedEvidence, notes,
      } });
      setDiagnosis(result.text);
    } catch (error) {
      setDiagnosisError(error instanceof Error ? error.message : "Diagnosis unavailable. No action was taken.");
    } finally {
      setAnalyzing(false);
    }
  }

  function toggle(id: string, current: string[], update: (ids: string[]) => void) {
    update(current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setDiagnosis(null);
  }

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
      <header className="relative isolate min-h-48 overflow-hidden rounded-md glass-panel p-6 sm:min-h-52">
        <AmbientField variant="pulse" />
        <div className="relative z-10 max-w-2xl">
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
              {can.actOnIncidents(m.role) && <input type="checkbox" aria-label={`Include event: ${e.action}`} checked={selectedEvents.includes(e.id)} onChange={() => toggle(e.id, selectedEvents, setSelectedEvents)} className="accent-primary" />}
              <span className="truncate">{e.action}</span>
              <span className="ml-auto font-mono text-[11px] uppercase text-muted-foreground">{e.status}</span>
              <span className="font-mono text-xs tabular-nums">{e.risk_score}</span>
            </li>
          ))}
          {events.length === 0 && <li className="text-xs text-muted-foreground">No related events recorded.</li>}
        </ul>
      </Panel>

      <Panel className="p-5">
        <h2 className="text-sm font-medium">Evidence</h2>
        <ul className="mt-3 space-y-2">
          {evidence.map((x) => (
            <li key={x.id} className="flex items-center gap-3 text-sm">
              {can.actOnIncidents(m.role) && <input type="checkbox" aria-label={`Include evidence: ${x.source}`} checked={selectedEvidence.includes(x.id)} onChange={() => toggle(x.id, selectedEvidence, setSelectedEvidence)} className="accent-primary" />}
              <span className="truncate">{x.source}</span>
              <span className="ml-auto font-mono text-[11px] uppercase text-muted-foreground">{x.evidence_type}</span>
              <span className="font-mono text-xs tabular-nums">{x.confidence}%</span>
            </li>
          ))}
          {evidence.length === 0 && <li className="text-xs text-muted-foreground">No evidence captured.</li>}
        </ul>
      </Panel>

      {can.actOnIncidents(m.role) && (
        <section aria-labelledby="ai-diagnosis-heading" className="space-y-4 border-t border-border pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="ai-diagnosis-heading" className="text-lg font-semibold">AI diagnosis &amp; recovery plan</h2>
            <DemoTag />
          </div>
          <p className="text-sm text-muted-foreground">Selected events and evidence are analyzed on request. Recommendations require human review; nothing is executed.</p>
          <label htmlFor="operator-notes" className="block text-xs font-medium text-muted-foreground">Operator context (optional)</label>
          <textarea id="operator-notes" value={notes} maxLength={2000} onChange={(event) => { setNotes(event.target.value); setDiagnosis(null); }} rows={3} placeholder="Add observations relevant to this incident…" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={analyze} disabled={analyzing || (selectedEvents.length === 0 && selectedEvidence.length === 0)}>
              <Sparkles aria-hidden="true" />{analyzing ? "Analyzing…" : "Generate diagnosis"}
            </Button>
            <span className="text-xs text-muted-foreground">{selectedEvents.length} events · {selectedEvidence.length} evidence items selected · one AI request per click</span>
          </div>
          <div aria-live="polite" role="status">
            {analyzing && <p className="text-sm text-muted-foreground">Reviewing selected material…</p>}
            {diagnosisError && <p className="text-sm text-destructive">{diagnosisError}</p>}
            {diagnosis && <div className="border-l-2 border-primary bg-surface p-5"><h3 className="mb-3 text-sm font-medium">For human review · not executed</h3><p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{diagnosis}</p></div>}
          </div>
        </section>
      )}

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
