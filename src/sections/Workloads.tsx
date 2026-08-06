import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Reveal } from "../components/Reveal";
import { FeaturedExamplesRail } from "../components/FeaturedExamplesRail";
import { DOMAIN_COLORS, WORKLOADS } from "../content";

const EASE = [0.16, 1, 0.3, 1] as const;
// Hold per cycling word. Swap transitions overlap this, so each field name is
// on screen for roughly two seconds, slow enough to actually read.
const WORD_MS = 2000;

// The accent line cycles through field names perpetually, with the real phrase
// ("any kind of data work.") folded into the rotation so the message keeps
// returning every lap. An invisible copy of that phrase (the widest) reserves
// the line's box up front and the live word is absolutely stacked on top, so
// the heading never changes size and nothing around it moves. The timer only
// runs while the line is on screen. Reduced motion rests on the real phrase.
function CyclingHeadingLine() {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion() ?? false;
  const inView = useInView(ref, { margin: "-80px" });
  const [step, setStep] = useState(0);

  const finalText = WORKLOADS.heading[1];
  // The fields plus the real phrase (domain null → default accent color).
  const rotation = useMemo(
    () => [
      ...WORKLOADS.headingCycle,
      { text: finalText, domain: null as string | null },
    ],
    [finalText],
  );

  useEffect(() => {
    if (!inView || reduced) return;
    const timer = window.setInterval(() => setStep((s) => s + 1), WORD_MS);
    return () => window.clearInterval(timer);
  }, [inView, reduced]);

  const active = reduced
    ? { text: finalText, domain: null as string | null }
    : rotation[step % rotation.length];
  const tint = active.domain ? `rgb(${DOMAIN_COLORS[active.domain]})` : undefined;

  return (
    <span ref={ref} aria-hidden="true" className="relative block text-accent">
      {/* Invisible sizer pins the line's width and height to the final phrase. */}
      <span className="invisible sm:whitespace-nowrap">{finalText}</span>
      <AnimatePresence initial={false}>
        <motion.span
          key={reduced ? "settled" : step}
          initial={reduced ? false : { opacity: 0, y: "0.24em" }}
          animate={{ opacity: 1, y: "0em" }}
          exit={{ opacity: 0, y: "-0.24em" }}
          transition={{ duration: reduced ? 0 : 0.34, ease: EASE }}
          className="absolute inset-x-0 top-0 sm:whitespace-nowrap"
          style={tint ? { color: tint } : undefined}
        >
          {active.text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Workloads() {
  return (
    <section
      id="workloads"
      className="relative py-24 sm:py-32"
      aria-labelledby="workloads-title"
    >
      <FeaturedExamplesRail
        align="site"
        headerLeft={
          <Reveal>
            <h2
              id="workloads-title"
              className="h-big max-w-4xl"
            >
              <span className="block text-ink">{WORKLOADS.heading[0]}</span>
              {/* Screen readers get the settled phrase immediately; the
                  cycling line below is purely visual. */}
              <span className="sr-only">{WORKLOADS.heading[1]}</span>
              <CyclingHeadingLine />
            </h2>
          </Reveal>
        }
        headerRight={
          <Reveal delay={80} y={12}>
            <Link
              to={WORKLOADS.moreHref}
              className="group inline-flex items-center gap-5 border border-accent/45 bg-card/60 px-5 py-4 font-mono text-[12px] font-medium text-ink transition-[border-color,background-color,color] duration-200 hover:border-accent hover:bg-accent hover:text-void"
            >
              {WORKLOADS.moreLabel}
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          </Reveal>
        }
      />
    </section>
  );
}
