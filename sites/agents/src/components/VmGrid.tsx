import { useEffect, useMemo, useRef, useState } from "react";

interface VmGridProps {
  cols: number;
  rows: number;
  rampMs?: number;
  startDelayMs?: number;
  autoStart?: boolean;
  loop?: boolean;
  loopGapMs?: number;
  className?: string;
  dotClassName?: string;
  activeClassName?: string;
  triggerOnView?: boolean;
  /**
   * Optional easing curve mapping linear progress (0..1) to lit fraction
   * (0..1). Use to make the grid scale up and back down. Defaults to a
   * quadratic ease-out ramp to 1.
   */
  curve?: (t: number) => number;
}

/**
 * VmGrid — animates a grid of dots filling in over time, representing
 * cluster scale-out (each dot is one VM / worker). Defaults are tuned for the
 * Scale section but it is configurable for the Hero use as well.
 */
export function VmGrid({
  cols,
  rows,
  rampMs = 2400,
  startDelayMs = 200,
  autoStart = true,
  loop = false,
  loopGapMs = 1800,
  className = "",
  dotClassName = "bg-line",
  activeClassName = "bg-accent",
  triggerOnView = true,
  curve,
}: VmGridProps) {
  const total = cols * rows;
  const ref = useRef<HTMLDivElement | null>(null);
  const [lit, setLit] = useState(0);
  const [armed, setArmed] = useState(!triggerOnView);

  const order = useMemo(() => {
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [total]);

  useEffect(() => {
    if (!triggerOnView || armed) return;
    if (!ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setArmed(true);
            obs.unobserve(el);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [triggerOnView, armed]);

  useEffect(() => {
    if (!autoStart || !armed) return;
    let raf = 0;
    let timeoutId: number | null = null;

    const run = () => {
      setLit(0);
      const t0 = performance.now() + startDelayMs;
      const tick = (now: number) => {
        const t = Math.max(0, Math.min(1, (now - t0) / rampMs));
        const v = curve ? curve(t) : 1 - Math.pow(1 - t, 2);
        setLit(Math.round(Math.max(0, Math.min(1, v)) * total));
        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else if (loop) {
          timeoutId = window.setTimeout(run, loopGapMs);
        }
      };
      raf = requestAnimationFrame(tick);
    };

    run();
    return () => {
      cancelAnimationFrame(raf);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [autoStart, armed, rampMs, startDelayMs, total, loop, loopGapMs, curve]);

  const litSet = useMemo(() => {
    const s = new Set<number>();
    for (let i = 0; i < lit; i++) s.add(order[i]);
    return s;
  }, [lit, order]);

  return (
    <div
      ref={ref}
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const on = litSet.has(i);
        return (
          <div
            key={i}
            className={`${on ? activeClassName : dotClassName} rounded-[2px] transition-colors duration-300`}
            style={{ transitionDelay: on ? `${(i % 9) * 12}ms` : "0ms" }}
          />
        );
      })}
    </div>
  );
}
