import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

// The atmosphere between space and daylight. Descent is a tall scroll band
// that falls from the void through cloud decks into a bright sky; DaySky is
// the backdrop for every light-themed section below it.

type Puff = {
  left: string;
  top: string;
  width: string;
  height: number;
  opacity: number;
  blur: number;
};

function PuffLayer({
  puffs,
  y,
  drift = false,
}: {
  puffs: Puff[];
  y?: MotionValue<number> | number;
  drift?: boolean;
}) {
  return (
    <motion.div style={{ y }} className="absolute inset-0" aria-hidden>
      {puffs.map((p, i) => (
        <div
          key={i}
          className={`cloud ${drift ? "cloud-drift" : ""}`}
          style={{
            left: p.left,
            top: p.top,
            width: p.width,
            height: p.height,
            opacity: p.opacity,
            filter: `blur(${p.blur}px)`,
            animationDuration: drift ? `${64 + i * 17}s` : undefined,
          }}
        />
      ))}
    </motion.div>
  );
}

// High wisps you fall past first: barely-lit vapor in the dark.
const FAR: Puff[] = [
  { left: "-6%", top: "34%", width: "46%", height: 64, opacity: 0.07, blur: 26 },
  { left: "34%", top: "40%", width: "56%", height: 78, opacity: 0.1, blur: 30 },
  { left: "62%", top: "33%", width: "42%", height: 60, opacity: 0.07, blur: 26 },
  { left: "12%", top: "45%", width: "40%", height: 66, opacity: 0.09, blur: 28 },
];

// Mid deck: dawn-lit grey.
const MID: Puff[] = [
  { left: "-12%", top: "54%", width: "56%", height: 108, opacity: 0.2, blur: 30 },
  { left: "28%", top: "59%", width: "62%", height: 122, opacity: 0.26, blur: 32 },
  { left: "64%", top: "52%", width: "46%", height: 98, opacity: 0.18, blur: 28 },
  { left: "8%", top: "65%", width: "52%", height: 112, opacity: 0.24, blur: 30 },
];

// The deck you punch through right before daylight.
const NEAR: Puff[] = [
  { left: "-14%", top: "72%", width: "62%", height: 160, opacity: 0.55, blur: 26 },
  { left: "24%", top: "78%", width: "72%", height: 190, opacity: 0.7, blur: 28 },
  { left: "56%", top: "70%", width: "56%", height: 150, opacity: 0.6, blur: 26 },
  { left: "2%", top: "86%", width: "78%", height: 210, opacity: 0.82, blur: 30 },
  { left: "52%", top: "84%", width: "68%", height: 200, opacity: 0.78, blur: 30 },
];

export function Descent() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Clouds rise past the viewport faster than the page scrolls, which reads
  // as falling through them.
  const yFar = useTransform(scrollYProgress, [0, 1], [90, -140]);
  const yMid = useTransform(scrollYProgress, [0, 1], [180, -280]);
  const yNear = useTransform(scrollYProgress, [0, 1], [300, -460]);

  return (
    <section
      ref={ref}
      aria-hidden
      className="relative h-[135vh] overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #03080D 0%, #050F19 15%, #0A2135 30%, #16405A 44%, #33678A 57%, #6C9FBE 70%, #9CCAE2 82%, #B7DDEF 92%, #C4E4F2 100%)",
      }}
    >
      <PuffLayer puffs={FAR} y={reduced ? 0 : yFar} />
      <PuffLayer puffs={MID} y={reduced ? 0 : yMid} />
      <PuffLayer puffs={NEAR} y={reduced ? 0 : yNear} />
      {/* Blend cleanly into the day sky below. */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{
          background: "linear-gradient(180deg, rgba(196,228,242,0) 0%, #C4E4F2 100%)",
        }}
      />
    </section>
  );
}

// Clouds around the "what is burla" section, thinning to clear sky below.
const DAY_CLOUDS: Puff[] = [
  { left: "-10%", top: "40px", width: "58%", height: 170, opacity: 0.9, blur: 24 },
  { left: "42%", top: "120px", width: "70%", height: 200, opacity: 0.85, blur: 28 },
  { left: "8%", top: "300px", width: "50%", height: 150, opacity: 0.7, blur: 26 },
  { left: "60%", top: "430px", width: "52%", height: 150, opacity: 0.65, blur: 28 },
  { left: "-8%", top: "620px", width: "44%", height: 130, opacity: 0.55, blur: 30 },
  { left: "34%", top: "760px", width: "56%", height: 140, opacity: 0.45, blur: 32 },
  { left: "66%", top: "950px", width: "44%", height: 120, opacity: 0.35, blur: 32 },
  { left: "4%", top: "1150px", width: "48%", height: 120, opacity: 0.28, blur: 34 },
  { left: "40%", top: "1450px", width: "52%", height: 110, opacity: 0.18, blur: 36 },
  { left: "-6%", top: "1800px", width: "40%", height: 100, opacity: 0.12, blur: 36 },
  { left: "58%", top: "2200px", width: "46%", height: 100, opacity: 0.08, blur: 38 },
];

export function DaySky() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #C4E4F2 0px, #D8ECF6 700px, #E8F4FA 1500px, #F1F9FC 2400px, #F1F9FC 100%)",
        }}
      />
      <PuffLayer puffs={DAY_CLOUDS} drift />
    </div>
  );
}
