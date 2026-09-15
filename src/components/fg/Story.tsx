import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const SCENES = [
  {
    kicker: "Scene 01",
    title: "AI is becoming autonomous.",
    body: "Agents no longer suggest. They act — inside the same systems your business runs on.",
  },
  {
    kicker: "Scene 02",
    title: "Actions reach real systems.",
    body: "API calls, database updates, financial actions, customer communications, full workflow execution.",
  },
  {
    kicker: "Scene 03",
    title: "Autonomy creates a new control problem.",
    body: "Policy conflicts, missing evidence, abnormal actions and silent workflow failures.",
  },
  {
    kicker: "Scene 04",
    title: "Intelligence can act. FlowGuard controls the action.",
    body: "The control core sits between autonomous agents and the systems they touch.",
  },
  {
    kicker: "Scene 05",
    title: "Risky actions are intercepted.",
    body: "Execution pauses at the boundary instead of failing inside production.",
  },
  {
    kicker: "Scene 06",
    title: "Evidence, policy and evaluation activate.",
    body: "Every decision carries a matched rule, an evidence chain and a business outcome score.",
  },
  {
    kicker: "Scene 07",
    title: "Recovery restores the workflow.",
    body: "From autonomous action to accountable execution.",
  },
];

function SceneVisual({ index, progress }: { index: number; progress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const rotate = useTransform(progress, [0, 1], [-14, 14]);
  const risky = index >= 2 && index <= 4;
  const controlled = index >= 3;
  return (
    <div className="relative h-56 w-full overflow-hidden rounded-xl border border-border bg-surface/40 [perspective:900px] sm:h-72">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <motion.div
        style={{ rotateY: rotate }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="flex items-center gap-3 sm:gap-6">
          {["Agent", "Action", controlled ? "Control" : "System"].map((label, i) => (
            <div key={label} className="flex items-center gap-3 sm:gap-6">
              <div
                className={`rounded-md border px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${
                  i === 2 && controlled
                    ? "border-primary bg-primary/15 text-primary"
                    : risky && i === 1
                      ? "border-destructive/60 bg-destructive/10 text-destructive"
                      : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {label}
              </div>
              {i < 2 ? <div className="h-px w-8 bg-border sm:w-14" /> : null}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function Story() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  return (
    <section ref={ref} id="why" className="relative border-b border-border py-24">
      <div className="mx-auto max-w-7xl px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-primary">
          Why autonomous AI needs control
        </p>
        <div className="mt-12 space-y-20">
          {SCENES.map((scene, i) => (
            <motion.div
              key={scene.kicker}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className={`grid items-center gap-8 lg:grid-cols-2 ${i % 2 ? "lg:[direction:rtl]" : ""}`}
            >
              <div className="lg:[direction:ltr]">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {scene.kicker}
                </p>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {scene.title}
                </h3>
                <p className="mt-3 max-w-md text-muted-foreground">{scene.body}</p>
              </div>
              <div className="lg:[direction:ltr]">
                <SceneVisual index={i} progress={scrollYProgress} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
