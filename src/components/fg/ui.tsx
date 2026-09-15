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
