import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrgGate } from "@/components/fg/OrgGate";
import { AmbientField } from "@/components/fg/AmbientField";
import { DemoTag, Panel } from "@/components/fg/ui";
import { Builder } from "@/components/fg/Builder";
import { can, type Membership } from "@/lib/useOrg";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Control dashboard — FlowGuard" },
      { name: "description", content: "Monitor agent activity, risk evaluation and incident recovery across your AI workflows." },
      { property: "og:title", content: "Control dashboard — FlowGuard" },
      { property: "og:description", content: "Monitor agent activity, risk and incident recovery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <OrgGate>{(m) => <Dashboard m={m} />}</OrgGate>,
});

type Agent = { id: string; name: string; status: string; risk_score: number };
type Ev = { id: string; action: string; risk_score: number; status: string; created_at: string };
type Incident = { id: string; title: string; category: string; severity: string; status: string; summary: string | null };
type Recovery = { id: string; incident_id: string | null; action: string; state: string };

function Dashboard({ m }: { m: Membership }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<Ev[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [recovery, setRecovery] = useState<Recovery[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    void (async () => {
      const [a, e, i, r] = await Promise.all([
        supabase.from("agents").select("id,name,status,risk_score").eq("org_id", m.org_id).order("name"),
        supabase.from("agent_events").select("id,action,risk_score,status,created_at").eq("org_id", m.org_id).order("created_at", { ascending: false }).limit(10),
        supabase.from("incidents").select("id,title,category,severity,status,summary").eq("org_id", m.org_id).order("created_at", { ascending: false }),
        supabase.from("recovery_actions").select("id,incident_id,action,state").eq("org_id", m.org_id),
      ]);
      setAgents(a.data ?? []);
      setEvents(e.data ?? []);
      setIncidents(i.data ?? []);
      setRecovery(r.data ?? []);
    })();
  }, [m.org_id, tick]);

  const highRisk = events.filter((e) => e.risk_score >= 70).length;
  const metrics = [
    { label: "Active agents", value: agents.filter((a) => a.status === "active").length },
    { label: "Recent events", value: events.length },
    { label: "High risk events", value: highRisk },
    { label: "Open incidents", value: incidents.filter((i) => i.status !== "resolved").length },
  ];

  return (
    <div className="space-y-8">
      <header className="relative isolate min-h-48 overflow-hidden rounded-md glass-panel p-6 sm:min-h-52">
        <AmbientField variant="grid" />
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{m.organizations?.name ?? "Organization"}</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-mono text-xs uppercase">{m.role}</span>
            </p>
          </div>
          <DemoTag className="ml-auto" />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((x) => (
          <Panel key={x.label} className="p-4">
            <p className="text-xs text-muted-foreground">{x.label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{x.value}</p>
          </Panel>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-sm font-medium">Monitor — agent health</h2>
          <ul className="mt-3 space-y-2">
            {agents.map((a) => (
              <li key={a.id} className="flex items-center gap-3 text-sm">
                <span className="truncate">{a.name}</span>
                <span className="ml-auto font-mono text-[11px] uppercase text-muted-foreground">{a.status}</span>
                <span className="font-mono text-xs tabular-nums">{a.risk_score}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-sm font-medium">Evaluate — recent agent actions</h2>
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
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Incidents &amp; recovery state</h2>
        {incidents.map((i) => (
          <Panel key={i.id} className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-medium">
                <Link
                  to="/incidents/$incidentId"
                  params={{ incidentId: i.id }}
                  className="underline-offset-4 transition hover:text-primary hover:underline"
                >
                  {i.title}
                </Link>
              </h3>
              <span className="font-mono text-[11px] uppercase text-muted-foreground">{i.category}</span>
              <span className="ml-auto font-mono text-[11px] uppercase">{i.severity} · {i.status}</span>
            </div>
            {i.summary && <p className="mt-2 text-sm text-muted-foreground">{i.summary}</p>}
            <ul className="mt-3 space-y-1">
              {recovery
                .filter((r) => r.incident_id === i.id)
                .map((r) => (
                  <li key={r.id} className="flex items-center gap-3 text-sm">
                    <span>{r.action}</span>
                    <span className="font-mono text-[11px] uppercase text-muted-foreground">
                      Recommendation only
                    </span>
                    {can.actOnIncidents(m.role) && (
                      <button
                        className="ml-auto rounded-md border border-border px-2.5 py-1 text-xs transition hover:bg-foreground/5"
                        onClick={() => window.alert("Recovery execution arrives in a later phase — recommendation only.")}
                      >
                        Review
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          </Panel>
        ))}
      </section>

      <Builder m={m} onCreated={() => setTick((t) => t + 1)} />
    </div>
  );
}
