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
type EvidenceDraft = { id: string | null; source: string; evidence_type: string; confidence: number };
const blankEvidence: EvidenceDraft = { id: null, source: "", evidence_type: "log", confidence: 80 };
type ReviewStatus = "accepted" | "rejected" | "resolved";
type Review = { status: ReviewStatus; note: string; saved: boolean };
type Step = { section: string; n: string; text: string };

function parseSteps(text: string | null): Step[] {
  if (!text) return [];
  const out: Step[] = [];
  let section = "Diagnosis";
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const head = line.replace(/[*#:]/g, "").trim().toLowerCase();
    if (head === "diagnosis") section = "Diagnosis";
    else if (head === "recovery plan") section = "Recovery plan";
    else if (head === "evidence gaps") section = "Evidence gaps";
    const match = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (match && section !== "Evidence gaps") out.push({ section, n: match[1] ?? "", text: match[2] ?? "" });
  }
  return out;
}

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
  const [reviews, setReviews] = useState<Record<number, Review>>({});

  useEffect(() => { setReviews({}); }, [diagnosis]);

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
            .like("detail", `Incident ${inc.id}%`)
            .order("created_at", { ascending: false })
            .limit(50),
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

  const steps = parseSteps(diagnosis);
  function setReview(i: number, patch: Partial<Review>) {
    setReviews((prev) => ({ ...prev, [i]: { status: "accepted", note: "", saved: false, ...prev[i], ...patch } }));
  }

  async function recordReview(i: number) {
    if (!incident) return;
    const r = reviews[i] ?? { status: "accepted" as ReviewStatus, note: "", saved: false };
    const { data: auth } = await supabase.auth.getUser();
    const step = steps[i]; if (!step) return;
    const meta = auth.user?.user_metadata ?? {};
    const reviewer = (meta["full_name"] || meta["name"] || auth.user?.email || "unknown reviewer") as string;
    const detail = `Incident ${incident.id} · ${step.section} step ${step.n}: ${r.status.toUpperCase()} by ${reviewer} at ${new Date().toISOString()}${r.note.trim() ? ` — ${r.note.trim()}` : ""}`.slice(0, 1000);
    const { data: row, error } = await supabase.from("audit_logs")
      .insert({ org_id: m.org_id, actor_id: auth.user?.id ?? null, action: "ai_review", detail })
      .select("id,action,detail,created_at").single();
    if (error) { window.alert("Could not record review."); return; }
    setReview(i, { saved: true });
    setAudit((prev) => [row as Audit, ...prev].slice(0, 10));
  }

  async function refreshAudit() {
    if (!incident) return;
    const { data } = await supabase.from("audit_logs").select("id,action,detail,created_at")
      .eq("org_id", m.org_id).like("detail", `Incident ${incident.id}%`)
      .order("created_at", { ascending: false }).limit(50);
    setAudit((data as Audit[]) ?? []);
  }

  async function reloadEvidence() {
    if (!incident) return;
    const { data } = await supabase.from("evidence_items").select("id,source,evidence_type,confidence,captured_at")
      .eq("org_id", m.org_id).eq("incident_id", incident.id).order("captured_at");
    setEvidence((data as Evidence[]) ?? []);
    await refreshAudit();
  }

  async function saveEvidence() {
    if (!incident || !editing.source.trim()) return;
    const row = { source: editing.source.trim(), evidence_type: editing.evidence_type, confidence: editing.confidence };
    if (editing.id) {
      const { error } = await supabase.from("evidence_items").update(row).eq("id", editing.id).eq("org_id", m.org_id);
      if (error) { window.alert("Could not update evidence."); return; }
    } else {
      const { data, error } = await supabase.from("evidence_items")
        .insert({ ...row, org_id: m.org_id, incident_id: incident.id, agent_id: incident.agent_id }).select("id").single();
      if (error) { window.alert("Could not add evidence."); return; }
      setSelectedEvidence((s) => [...s, data.id]);
    }
    setEditing(blankEvidence);
    setDiagnosis(null);
    await reloadEvidence();
  }

  async function removeEvidence(id: string) {
    if (!window.confirm("Remove this evidence item? This is recorded in the audit timeline.")) return;
    const { error } = await supabase.from("evidence_items").delete().eq("id", id).eq("org_id", m.org_id);
    if (error) { window.alert("Could not remove evidence."); return; }
    setSelectedEvidence((s) => s.filter((x) => x !== id));
    setDiagnosis(null);
    await reloadEvidence();
  }

  async function changeStatus(status: string) {
    if (!incident || status === incident.status) return;
    const { error } = await supabase.from("incidents").update({ status }).eq("id", incident.id).eq("org_id", m.org_id);
    if (error) { window.alert("Could not update status."); return; }
    setIncident({ ...incident, status });
    const { data } = await supabase.from("audit_logs").select("id,action,detail,created_at")
      .eq("org_id", m.org_id).like("detail", `Incident ${incident.id}%`)
      .order("created_at", { ascending: false }).limit(50);
    setAudit((data as Audit[]) ?? []);
  }

  async function exportPdf() {
    if (!incident || !diagnosis) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth() - 96;
    let y = 56;
    const write = (text: string, size = 10, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      for (const line of doc.splitTextToSize(text.replace(/[^\x20-\x7E\n]/g, "-"), W) as string[]) {
        if (y > 790) { doc.addPage(); y = 56; }
        doc.text(line, 48, y);
        y += size * 1.45;
      }
      y += 4;
    };
    write("FlowGuard incident report", 18, true);
    write(`${incident.title} | ${incident.category} | ${incident.severity} | ${incident.status}`, 10);
    write(`Generated ${new Date().toLocaleString()} - DEMO DATA - for human review, nothing executed`, 9);
    write("AI diagnosis and recovery plan", 13, true);
    write(diagnosis);
    write("Selected evidence", 13, true);
    const ev = evidence.filter((x) => selectedEvidence.includes(x.id));
    write(ev.length ? ev.map((x) => `- ${x.source} (${x.evidence_type}, ${x.confidence}%)`).join("\n") : "None selected.");
    write("Selected events", 13, true);
    const evs = events.filter((x) => selectedEvents.includes(x.id));
    write(evs.length ? evs.map((x) => `- ${x.action} (${x.status}, risk ${x.risk_score})`).join("\n") : "None selected.");
    write("Human review", 13, true);
    write(steps.length ? steps.map((s, i) => {
      const r = reviews[i];
      return `- ${s.section} ${s.n}: ${r ? r.status.toUpperCase() + (r.saved ? "" : " (not recorded)") : "NOT REVIEWED"}${r?.note.trim() ? ` - ${r.note.trim()}` : ""}`;
    }).join("\n") : "No review steps.");
    if (notes.trim()) { write("Operator context", 13, true); write(notes.trim()); }
    const { data: timeline } = await supabase.from("audit_logs")
      .select("action,detail,created_at").eq("org_id", m.org_id)
      .like("detail", `Incident ${incident.id}%`).order("created_at");
    write("Incident audit timeline", 13, true);
    write(timeline?.length
      ? timeline.map((a) => `- ${new Date(a.created_at).toISOString()} [${a.action}] ${a.detail ?? ""}`).join("\n")
      : "No recorded review decisions.");
    doc.save(`flowguard-incident-${incident.id.slice(0, 8)}.pdf`);
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
          {can.actOnIncidents(m.role) && (
            <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              Status
              <select aria-label="Incident status" value={incident.status} onChange={(e) => void changeStatus(e.target.value)} className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground">
                {["open", "investigating", "mitigated", "resolved"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}
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
              {can.actOnIncidents(m.role) && <button type="button" onClick={() => setEditing({ id: x.id, source: x.source, evidence_type: x.evidence_type, confidence: x.confidence })} className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-foreground/5">Edit</button>}
              {can.managePolicies(m.role) && <button type="button" onClick={() => void removeEvidence(x.id)} className="rounded-md border border-border px-2 py-0.5 text-xs text-destructive hover:bg-foreground/5">Remove</button>}
            </li>
          ))}
          {evidence.length === 0 && <li className="text-xs text-muted-foreground">No evidence captured.</li>}
        </ul>
        {can.actOnIncidents(m.role) && (
          <form onSubmit={(e) => { e.preventDefault(); void saveEvidence(); }} className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
            <p className="w-full text-xs font-medium text-muted-foreground">{editing.id ? "Edit evidence" : "Add evidence"}</p>
            <input aria-label="Evidence source" required maxLength={200} placeholder="Source, e.g. Payment system log" value={editing.source} onChange={(e) => setEditing({ ...editing, source: e.target.value })} className="min-w-48 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm" />
            <select aria-label="Evidence type" value={editing.evidence_type} onChange={(e) => setEditing({ ...editing, evidence_type: e.target.value })} className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm">
              {["log", "payload", "policy_decision", "screenshot", "sensor", "note"].map((t) => <option key={t}>{t}</option>)}
            </select>
            <input aria-label="Evidence confidence" type="number" min={0} max={100} value={editing.confidence} onChange={(e) => setEditing({ ...editing, confidence: Math.max(0, Math.min(100, Number(e.target.value))) })} className="w-20 rounded-md border border-border bg-surface px-2 py-1.5 text-sm" />
            <Button type="submit" size="sm" disabled={!editing.source.trim()}>{editing.id ? "Save changes" : "Add evidence"}</Button>
            {editing.id && <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(blankEvidence)}>Cancel</Button>}
          </form>
        )}
      </Panel>

      {can.actOnIncidents(m.role) && (
        <section aria-labelledby="ai-diagnosis-heading" className="space-y-4 border-t border-border pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="ai-diagnosis-heading" className="text-lg font-semibold">AI diagnosis &amp; recovery plan</h2>
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
          {diagnosis && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-sm font-medium">Human review</h3>
                <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={exportPdf}>Export PDF report</Button>
              </div>
              {steps.map((step, i) => {
                const r = reviews[i] ?? { status: "accepted", note: "", saved: false };
                return (
                  <div key={i} className="space-y-2 rounded-md border border-border p-3">
                    <p className="text-sm"><span className="font-mono text-[11px] uppercase text-muted-foreground">{step.section} · </span>{step.text}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <select aria-label={`Review status for step ${i + 1}`} value={r.status} onChange={(e) => setReview(i, { status: e.target.value as ReviewStatus, saved: false })} className="rounded-md border border-border bg-surface px-2 py-1 text-xs">
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <input aria-label={`Review note for step ${i + 1}`} value={r.note} maxLength={500} onChange={(e) => setReview(i, { note: e.target.value, saved: false })} placeholder="Review note…" className="min-w-40 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-xs" />
                      <Button type="button" size="sm" variant="secondary" disabled={r.saved} onClick={() => recordReview(i)}>{r.saved ? "Recorded" : "Record"}</Button>
                    </div>
                  </div>
                );
              })}
              {steps.length === 0 && <p className="text-xs text-muted-foreground">No numbered steps were found in this diagnosis.</p>}
            </div>
          )}
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
          <h2 className="text-sm font-medium">Incident audit timeline</h2>
          {audit.length === 0 && <p className="mt-3 text-xs text-muted-foreground">No recorded changes or decisions yet.</p>}
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
