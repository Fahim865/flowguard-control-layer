import { Suspense, lazy, useEffect, useRef, useState } from "react";

import { CAPABILITIES, type CapabilityId } from "@/lib/fg-data";

const ControlCoreScene = lazy(() => import("./ControlCoreScene"));

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

function FallbackCore({
  hovered,
  setHovered,
  setSelected,
}: {
  hovered: CapabilityId | null;
  setHovered: (id: CapabilityId | null) => void;
  setSelected: (id: CapabilityId | null) => void;
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px] [perspective:1000px]">
      <div className="absolute inset-[30%] rounded-full border border-primary/40 bg-primary/10 [transform:rotateX(62deg)]" />
      <div className="absolute inset-[34%] animate-pulse rounded-full bg-primary/25 blur-xl" />
      {CAPABILITIES.map((cap, i) => {
        const angle = (i / CAPABILITIES.length) * Math.PI * 2;
        const x = 50 + Math.cos(angle) * 40;
        const y = 50 + Math.sin(angle) * 26;
        return (
          <button
            key={cap.id}
            onMouseEnter={() => setHovered(cap.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setSelected(cap.id)}
            style={{ left: `${x}%`, top: `${y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition ${
              hovered === cap.id
                ? "border-primary bg-primary/20 text-foreground"
                : "border-border bg-surface/80 text-muted-foreground"
            }`}
          >
            {cap.name}
          </button>
        );
      })}
    </div>
  );
}

export function Hero() {
  const [hovered, setHovered] = useState<CapabilityId | null>(null);
  const [selected, setSelected] = useState<CapabilityId | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWebgl(supportsWebGL());
    const el = holder.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setVisible(Boolean(entries[0]?.isIntersecting)), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const active = CAPABILITIES.find((c) => c.id === (hovered ?? selected)) ?? null;

  return (
    <section className="relative min-h-[100svh] overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[540px] w-[540px] -translate-x-1/2 rounded-full blur-[130px]"
        style={{ background: "color-mix(in oklab, var(--color-primary) 18%, transparent)" }}
      />

      <div className="relative mx-auto grid min-h-[100svh] w-full max-w-7xl items-center gap-10 px-6 pb-16 pt-28 lg:grid-cols-2">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-primary">
            AI Workflow Control
          </p>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-glow sm:text-5xl lg:text-6xl">
            Make Autonomous AI Safe to Run.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Monitor, evaluate, verify and recover AI workflows before autonomous actions
            become business incidents.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#pricing"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
            >
              Start Free
            </a>
            <a
              href="#control-layer"
              className="rounded-md border border-border bg-surface/60 px-6 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-primary/60 active:translate-y-0"
            >
              Explore the Control Layer
            </a>
          </div>
          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Demo data · simulated environment
          </p>
        </div>

        <div ref={holder} className="relative h-[52vh] min-h-[360px] lg:h-[74vh]">
          {webgl === false ? (
            <FallbackCore hovered={hovered} setHovered={setHovered} setSelected={setSelected} />
          ) : webgl && visible ? (
            <Suspense fallback={<div className="h-full w-full animate-pulse rounded-xl bg-surface/40" />}>
              <ControlCoreScene
                hovered={hovered}
                selected={selected}
                setHovered={setHovered}
                setSelected={setSelected}
              />
            </Suspense>
          ) : (
            <div className="h-full w-full rounded-xl bg-surface/20" />
          )}

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center">
            <div
              className={`glass-panel max-w-md rounded-lg px-5 py-4 transition-all duration-300 ${
                active ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              }`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
                {active?.name ?? "Control Core"}
              </p>
              <p className="mt-2 text-sm text-foreground">{active?.line}</p>
              <p className="mt-1 text-xs text-muted-foreground">{active?.detail}</p>
            </div>
          </div>
          {!active && (
            <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Hover or click a node
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
