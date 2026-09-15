import { useState } from "react";

import {
  CAPABILITIES,
  DASHBOARD_METRICS,
  NETWORK_AGENTS,
  NETWORK_SYSTEMS,
  PRICING,
} from "@/lib/fg-data";
import { Counter, DemoTag, Panel, Reveal, SectionHead } from "./ui";

export function AgentNetwork() {
  const [active, setActive] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const selected = open !== null ? NETWORK_AGENTS[open] : null;

  return (
    <section id="network" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="AI agent network"
          title="Every agent, every system, one control surface."
          blurb="Simulated data paths between autonomous agents and the business systems they reach."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Agents
              </p>
              <DemoTag />
            </div>
            <div className="mt-5 space-y-2">
              {NETWORK_AGENTS.map((agent, i) => (
                <button
                  key={agent.name}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => setOpen(open === i ? null : i)}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                    active === i || open === i
                      ? "border-primary/60 bg-primary/5"
                      : "border-border bg-surface/30"
                  }`}
                >
                  <span className="text-sm">{agent.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {agent.events.toLocaleString()} events ·{" "}
                    <span
                      className={
                        agent.risk === "Critical" || agent.risk === "High"
                          ? "text-destructive"
                          : agent.risk === "Moderate"
                            ? "text-warning"
                            : "text-success"
                      }
                    >
                      {agent.risk}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Connected systems
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {NETWORK_SYSTEMS.map((sys) => (
                <span
                  key={sys}
                  className={`rounded-md border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition ${
                    active !== null || open !== null
                      ? "border-primary/50 bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {sys}
                </span>
              ))}
            </div>
            <div className="mt-6 min-h-[160px] rounded-lg border border-border bg-surface/30 p-5">
              {selected ? (
                <>
                  <p className="font-display text-lg">{selected.name}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Status</dt>
                      <dd>{selected.status}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Events (30d)</dt>
                      <dd>{selected.events.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Current risk</dt>
                      <dd>{selected.risk}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Control mode</dt>
                      <dd>Review before execution</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Hover an agent to highlight its connections, or select one to open its detail panel.
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

export function ControlLayer() {
  const [layer, setLayer] = useState<string | null>(null);
  const controls = CAPABILITIES.map((c) => c.name);

  return (
    <section id="control-layer" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Control architecture"
          title="The layer between intelligence and execution."
          blurb="Hover a layer to trace the full path from agent intent to business system."
        />
        <div className="mt-12 space-y-4">
          {[
            { key: "agents", title: "AI Agents", items: NETWORK_AGENTS.map((a) => a.name) },
            { key: "control", title: "FlowGuard Control Layer", items: controls },
            { key: "systems", title: "Business Systems", items: NETWORK_SYSTEMS },
          ].map((row) => (
            <div
              key={row.key}
              onMouseEnter={() => setLayer(row.key)}
              onMouseLeave={() => setLayer(null)}
              className={`rounded-xl border p-6 transition duration-300 ${
                layer
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-surface/40"
              } ${row.key === "control" ? "ring-1 ring-primary/30" : ""}`}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                {row.title}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {row.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Capabilities() {
  return (
    <section id="capabilities" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Eight control capabilities"
          title="One operating model for autonomous work."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((cap, i) => (
            <Reveal key={cap.id} delay={i * 0.05}>
              <Panel className="group h-full p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/40 bg-primary/10 font-mono text-xs text-primary transition group-hover:scale-105">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="mt-5 font-display text-lg">{cap.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">{cap.line}</p>
                <p className="mt-3 text-xs text-muted-foreground/80">{cap.detail}</p>
              </Panel>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardPreview() {
  const bars = [38, 52, 44, 71, 63, 88, 57, 69, 46, 78, 61, 92];
  return (
    <section id="dashboard" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Dashboard preview"
          title="Control room for autonomous execution."
          blurb="A preview of the FlowGuard application surface, running on demo data."
        />
        <Reveal className="mt-12">
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Organization overview
              </p>
              <DemoTag />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DASHBOARD_METRICS.map((m) => (
                <div key={m.label} className="rounded-lg border border-border bg-surface/40 p-4">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="mt-2 font-display text-2xl tabular-nums"><Counter value={m.value} /></p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
              <div className="rounded-lg border border-border bg-surface/40 p-5">
                <p className="text-xs text-muted-foreground">Events over time</p>
                <div className="mt-6 flex h-32 items-end gap-2">
                  {bars.map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className="flex-1 rounded-sm bg-primary/50 transition hover:bg-primary"
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface/40 p-5">
                <p className="text-xs text-muted-foreground">Risk distribution</p>
                <div className="mt-6 space-y-3">
                  {[
                    { label: "Low", pct: 64, tone: "bg-success" },
                    { label: "Moderate", pct: 23, tone: "bg-warning" },
                    { label: "High", pct: 9, tone: "bg-destructive/70" },
                    { label: "Critical", pct: 4, tone: "bg-destructive" },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{r.label}</span>
                        <span>{r.pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-raised">
                        <div className={`h-full rounded-full ${r.tone}`} style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </Reveal>
      </div>
    </section>
  );
}

export function Security() {
  const items = [
    ["Policy Enforcement", "Rules evaluated before an action reaches a production system."],
    ["Audit Trails", "Every evaluation, approval and override recorded in order."],
    ["Evidence Chains", "Decisions linked to the artifacts that justified them."],
    ["Human Approval", "Sensitive actions wait for an accountable person."],
    ["Least-Privilege Access", "Agents receive only the permissions their workflow needs."],
    ["Recovery Controls", "Destructive recovery stays a recommendation until approved."],
  ];
  return (
    <section id="security" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Security and trust"
          title="Control designed for accountable operation."
          blurb="FlowGuard is in early development. We do not claim any third-party certification or audit status."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([title, body], i) => (
            <Reveal key={title} delay={i * 0.05}>
              <Panel className="h-full p-6">
                <p className="font-display text-base">{title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </Panel>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Pricing"
          title="Plans for every stage of autonomy."
          blurb="Billing is not live yet. All plans are coming soon."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {PRICING.map((plan, i) => (
            <Reveal key={plan.tier} delay={i * 0.05}>
              <Panel className={`h-full p-6 ${i === 1 ? "ring-1 ring-primary/40" : ""}`}>
                <p className="font-display text-xl">{plan.tier}</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
                <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
                  Coming soon
                </p>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  {plan.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-primary">·</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </Panel>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-b border-border py-28">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
          From autonomous action to accountable execution.
        </h2>
        <p className="mt-5 text-muted-foreground">
          FlowGuard is the control layer for the age of autonomous AI.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <a
            href="#pricing"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110"
          >
            Start Free
          </a>
          <a
            href="#control-layer"
            className="rounded-md border border-border bg-surface/60 px-6 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-primary/60"
          >
            Explore the Control Layer
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="py-14">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg">FlowGuard</p>
          <p className="mt-1 text-sm text-muted-foreground">Make autonomous AI safe to run.</p>
        </div>
        <nav className="flex flex-wrap gap-5 text-sm text-muted-foreground">
          <a className="transition hover:text-foreground" href="#capabilities">Capabilities</a>
          <a className="transition hover:text-foreground" href="#risk">Risk detection</a>
          <a className="transition hover:text-foreground" href="#dashboard">Dashboard</a>
          <a className="transition hover:text-foreground" href="#security">Security</a>
          <a className="transition hover:text-foreground" href="#pricing">Pricing</a>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-7xl px-6 text-xs text-muted-foreground">
        All figures, agents, incidents and evidence shown on this site are demonstration data. FlowGuard
        makes no claims of certification, partnership or customer endorsement.
      </p>
    </footer>
  );
}

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rotate-45 bg-primary" />
          <span className="font-display text-base tracking-tight">FlowGuard</span>
        </a>
        <nav className="hidden gap-7 text-sm text-muted-foreground md:flex">
          <a className="transition hover:text-foreground" href="#capabilities">Capabilities</a>
          <a className="transition hover:text-foreground" href="#network">Agent network</a>
          <a className="transition hover:text-foreground" href="#risk">Risk</a>
          <a className="transition hover:text-foreground" href="#dashboard">Dashboard</a>
          <a className="transition hover:text-foreground" href="#pricing">Pricing</a>
        </nav>
        <a
          href="#pricing"
          className="rounded-md border border-primary/50 bg-primary/10 px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary/20"
        >
          Start Free
        </a>
      </div>
    </header>
  );
}
