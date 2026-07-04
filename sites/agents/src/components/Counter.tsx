import { useEffect, useRef, useState } from "react";

interface CounterProps {
  to: number;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatter?: (n: number) => string;
  ease?: (t: number) => number;
}

const defaultEase = (t: number) => 1 - Math.pow(1 - t, 3);

export function Counter({
  to,
  durationMs = 1400,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  formatter,
  ease = defaultEase,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started.current) {
            started.current = true;
            const t0 = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - t0) / durationMs);
              setValue(to * ease(t));
              if (t < 1) requestAnimationFrame(tick);
              else setValue(to);
            };
            requestAnimationFrame(tick);
            obs.unobserve(el);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, durationMs, ease]);

  const display = formatter
    ? formatter(value)
    : value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return (
    <span ref={ref} className={`tnum ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
