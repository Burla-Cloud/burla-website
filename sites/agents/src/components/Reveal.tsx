import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  /**
   * If true, only run the reveal when the element scrolls into view.
   * Defaults to false — most reveals on this site happen on mount with a
   * small delay so the user always sees animated entry, including above
   * the fold. Set this to true for sections that need to stay still until
   * scrolled into view.
   */
  observe?: boolean;
}

/**
 * Reveal — CSS-keyframe driven fade/slide-up wrapper. Content always lands at
 * its resting (visible) state; the entry animation runs once on mount, after
 * an optional delay. We deliberately never gate visibility behind JS state, so
 * a slow framework or disabled JS never strands content hidden.
 */
export function Reveal({
  children,
  delay = 0,
  y = 12,
  as: Tag = "div",
  className = "",
  observe = false,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [run, setRun] = useState(!observe);

  useEffect(() => {
    if (!observe || !ref.current) return;
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 60) {
      setRun(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRun(true);
            obs.unobserve(el);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [observe]);

  const Component = Tag as any;
  return (
    <Component
      ref={ref as any}
      className={className}
      style={{
        animation: run
          ? `revealIn 700ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`
          : undefined,
        opacity: run ? undefined : 0,
        transform: run ? undefined : `translateY(${y}px)`,
      }}
    >
      {children}
    </Component>
  );
}
