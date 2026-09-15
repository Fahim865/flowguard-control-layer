import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
}) {
  return (
    <Reveal className="max-w-2xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-primary">{eyebrow}</p>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {blurb ? <p className="mt-4 text-muted-foreground">{blurb}</p> : null}
    </Reveal>
  );
}

export function DemoTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border border-warning/40 bg-warning/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-warning ${className}`}
    >
      Demo data
    </span>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`glass-panel rounded-xl transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 ${className}`}
    >
      {children}
    </div>
  );
}

export function Counter({ value }: { value: string }) {
  const match = value.match(/^(\d[\d,]*)(.*)$/);
  const target = match ? Number(match[1]!.replace(/,/g, "")) : 0;
  const suffix = match ? match[2] ?? "" : "";
  const [n, setN] = useState(match ? 0 : -1);

  useEffect(() => {
    if (!match) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / 900, 1);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, match]);

  if (n < 0) return <>{value}</>;
  return (
    <>
      {n.toLocaleString()}
      {suffix}
    </>
  );
}
