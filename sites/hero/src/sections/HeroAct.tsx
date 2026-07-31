import { useCallback, useEffect, useRef } from "react";
import {
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { Scene } from "../components/Scene";
import { PipInstall } from "../components/PipInstall";
import { ZOOM, LINKS } from "../content";
import { clamp01, smoothstep } from "../lib/easing";

// Act I. A 460vh scroll journey: open tight on one line of code, pull back
// until it is a speck of light inside a galaxy of ten thousand machines, then
// resolve into the brand statement.
//
// Overlay styles are written to the DOM imperatively from a single scroll
// subscription. Framer's MotionValue-in-style path converts scroll-linked
// opacity into WAAPI animations, which desync badly with a position:sticky
// target, so we bypass it entirely.
export function HeroAct() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // The canvas reads this every frame without re-rendering React.
  const progressRef = useRef(0);

  const phaseARef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const phaseBRef = useRef<HTMLDivElement>(null);
  const machinesRef = useRef<HTMLSpanElement>(null);
  const resolveRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  const apply = useCallback((p: number) => {
    const r = (a: number, b: number) => clamp01((p - a) / (b - a));
    const set = (el: HTMLElement | null, opacity: number, transform?: string) => {
      if (!el) return;
      el.style.opacity = opacity.toFixed(4);
      if (transform !== undefined) el.style.transform = transform;
    };

    set(phaseARef.current, 1 - r(0.12, 0.2), `translateY(${(-40 * r(0, 0.2)).toFixed(1)}px)`);
    set(codeRef.current, 1 - r(0.18, 0.3), `scale(${(1 - 0.92 * r(0, 0.32)).toFixed(4)})`);

    const bIn = r(0.28, 0.35);
    const bOut = r(0.6, 0.7);
    set(
      phaseBRef.current,
      Math.min(bIn, 1 - bOut),
      `scale(${(0.85 + 0.27 * r(0.28, 0.7)).toFixed(4)})`,
    );

    // Live count synced to the galaxy's ignition wave: the number rips from
    // ~3,000 to 10,000 while the line is on screen.
    if (machinesRef.current) {
      const ignite = smoothstep(0.14, 0.56, p);
      const count = Math.round(Math.pow(ignite, 1.15) * 10_000);
      machinesRef.current.textContent = count.toLocaleString();
    }

    const ro = r(0.62, 0.74);
    set(resolveRef.current, ro, `translateY(${(44 * (1 - r(0.62, 0.76))).toFixed(1)}px)`);
    if (resolveRef.current) {
      resolveRef.current.style.pointerEvents = ro > 0.55 ? "auto" : "none";
    }

    set(cueRef.current, 1 - r(0, 0.04));
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
    if (!reduced) apply(v);
  });

  useEffect(() => {
    progressRef.current = scrollYProgress.get();
    if (!reduced) apply(progressRef.current);
  }, [reduced, apply, scrollYProgress]);

  const canvasActive = useInView(sectionRef, { margin: "600px 0px 600px 0px" });

  return (
    <section
      id="top"
      ref={sectionRef}
      className={reduced ? "relative h-svh" : "relative h-[460vh]"}
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <Scene
          progress={progressRef}
          reducedMotion={reduced}
          active={canvasActive}
        />

        {/* Legibility scrims */}
        <div className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(60%_52%_at_50%_44%,rgba(3,8,13,0.58),rgba(3,8,13,0.08)_64%,rgba(3,8,13,0)_78%)]" />
        <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-b from-void/85 via-transparent to-void/95" />

        {reduced ? (
          <ResolvePanel staticMode />
        ) : (
          <>
            {/* Phase A: one line of Python */}
            <div
              ref={phaseARef}
              className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6"
            >
              <h1 className="h-big max-w-4xl text-center text-ink text-shadow-soft">
                {ZOOM.phaseA}
              </h1>
            </div>

            {/* The code line itself, shrinking into the galaxy core */}
            <div
              ref={codeRef}
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4"
            >
              <div
                className="mt-40 rounded-xl border border-cyan/40 bg-panel/95 px-5 py-3.5 font-mono text-[12px] text-ice backdrop-blur-sm sm:text-[15px]"
                style={{
                  boxShadow:
                    "0 18px 60px -18px rgba(0,0,0,0.78), 0 0 30px rgba(126,203,221,0.16)",
                }}
              >
                <span className="select-none text-cyan">&gt;&gt;&gt; </span>
                {ZOOM.codeLine}
              </div>
            </div>

            {/* Phase B: ten thousand machines */}
            <div
              ref={phaseBRef}
              style={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
            >
              <div
                aria-hidden
                className="absolute inset-[8%] bg-[radial-gradient(ellipse_at_center,rgba(3,8,13,0.84),rgba(3,8,13,0.55)_48%,transparent_74%)]"
              />
              <h2 className="h-mega relative text-shadow-soft">
                <span className="block text-outline">{ZOOM.phaseB[0]}</span>
                <span className="block text-accent">
                  <span ref={machinesRef} className="tnum">
                    10,000
                  </span>{" "}
                  machines
                </span>
                <span className="block text-ink">{ZOOM.phaseB[2]}</span>
              </h2>
            </div>

            {/* Resolve: the brand statement */}
            <div
              ref={resolveRef}
              style={{ opacity: 0, pointerEvents: "none" }}
              className="absolute inset-0 z-10"
            >
              <ResolvePanel />
            </div>

            {/* Scroll cue */}
            <div
              ref={cueRef}
              className="pointer-events-none absolute inset-x-0 bottom-7 z-10 flex flex-col items-center gap-2 text-inkFaint"
            >
              <span className="font-mono text-[10px] uppercase tracking-eyebrow">
                {ZOOM.scrollCue}
              </span>
              <motion.span
                animate={{ y: [0, 7, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="block h-7 w-px bg-gradient-to-b from-ink/50 to-transparent"
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ResolvePanel({ staticMode = false }: { staticMode?: boolean }) {
  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center ${
        staticMode ? "" : "pointer-events-none"
      }`}
    >
      {/* Local scrim so copy stays readable over the dense galaxy core */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(58%_64%_at_50%_52%,rgba(3,8,13,0.94),rgba(3,8,13,0.72)_58%,rgba(3,8,13,0.18)_82%)]"
      />
      <div className={`relative ${staticMode ? "" : "pointer-events-auto"}`}>
        <p className="eyebrow mb-6">{ZOOM.resolve.kicker}</p>
        <h1 className="h-mega text-shadow-soft">
          <span className="block text-[0.42em] leading-[1.05] text-ink">
            {ZOOM.resolve.statement[0]}
          </span>
          <span className="block uppercase text-accent">
            {ZOOM.resolve.statement[1]}
          </span>
          <span className="block text-[0.42em] leading-[1.05] text-ink">
            {ZOOM.resolve.statement[2]}
          </span>
        </h1>
        <p
          className="mx-auto mt-7 max-w-xl text-pretty text-base leading-relaxed text-ink/90 sm:text-lg"
          style={{ textShadow: "0 2px 3px rgba(0,0,0,0.95), 0 0 22px rgba(3,8,13,0.98)" }}
        >
          {ZOOM.resolve.sub}
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <PipInstall size="big" />
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            Star on GitHub
          </a>
        </div>
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-0 gap-y-2">
          {ZOOM.resolve.stats.map((s, i) => (
            <span
              key={s}
              className={`px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/75 sm:text-[12px] ${
                i > 0 ? "border-l border-hairline" : ""
              }`}
              style={{ textShadow: "0 2px 3px rgba(0,0,0,0.95)" }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
