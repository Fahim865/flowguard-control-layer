import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrgGate } from "@/components/fg/OrgGate";
import { DemoTag, Panel } from "@/components/fg/ui";
import { can, type Membership } from "@/lib/useOrg";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — FlowGuard" },
      { name: "description", content: "Manage FlowGuard policies, API keys, integrations and audit logs for your organization." },
      { property: "og:title", content: "Settings — FlowGuard" },
      { property: "og:description", content: "Policies, API keys, integrations and audit logs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <OrgGate>{(m) => <Settings m={m} />}</OrgGate>,
});

type Policy = { id: string; name: string; rule: string; effect: string; enabled: boolean };
type Audit = { id: string; action: string; detail: string | null; created_at: string };

const TABS = ["Policies", "API keys", "Integrations", "Audit log"] as const;
type Tab = (typeof TABS)[number];

const INTEGRATIONS = ["OpenAI", "Anthropic", "Gemini", "OpenRouter", "GitHub", "Slack", "REST API", "MCP", "CRM", "ERP", "Database"];

function Settings({ m }: { m: Membership }) {
  const [tab, setTab] = useState<Tab>("Policies");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [test, setTest] = useState("Refund of $1,240 requested by Finance Agent");
  const [result, setResult] = useState<string | null>(null);
  const editable = can.managePolicies(m.role);

  async function load() {
    const [p, a] = await Promise.all([
      supabase.from("policies").select("id,name,rule,effect,enabled").order("created_at"),
      supabase.from("audit_logs").select("id,action,detail,created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    setPolicies((p.data as Policy[]) ?? []);
    setAudit((a.data as Audit[]) ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(p: Policy) {
    await supabase.from("policies").update({ enabled: !p.enabled }).eq("id", p.id);
    await supabase.from("audit_logs").insert({
      org_id: m.org_id,
      actor_id: (await supabase.auth.getUser()).data.user?.id,
      action: "policy.toggled",
      detail: `${p.name} ${p.enabled ? "disabled" : "enabled"}`,
    });
    await load();
  }

  /** Simulated policy enforcement — no real workflow is affected. */
  async function evaluate() {
    const amount = Number(test.replace(/[^0-9.]/g, "")) || 0;
    const active = policies.filter((p) => p.enabled);
    const matched =
      amount > 300 ? active.find((p) => p.effect === "review") : undefined;
    const decision = matched ? matched.effect.toUpperCase() : "ALLOW";
    setResult(
      matched
        ? `${decision} — matched "${matched.name}": ${matched.rule}`
        : "ALLOW — no enabled policy matched this action.",
    );
    await supabase.from("audit_logs").insert({
      org_id: m.org_id,
      actor_id: (await supabase.auth.getUser()).data.user?.id,
      action: "policy.evaluated",
      detail: `${test} → ${decision}`,
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <DemoTag className="ml-auto" />
      </header>

      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              tab === t ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-foreground/5"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Policies" && (
        <div className="space-y-4">
          <Panel className="p-5">
            <h2 className="text-sm font-medium">Policy engine</h2>
            <ul className="mt-3 space-y-3">
              {policies.map((p) => (
                <li key={p.id} className="flex items-start gap-3 text-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-muted-foreground">{p.rule}</p>
                  </div>
                  <span className="ml-auto font-mono text-[11px] uppercase text-muted-foreground">{p.effect}</span>
                  <button
                    disabled={!editable}
                    onClick={() => toggle(p)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-foreground/5 disabled:opacity-40"
                  >
                    {p.enabled ? "Enabled" : "Disabled"}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-sm font-medium">Simulated enforcement</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Evaluates a described action against enabled policies. Nothing is executed.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="test-action">
                Action to evaluate
              </label>
              <input
                id="test-action"
                value={test}
                onChange={(e) => setTest(e.target.value)}
                className="flex-1 min-w-[16rem] rounded-md bg-background/60 border border-border px-3 py-2 text-sm outline-none focus-visible:ring-2 ring-primary/50"
              />
              <button
                onClick={evaluate}
                className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium transition active:scale-[0.99]"
              >
                Evaluate
              </button>
            </div>
            {result && <p className="mt-3 font-mono text-xs">{result}</p>}
          </Panel>
        </div>
      )}

      {tab === "API keys" && (
        <Panel className="p-5">
          <h2 className="text-sm font-medium">API keys</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Key issuance arrives with the event ingestion API in a later phase. No keys exist yet.
          </p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">fg_live_•••••••••••••••• (placeholder)</p>
          <button
            disabled
            className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs opacity-40"
            title="Available in a later phase"
          >
            Generate key
          </button>
        </Panel>
      )}

      {tab === "Integrations" && (
        <Panel className="p-5">
          <h2 className="text-sm font-medium">Integration targets</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Planned connection targets. These are examples, not active partnerships or live connections.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {INTEGRATIONS.map((i) => (
              <li key={i} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground">
                {i}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {tab === "Audit log" && (
        <Panel className="p-5">
          <h2 className="text-sm font-medium">Audit log</h2>
          {can.viewAudit(m.role) ? (
            <ul className="mt-3 space-y-2">
              {audit.map((a) => (
                <li key={a.id} className="flex gap-3 text-sm">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                  <span className="font-mono text-[11px] uppercase">{a.action}</span>
                  <span className="text-muted-foreground truncate">{a.detail}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Your role does not have access to the audit log.</p>
          )}
        </Panel>
      )}
    </div>
  );
}
