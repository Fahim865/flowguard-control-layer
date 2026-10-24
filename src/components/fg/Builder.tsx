import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "@/components/fg/ui";
import { Button } from "@/components/ui/button";
import { analyzeComplianceRule } from "@/lib/compliance.functions";
import { can, type Membership } from "@/lib/useOrg";

const field = "w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground";
const PERMISSIONS = ["read_data", "send_email", "issue_refund", "modify_records", "call_external_api"] as const;
const ROLES = ["assistant", "support", "finance", "operations", "analyst"];

type Agent = { id: string; name: string; role: string; status: string; risk_score: number; description: string | null; permissions: string[]; workflow_ids: string[] };
type Workflow = { id: string; name: string; status: string };
type Policy = { id: string; name: string; rule: string; effect: string; enabled: boolean };
type RunResult = { workflow_id: string | null; status: string; risk: number; policy: string | null; incident_id: string | null };

const blankAgent = { id: null as string | null, name: "", role: "assistant", status: "active", risk_score: 20, description: "", permissions: ["read_data"] as string[], workflow_ids: [] as string[] };
const blankPolicy = { id: null as string | null, name: "", rule: "", effect: "review", enabled: true };

async function audit(orgId: string, action: string, detail: string) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({ org_id: orgId, actor_id: data.user?.id ?? null, action, detail });
}

export function Builder({ m, onCreated }: { m: Membership; onCreated: () => void }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [agent, setAgent] = useState(blankAgent);
  const [pol, setPol] = useState(blankPolicy);
  const [wfName, setWfName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [runAction, setRunAction] = useState<Record<string, string>>({});
  const [runAmt, setRunAmt] = useState<Record<string, string>>({});
  const [runs, setRuns] = useState<Record<string, RunResult[]>>({});
  const [rule, setRule] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const analyze = useServerFn(analyzeComplianceRule);
  const canEdit = can.actOnIncidents(m.role);
  const canAdmin = can.managePolicies(m.role);

  const load = useCallback(async () => {
    const [a, w, p] = await Promise.all([
      supabase.from("agents").select("id,name,role,status,risk_score,description,permissions,workflow_ids").eq("org_id", m.org_id).order("created_at"),
      supabase.from("workflows").select("id,name,status").eq("org_id", m.org_id).order("created_at"),
      supabase.from("policies").select("id,name,rule,effect,enabled").eq("org_id", m.org_id).order("created_at"),
    ]);
    setAgents((a.data as Agent[]) ?? []);
    setWorkflows(w.data ?? []);
    setPolicies(p.data ?? []);
  }, [m.org_id]);
  useEffect(() => { void load(); }, [load]);

  const refresh = async (text: string) => { setMsg(text); await load(); onCreated(); };
  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const wfName_ = (id: string | null) => workflows.find((w) => w.id === id)?.name ?? "No workflow";

  async function saveAgent() {
    const { id, ...row } = { ...agent, name: agent.name.trim() };
    const res = id
      ? await supabase.from("agents").update(row).eq("id", id).eq("org_id", m.org_id)
      : await supabase.from("agents").insert({ ...row, org_id: m.org_id });
    if (res.error) { setMsg("Could not save agent."); return; }
    await audit(m.org_id, id ? "agent.updated" : "agent.created", `Agent "${row.name}" ${id ? "updated" : "created"} (role ${row.role}; permissions ${row.permissions.join(", ") || "none"})`);
    setAgent(blankAgent);
    await refresh(`Agent "${row.name}" saved.`);
  }

  async function deleteAgent(a: Agent) {
    if (!window.confirm(`Delete agent "${a.name}"? Its past events stay in history.`)) return;
    const { error } = await supabase.from("agents").delete().eq("id", a.id).eq("org_id", m.org_id);
    if (error) { setMsg("Could not delete agent."); return; }
    await audit(m.org_id, "agent.deleted", `Agent "${a.name}" deleted`);
    await refresh(`Agent "${a.name}" deleted.`);
  }

  async function run(a: Agent) {
    const action = runAction[a.id] ?? "read_data";
    const { data, error } = await supabase.rpc("run_agent", { _agent: a.id, _action: action, _detail: (runAmt[a.id] ?? "").trim() });
    if (error) { setMsg(`Run failed: ${error.message}`); return; }
    setRuns((r) => ({ ...r, [a.id]: data as unknown as RunResult[] }));
    await refresh(`${a.name} ran ${action}.`);
  }

  async function createWorkflow() {
    const name = wfName.trim();
    const { error } = await supabase.from("workflows").insert({ name, org_id: m.org_id, status: "healthy" });
    if (error) { setMsg("Could not create workflow."); return; }
    await audit(m.org_id, "workflow.created", `Workflow "${name}" created`);
    setWfName("");
    await refresh(`Workflow "${name}" created.`);
  }

  async function savePolicy() {
    const { id, ...row } = { ...pol, name: pol.name.trim(), rule: pol.rule.trim() };
    const res = id
      ? await supabase.from("policies").update(row).eq("id", id).eq("org_id", m.org_id)
      : await supabase.from("policies").insert({ ...row, org_id: m.org_id });
    if (res.error) { setMsg("Could not save policy."); return; }
    await audit(m.org_id, id ? "policy.updated" : "policy.created", `Policy "${row.name}" ${id ? "updated" : "created"} (${row.effect}${row.enabled ? "" : ", disabled"})`);
    setPol(blankPolicy);
    await refresh(`Policy "${row.name}" saved.`);
  }

  async function deletePolicy(p: Policy) {
    if (!window.confirm(`Delete policy "${p.name}"?`)) return;
    const { error } = await supabase.from("policies").delete().eq("id", p.id).eq("org_id", m.org_id);
    if (error) { setMsg("Could not delete policy."); return; }
    await audit(m.org_id, "policy.deleted", `Policy "${p.name}" deleted`);
    await refresh(`Policy "${p.name}" deleted.`);
  }

  async function runCompliance() {
    if (busy) return;
    setBusy(true); setErr(null); setResult(null);
    try { setResult((await analyze({ data: { orgId: m.org_id, rule } })).text); }
    catch (e) { setErr(e instanceof Error ? e.message : "Analysis unavailable."); }
    finally { setBusy(false); }
  }

  if (!canEdit) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium">Agent builder</h2>
      <div aria-live="polite">{msg && <p className="text-xs text-muted-foreground">{msg}</p>}</div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Panel className="space-y-2 p-5">
          <h3 className="text-sm font-medium">{agent.id ? "Edit agent" : "New agent"}</h3>
          <input aria-label="Agent name" placeholder="Name" value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} className={field} />
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Agent role" value={agent.role} onChange={(e) => setAgent({ ...agent, role: e.target.value })} className={field}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            <select aria-label="Agent status" value={agent.status} onChange={(e) => setAgent({ ...agent, status: e.target.value })} className={field}>{["active", "review", "paused"].map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <label className="block text-xs text-muted-foreground">Risk score {agent.risk_score}
            <input type="range" min={0} max={100} value={agent.risk_score} onChange={(e) => setAgent({ ...agent, risk_score: Number(e.target.value) })} className="w-full accent-primary" />
          </label>
          <input aria-label="Agent description" placeholder="What it does" value={agent.description} onChange={(e) => setAgent({ ...agent, description: e.target.value })} className={field} />
          <fieldset className="text-xs"><legend className="mb-1 text-muted-foreground">Permissions</legend>
            <div className="flex flex-wrap gap-x-3 gap-y-1">{PERMISSIONS.map((p) => (
              <label key={p} className="flex items-center gap-1"><input type="checkbox" className="accent-primary" checked={agent.permissions.includes(p)} onChange={() => setAgent({ ...agent, permissions: toggleIn(agent.permissions, p) })} />{p}</label>
            ))}</div>
          </fieldset>
          <fieldset className="text-xs"><legend className="mb-1 text-muted-foreground">Workflow assignments</legend>
            <div className="flex flex-wrap gap-x-3 gap-y-1">{workflows.map((w) => (
              <label key={w.id} className="flex items-center gap-1"><input type="checkbox" className="accent-primary" checked={agent.workflow_ids.includes(w.id)} onChange={() => setAgent({ ...agent, workflow_ids: toggleIn(agent.workflow_ids, w.id) })} />{w.name}</label>
            ))}</div>
          </fieldset>
          <div className="flex gap-2">
            <Button size="sm" disabled={!agent.name.trim()} onClick={() => void saveAgent()}>{agent.id ? "Save agent" : "Create agent"}</Button>
            {agent.id && <Button size="sm" variant="ghost" onClick={() => setAgent(blankAgent)}>Cancel</Button>}
          </div>
          <div className="flex gap-2 border-t border-border pt-3">
            <input aria-label="Workflow name" placeholder="New workflow name" value={wfName} onChange={(e) => setWfName(e.target.value)} className={field} />
            <Button size="sm" variant="secondary" disabled={!wfName.trim()} onClick={() => void createWorkflow()}>Add workflow</Button>
          </div>
        </Panel>

        <Panel className="p-5">
          <h3 className="text-sm font-medium">Agents</h3>
          <ul className="mt-3 space-y-3">
            {agents.map((a) => (
              <li key={a.id} className="space-y-2 border-b border-border pb-3 text-sm last:border-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.name}</span>
                  <span className="font-mono text-[11px] uppercase text-muted-foreground">{a.role} · {a.status} · risk {a.risk_score}</span>
                  <span className="ml-auto flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setAgent({ id: a.id, name: a.name, role: a.role, status: a.status, risk_score: a.risk_score, description: a.description ?? "", permissions: a.permissions, workflow_ids: a.workflow_ids })}>Edit</Button>
                    {canAdmin && <Button size="sm" variant="outline" onClick={() => void deleteAgent(a)}>Delete</Button>}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Permissions: {a.permissions.join(", ") || "none"} · Workflows: {a.workflow_ids.map(wfName_).join(", ") || "none"}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select aria-label={`Action for ${a.name}`} value={runAction[a.id] ?? "read_data"} onChange={(e) => setRunAction({ ...runAction, [a.id]: e.target.value })} className="rounded-md border border-border bg-surface px-2 py-1 text-xs">{PERMISSIONS.map((p) => <option key={p}>{p}</option>)}</select>
                  <input aria-label={`Amount for ${a.name}`} type="number" min={0} placeholder="Amount $" value={runAmt[a.id] ?? ""} onChange={(e) => setRunAmt({ ...runAmt, [a.id]: e.target.value })} className="w-24 rounded-md border border-border bg-surface px-2 py-1 text-xs" />
                  <Button size="sm" variant="secondary" onClick={() => void run(a)}>Run</Button>
                </div>
                {runs[a.id]?.map((r, i) => (
                  <p key={i} className="font-mono text-[11px] uppercase text-muted-foreground">{wfName_(r.workflow_id)} → {r.status} · risk {r.risk}{r.policy ? ` · ${r.policy}` : ""}{r.incident_id ? " · incident opened" : ""}</p>
                ))}
              </li>
            ))}
            {agents.length === 0 && <li className="text-xs text-muted-foreground">No agents yet.</li>}
          </ul>
        </Panel>
      </div>

      <h2 className="pt-2 text-sm font-medium">Policy editor</h2>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Panel className="space-y-2 p-5">
          <h3 className="text-sm font-medium">{pol.id ? "Edit policy" : "New policy"}</h3>
          {canAdmin ? (<>
            <input aria-label="Policy name" placeholder="Name" value={pol.name} onChange={(e) => setPol({ ...pol, name: e.target.value })} className={field} />
            <input aria-label="Policy rule" placeholder="Rule, e.g. Refunds above $500 require approval" value={pol.rule} onChange={(e) => setPol({ ...pol, rule: e.target.value })} className={field} />
            <p className="text-[11px] text-muted-foreground">Agent runs match rules mentioning: read, email, refund, record, external. An amount in a rule (e.g. $500) sets a threshold — runs above it are blocked.</p>
            <div className="flex items-center gap-3">
              <select aria-label="Policy effect" value={pol.effect} onChange={(e) => setPol({ ...pol, effect: e.target.value })} className={field}>{["allow", "review", "block"].map((s) => <option key={s}>{s}</option>)}</select>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" className="accent-primary" checked={pol.enabled} onChange={(e) => setPol({ ...pol, enabled: e.target.checked })} />Enabled</label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!pol.name.trim() || !pol.rule.trim()} onClick={() => void savePolicy()}>{pol.id ? "Save policy" : "Create policy"}</Button>
              {pol.id && <Button size="sm" variant="ghost" onClick={() => setPol(blankPolicy)}>Cancel</Button>}
            </div>
          </>) : <p className="text-xs text-muted-foreground">Only owners and admins can create or change policies.</p>}
        </Panel>
        <Panel className="p-5">
          <h3 className="text-sm font-medium">Policies</h3>
          <ul className="mt-3 space-y-2">
            {policies.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.rule}</span>
                <span className="ml-auto font-mono text-[11px] uppercase">{p.effect}{p.enabled ? "" : " · off"}</span>
                {canAdmin && <>
                  <Button size="sm" variant="outline" onClick={() => setPol({ id: p.id, name: p.name, rule: p.rule, effect: p.effect, enabled: p.enabled })}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => void deletePolicy(p)}>Delete</Button>
                </>}
              </li>
            ))}
            {policies.length === 0 && <li className="text-xs text-muted-foreground">No policies yet.</li>}
          </ul>
        </Panel>
      </div>

      <Panel className="space-y-3 p-5">
        <h3 className="text-sm font-medium">Compliance — new rule impact (AI)</h3>
        <p className="text-xs text-muted-foreground">Describe a new rule. The AI proposes policy updates, workflow changes and verification steps for human review. Nothing is applied automatically. One AI request per click.</p>
        <textarea aria-label="New compliance rule" rows={3} maxLength={2000} value={rule} onChange={(e) => setRule(e.target.value)} placeholder="e.g. Customer data may not leave the EU without approval." className={field} />
        <Button size="sm" disabled={busy || rule.trim().length < 5} onClick={() => void runCompliance()}>{busy ? "Analyzing…" : "Analyze rule impact"}</Button>
        <div aria-live="polite" role="status">
          {err && <p className="text-sm text-destructive">{err}</p>}
          {result && <div className="border-l-2 border-primary bg-surface p-4"><p className="mb-2 text-xs font-medium">For human review · not applied</p><p className="whitespace-pre-wrap text-sm leading-7">{result}</p></div>}
        </div>
      </Panel>
    </section>
  );
}
