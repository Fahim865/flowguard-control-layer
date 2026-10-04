import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "@/components/fg/ui";
import { Button } from "@/components/ui/button";
import { analyzeComplianceRule } from "@/lib/compliance.functions";
import { can, type Membership } from "@/lib/useOrg";

const field = "w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground";

async function audit(orgId: string, action: string, detail: string) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({ org_id: orgId, actor_id: data.user?.id ?? null, action, detail });
}

export function Builder({ m, onCreated }: { m: Membership; onCreated: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [agent, setAgent] = useState({ name: "", status: "active", risk_score: 20, description: "" });
  const [wf, setWf] = useState({ name: "", status: "healthy", description: "" });
  const [pol, setPol] = useState({ name: "", rule: "", effect: "review" });
  const [rule, setRule] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const analyze = useServerFn(analyzeComplianceRule);
  if (!can.actOnIncidents(m.role)) return null;
  const canPolicy = can.managePolicies(m.role);

  async function save(kind: "agents" | "workflows" | "policies", row: Record<string, unknown>, label: string, reset: () => void) {
    setMsg(null);
    const { error } = await supabase.from(kind).insert({ ...row, org_id: m.org_id } as never);
    if (error) { setMsg(`Could not create ${label}.`); return; }
    await audit(m.org_id, `${label}.created`, `${label} "${String(row["name"])}" created`);
    setMsg(`${label[0]!.toUpperCase()}${label.slice(1)} "${String(row["name"])}" created.`);
    reset();
    onCreated();
  }

  async function runCompliance() {
    if (busy) return;
    setBusy(true); setErr(null); setResult(null);
    try { setResult((await analyze({ data: { orgId: m.org_id, rule } })).text); }
    catch (e) { setErr(e instanceof Error ? e.message : "Analysis unavailable."); }
    finally { setBusy(false); }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium">Builder</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="space-y-2 p-5">
          <h3 className="text-sm font-medium">New agent</h3>
          <input aria-label="Agent name" placeholder="Name" value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} className={field} />
          <select aria-label="Agent status" value={agent.status} onChange={(e) => setAgent({ ...agent, status: e.target.value })} className={field}>
            {["active", "review", "paused"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <label className="block text-xs text-muted-foreground">Risk score {agent.risk_score}
            <input type="range" min={0} max={100} value={agent.risk_score} onChange={(e) => setAgent({ ...agent, risk_score: Number(e.target.value) })} className="w-full accent-primary" />
          </label>
          <input aria-label="Agent description" placeholder="What it does" value={agent.description} onChange={(e) => setAgent({ ...agent, description: e.target.value })} className={field} />
          <Button size="sm" disabled={!agent.name.trim()} onClick={() => save("agents", { ...agent, name: agent.name.trim() }, "agent", () => setAgent({ name: "", status: "active", risk_score: 20, description: "" }))}>Create agent</Button>
        </Panel>
        <Panel className="space-y-2 p-5">
          <h3 className="text-sm font-medium">New workflow</h3>
          <input aria-label="Workflow name" placeholder="Name" value={wf.name} onChange={(e) => setWf({ ...wf, name: e.target.value })} className={field} />
          <select aria-label="Workflow status" value={wf.status} onChange={(e) => setWf({ ...wf, status: e.target.value })} className={field}>
            {["healthy", "degraded", "failed"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <input aria-label="Workflow description" placeholder="Description" value={wf.description} onChange={(e) => setWf({ ...wf, description: e.target.value })} className={field} />
          <Button size="sm" disabled={!wf.name.trim()} onClick={() => save("workflows", { ...wf, name: wf.name.trim() }, "workflow", () => setWf({ name: "", status: "healthy", description: "" }))}>Create workflow</Button>
        </Panel>
        <Panel className="space-y-2 p-5">
          <h3 className="text-sm font-medium">New policy</h3>
          {canPolicy ? (<>
            <input aria-label="Policy name" placeholder="Name" value={pol.name} onChange={(e) => setPol({ ...pol, name: e.target.value })} className={field} />
            <input aria-label="Policy rule" placeholder="Rule, e.g. Refunds above $500 require approval" value={pol.rule} onChange={(e) => setPol({ ...pol, rule: e.target.value })} className={field} />
            <select aria-label="Policy effect" value={pol.effect} onChange={(e) => setPol({ ...pol, effect: e.target.value })} className={field}>
              {["allow", "review", "block"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <Button size="sm" disabled={!pol.name.trim() || !pol.rule.trim()} onClick={() => save("policies", { ...pol, name: pol.name.trim() }, "policy", () => setPol({ name: "", rule: "", effect: "review" }))}>Create policy</Button>
          </>) : <p className="text-xs text-muted-foreground">Only owners and admins can create policies.</p>}
        </Panel>
      </div>
      <div aria-live="polite">{msg && <p className="text-xs text-muted-foreground">{msg}</p>}</div>

      <Panel className="space-y-3 p-5">
        <h3 className="text-sm font-medium">Compliance — new rule impact (AI)</h3>
        <p className="text-xs text-muted-foreground">Describe a new rule. The AI proposes policy updates, workflow changes and verification steps for human review. Nothing is applied automatically. One AI request per click.</p>
        <textarea aria-label="New compliance rule" rows={3} maxLength={2000} value={rule} onChange={(e) => setRule(e.target.value)} placeholder="e.g. Customer data may not leave the EU without approval." className={field} />
        <Button size="sm" disabled={busy || rule.trim().length < 5} onClick={runCompliance}>{busy ? "Analyzing…" : "Analyze rule impact"}</Button>
        <div aria-live="polite" role="status">
          {err && <p className="text-sm text-destructive">{err}</p>}
          {result && <div className="border-l-2 border-primary bg-surface p-4"><p className="mb-2 text-xs font-medium">For human review · not applied</p><p className="whitespace-pre-wrap text-sm leading-7">{result}</p></div>}
        </div>
      </Panel>
    </section>
  );
}
