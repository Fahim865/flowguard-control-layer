import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import {
  ARBITRATION_AGENTS,
  COMPLIANCE_STEPS,
  REPAIR_STEPS,
  RISK_STEPS,
  TIMELINE,
  VERIFICATION_STEPS,
} from "@/lib/fg-data";
import { DemoTag, Panel, Reveal, SectionHead } from "./ui";

function useSequence(length: number, interval = 1100) {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!running) return;
    if (step >= length) {
      setRunning(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), interval);
    return () => clearTimeout(id);
  }, [running, step, length, interval]);

  const start = () => {
    setStep(0);
    setRunning(true);
  };

  const autoStart = () => {
    if (started.current) return;
    started.current = true;
    start();
  };

  return { step, start, autoStart, done: step >= length };
}

export function RiskDemo() {
  const { step, start, autoStart } = useSequence(RISK_STEPS.length);
  const score = Math.min(92, Math.round((step / RISK_STEPS.length) * 92));

  return (
    <section id="risk" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Risk detection"
          title="A risky action, intercepted before it executes."
          blurb="A simulated refund attempt moving through the FlowGuard control path."
        />
        <motion.div
          onViewportEnter={autoStart}
          viewport={{ once: true, amount: 0.3 }}
          className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]"
        >
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Refund Agent · workflow RFD-2291
              </p>
              <DemoTag />
            </div>
            <ol className="mt-6 space-y-3">
              {RISK_STEPS.map((s, i) => {
                const reached = i < step;
                return (
                  <li
                    key={s.label}
                    className={`flex gap-4 rounded-lg border px-4 py-3 transition-all duration-500 ${
                      reached
                        ? i >= 4
                          ? "border-destructive/50 bg-destructive/10"
                          : "border-primary/40 bg-primary/5"
                        : "border-border bg-surface/30 opacity-40"
                    }`}
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.note}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <button
              onClick={start}
              className="mt-6 rounded-md border border-border bg-surface px-4 py-2 font-mono text-[11px] uppercase tracking-[0.25em] transition hover:border-primary/60 hover:text-primary"
            >
              Replay demo
            </button>
          </Panel>

          <Panel className="flex flex-col justify-center p-8 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Risk score
            </p>
            <p className="mt-3 font-display text-6xl font-semibold tabular-nums text-destructive">
              {score}
              <span className="text-2xl text-muted-foreground">/100</span>
            </p>
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
              <motion.div
                className="h-full bg-destructive"
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <p className="mt-6 font-mono text-sm uppercase tracking-[0.3em] text-destructive">
              {score >= 92 ? "Critical" : "Evaluating"}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Status: {score >= 92 ? "Action blocked, human review requested" : "Assessment in progress"}
            </p>
          </Panel>
        </motion.div>
      </div>
    </section>
  );
}

export function EvidenceTimeline() {
  return (
    <section id="evidence" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Evidence timeline"
          title="Every decision leaves a replayable trail."
          blurb="The same refund attempt, reconstructed second by second."
        />
        <div className="mt-12 border-l border-border pl-6">
          {TIMELINE.map((entry, i) => (
            <Reveal key={entry.time + entry.event} delay={i * 0.05}>
              <div className="relative pb-8">
                <span
                  className={`absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-background ${
                    entry.tone === "danger"
                      ? "bg-destructive"
                      : entry.tone === "good"
                        ? "bg-success"
                        : "bg-primary"
                  }`}
                />
                <p className="font-mono text-xs text-muted-foreground">{entry.time}</p>
                <p className="mt-1 text-base">{entry.event}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <DemoTag className="mt-2" />
      </div>
    </section>
  );
}

export function SelfRepairDemo() {
  const { step, start, autoStart } = useSequence(REPAIR_STEPS.length, 900);
  const recovered = step >= REPAIR_STEPS.length;

  return (
    <section id="self-repair" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Self-repair"
          title="Broken workflows diagnosed and restored."
          blurb="Order Processing failed because an external API schema changed. Simulated recovery sequence."
        />
        <motion.div onViewportEnter={autoStart} viewport={{ once: true, amount: 0.3 }} className="mt-12">
          <Panel className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg">Order Processing</p>
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Status:{" "}
                  <span className={recovered ? "text-success" : "text-destructive"}>
                    {recovered ? "Recovered" : "Failed"}
                  </span>
                </p>
              </div>
              <DemoTag />
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {REPAIR_STEPS.map((s, i) => (
                <div
                  key={s.label}
                  className={`rounded-lg border p-4 transition-all duration-500 ${
                    i < step
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-surface/30 opacity-40"
                  }`}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
                    {s.label}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>
                </div>
              ))}
            </div>
            <AnimatePresence>
              {recovered && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-lg border border-success/40 bg-success/10 px-4 py-3 font-mono text-xs uppercase tracking-[0.3em] text-success"
                >
                  Workflow recovered · verification passed
                </motion.p>
              )}
            </AnimatePresence>
            <button
              onClick={start}
              className="mt-6 rounded-md border border-border bg-surface px-4 py-2 font-mono text-[11px] uppercase tracking-[0.25em] transition hover:border-primary/60 hover:text-primary"
            >
              Replay demo
            </button>
          </Panel>
        </motion.div>
      </div>
    </section>
  );
}

export function ArbitrationDemo() {
  const { step, start, autoStart } = useSequence(4, 900);
  const criteria = ["Authority", "Policy", "Evidence", "Risk"];
  const decided = step >= 4;

  return (
    <section id="arbitration" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Multi-agent arbitration"
          title="When agents disagree, policy decides."
          blurb="Three agents reach conflicting conclusions on the same discount request."
        />
        <motion.div
          onViewportEnter={autoStart}
          viewport={{ once: true, amount: 0.3 }}
          className="mt-12 grid gap-6 lg:grid-cols-3"
        >
          {ARBITRATION_AGENTS.map((agent, i) => (
            <Panel key={agent.name} className="p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
                {agent.name}
              </p>
              <p className="mt-3 text-lg">{agent.claim}</p>
              <p className="mt-2 text-xs text-muted-foreground">{agent.weight}</p>
              <div
                className={`mt-4 h-px w-full origin-left bg-primary/60 transition-transform duration-700 ${
                  step > i ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </Panel>
          ))}
        </motion.div>

        <Panel className="mt-6 p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Arbitration core
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {criteria.map((c, i) => (
              <span
                key={c}
                className={`rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] transition ${
                  step > i ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {c}
              </span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <span
              className={`rounded-md px-4 py-2 font-mono text-sm uppercase tracking-[0.3em] transition ${
                decided ? "bg-destructive/15 text-destructive" : "bg-surface-raised text-muted-foreground"
              }`}
            >
              {decided ? "Block" : "Evaluating"}
            </span>
            <p className="max-w-xl text-sm text-muted-foreground">
              Higher-priority financial and risk policies override the sales recommendation.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={start}
              className="rounded-md border border-border bg-surface px-4 py-2 font-mono text-[11px] uppercase tracking-[0.25em] transition hover:border-primary/60 hover:text-primary"
            >
              Replay demo
            </button>
            <DemoTag />
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function RealityVerification() {
  return (
    <section id="verification" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Physical reality verification"
          title="Check an AI claim against real-world signals."
          blurb="A demonstration of how physical evidence can be cross-checked. This is not a certified verification service."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {VERIFICATION_STEPS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <Panel className="h-full p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary">
                  {s.label}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{s.note}</p>
              </Panel>
            </Reveal>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <p className="font-display text-3xl">
            Evidence confidence <span className="text-primary">94%</span>
          </p>
          <DemoTag />
        </div>
      </div>
    </section>
  );
}

export function ComplianceDemo() {
  return (
    <section id="compliance" className="border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHead
          eyebrow="Compliance to workflow"
          title="A changing rule becomes an enforceable control."
          blurb="A simulated pipeline from a new requirement to a verified workflow change."
        />
        <div className="mt-12 flex flex-col gap-3 lg:flex-row lg:items-stretch">
          {COMPLIANCE_STEPS.map((label, i) => (
            <Reveal key={label} delay={i * 0.08} className="flex-1">
              <Panel className="h-full p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Stage {i + 1}
                </p>
                <p className="mt-3 text-sm">{label}</p>
                <div className="mt-4 h-1 w-full rounded-full bg-gradient-to-r from-primary/70 to-transparent" />
              </Panel>
            </Reveal>
          ))}
        </div>
        <DemoTag className="mt-6" />
      </div>
    </section>
  );
}
