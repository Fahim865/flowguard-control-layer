import { Suspense, lazy, useEffect, useRef, useState } from "react";

const Scene = lazy(() => import("./AmbientFieldScene"));

/**
 * Lightweight ambient 3D field used as a backdrop inside console panels.
 * Lazy-loaded, paused when off-screen, skipped under reduced motion / no WebGL.
 */
export function AmbientField({
  variant = "orbit",
  className = "",
}: {
  variant?: "orbit" | "grid" | "pulse";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      webgl = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      webgl = false;
    }
    setEnabled(!reduced && webgl);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => setVisible(!!e[0]?.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden opacity-80 max-sm:opacity-50 [mask-image:linear-gradient(to_right,transparent_0%,transparent_45%,black_85%)] max-sm:[mask-image:linear-gradient(to_right,transparent_0%,transparent_65%,black_100%)] ${className}`}>
      {enabled && visible ? (
        <Suspense fallback={null}>
          <div className="absolute inset-y-0 right-0 w-[80%] sm:w-[58%]">
            <Scene variant={variant} />
          </div>
        </Suspense>
      ) : (
        <div className="absolute inset-y-0 right-0 w-1/2 border-l border-primary/20 opacity-30 [background:repeating-linear-gradient(110deg,transparent_0px,transparent_34px,var(--color-primary)_35px,transparent_36px)]" />
      )}
    </div>
  );
}
