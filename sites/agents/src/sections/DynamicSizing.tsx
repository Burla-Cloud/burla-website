import { useEffect, useRef, useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { Reveal } from "../components/Reveal";

const SLOTS_PER_VM = 8;

const ACCENT = "#155E75";
const WARM = "#C99A4A";
const HEAVY = "#B4631F";

type VmSnapshot = {
  cpuPct: number;
  memPct: number;
  workers: string[]; // worker IDs in slot order; "" means empty slot
  status: string;
};

type Phase = {
  ms: number;
  step: string;
  caption: string;
  vm1: VmSnapshot;
  vm2: VmSnapshot | null;
};

const EMPTY_VM2: VmSnapshot = {
  cpuPct: 0,
  memPct: 0,
  workers: [],
  status: "retired",
};

// Workers w1..w8 keep their identity across phases. When VM-02 boots, the
// last three (w6, w7, w8) physically migrate from VM-01 to VM-02 via Framer's
// shared layout animation, and migrate back when memory frees on VM-01.
const PHASES: Phase[] = [
  {
    ms: 11000,
    step: "step 1 of 6",
    caption:
      "Burla starts conservative. Four workers on VM-01, plenty of CPU and memory headroom.",
    vm1: {
      cpuPct: 50,
      memPct: 22,
      workers: ["w1", "w2", "w3", "w4"],
      status: "4 workers running",
    },
    vm2: null,
  },
  {
    ms: 12000,
    step: "step 2 of 6",
    caption:
      "Burla packs the idle slots with speculative work. CPU climbs gradually to the sweet spot near 90%.",
    vm1: {
      cpuPct: 88,
      memPct: 38,
      workers: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
      status: "8 workers running",
    },
    vm2: null,
  },
  {
    ms: 11000,
    step: "step 3 of 6",
    caption:
      "A 500 MB PDF lands on one of the workers. Memory climbs. w6, w7, w8 are the lightest and are about to get evicted.",
    vm1: {
      cpuPct: 76,
      memPct: 84,
      workers: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
      status: "memory pressure",
    },
    vm2: null,
  },
  {
    ms: 12500,
    step: "step 4 of 6",
    caption:
      "VM-02 boots and w6, w7, w8 migrate over from VM-01. Heavy task gets more room on VM-01, parallelism stays high.",
    vm1: {
      cpuPct: 70,
      memPct: 80,
      workers: ["w1", "w2", "w3", "w4", "w5"],
      status: "heavy task running",
    },
    vm2: {
      cpuPct: 62,
      memPct: 30,
      workers: ["w6", "w7", "w8"],
      status: "catching up",
    },
  },
  {
    ms: 12500,
    step: "step 5 of 6",
    caption:
      "Heavy task finishes. Memory frees up on VM-01. w6, w7, w8 migrate back so all eight workers run on VM-01 again.",
    vm1: {
      cpuPct: 87,
      memPct: 36,
      workers: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
      status: "8 workers running",
    },
    vm2: {
      cpuPct: 0,
      memPct: 0,
      workers: [],
      status: "draining",
    },
  },
  {
    ms: 10500,
    step: "step 6 of 6",
    caption:
      "VM-02 retires. You stop paying for the extra machine.",
    vm1: {
      cpuPct: 88,
      memPct: 38,
      workers: ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"],
      status: "8 workers running",
    },
    vm2: null,
  },
];

export function DynamicSizing() {
  return (
    <section id="dynamic-sizing" className="section bg-cream text-creamInk">
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <Reveal>
              <div className="eyebrow-on-cream mb-5">How it works</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section-cream text-balance">
                Compute that{" "}
                <em className="not-italic underline-accent">sizes itself</em>.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="lead-cream mt-7 max-w-[500px] text-pretty">
                Agents are bad at sizing infrastructure. They can&rsquo;t know
                which task needs 2GB of RAM and which needs 64GB before the
                job runs.
              </p>
              <p className="lead-cream mt-5 max-w-[500px] text-pretty">
                Burla watches CPU and memory in real time, gives heavy tasks
                more room, fills idle capacity with smaller work, and adds
                machines when the job needs more parallelism.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-7 lg:mt-10">
            <Reveal delay={120} y={16}>
              <ConcurrencyDemo />
            </Reveal>
          </div>
        </div>

      </div>
    </section>
  );
}

function ConcurrencyDemo() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [armed, setArmed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [lastVm2, setLastVm2] = useState<VmSnapshot>(EMPTY_VM2);

  // Refs so the auto-advance timer can resume from where pause interrupted it,
  // rather than restarting the full phase duration after each pause/unpause.
  const phaseStartRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number | null>(null);
  const prevPhaseRef = useRef(phaseIdx);
  const prevArmedRef = useRef(false);

  // Track in-view status so scrolling away pauses the demo and avoids
  // shifting page content under the user when they're reading elsewhere.
  useEffect(() => {
    const el = document.getElementById("dynamic-sizing");
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setArmed(true);
            setInView(true);
          } else {
            setInView(false);
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Effective pause: explicit user pause OR scrolled out of view. Both use
  // the same elapsed-time snapshot so resuming picks up exactly where we left.
  const effectivePaused = paused || !inView;

  useEffect(() => {
    if (!armed) return;

    // First time the demo arms (scrolled into view): start the clock now.
    if (!prevArmedRef.current) {
      phaseStartRef.current = performance.now();
      pausedElapsedRef.current = null;
      prevArmedRef.current = true;
    }

    // Manual or auto phase change resets the start time so the new phase
    // always plays through its full duration.
    if (prevPhaseRef.current !== phaseIdx) {
      phaseStartRef.current = performance.now();
      pausedElapsedRef.current = null;
      prevPhaseRef.current = phaseIdx;
    }

    if (effectivePaused) {
      // Snapshot elapsed time once when we enter pause, then stop.
      if (pausedElapsedRef.current == null) {
        pausedElapsedRef.current =
          performance.now() - phaseStartRef.current;
      }
      return;
    }

    // Resuming from pause: shift the virtual start so the remaining time
    // matches what was left when the user hit pause / scrolled away.
    if (pausedElapsedRef.current != null) {
      phaseStartRef.current =
        performance.now() - pausedElapsedRef.current;
      pausedElapsedRef.current = null;
    }

    const elapsed = performance.now() - phaseStartRef.current;
    const delay = Math.max(50, PHASES[phaseIdx].ms - elapsed);
    const id = window.setTimeout(() => {
      setPhaseIdx((i) => (i + 1) % PHASES.length);
    }, delay);
    return () => clearTimeout(id);
  }, [armed, phaseIdx, effectivePaused]);

  const phase = PHASES[phaseIdx];
  const vm2Visible = phase.vm2 !== null;

  useEffect(() => {
    if (phase.vm2) setLastVm2(phase.vm2);
  }, [phase.vm2]);

  const goPrev = () =>
    setPhaseIdx((i) => (i - 1 + PHASES.length) % PHASES.length);
  const goNext = () => setPhaseIdx((i) => (i + 1) % PHASES.length);
  const togglePaused = () => setPaused((p) => !p);

  return (
    <div className="surface-cream-deep overflow-hidden">
      <div className="flex items-center justify-between border-b border-creamLine px-5 py-3 md:px-6 flex-wrap gap-y-2">
        <div className="flex items-center gap-3">
          <span className="mono text-[13px] text-creamInk">
            concurrency control{paused ? " · paused" : " · dynamic"}
          </span>
        </div>
        <DemoControls
          phaseIdx={phaseIdx}
          total={PHASES.length}
          paused={paused}
          onPrev={goPrev}
          onNext={goNext}
          onTogglePaused={togglePaused}
        />
      </div>

      <div className="px-5 py-5 md:px-6 md:py-6">
        <div className="min-h-[58px] md:min-h-[44px] mb-5">
          <div
            key={phase.step}
            className="text-creamInk text-[13.5px] md:text-[14.5px] leading-snug text-pretty animate-caption-fade"
          >
            {phase.caption}
          </div>
        </div>

        <LayoutGroup id="dynamic-sizing-workers">
          <VmPanel
            name="VM-01"
            spec="n2-standard-8 · 8 cpu · 32GB"
            state={phase.vm1}
          />

          <div
            className="overflow-hidden transition-all ease-out"
            style={{
              maxHeight: vm2Visible ? 320 : 0,
              opacity: vm2Visible ? 1 : 0,
              marginTop: vm2Visible ? 16 : 0,
              transitionDuration: "900ms",
            }}
            aria-hidden={!vm2Visible}
          >
            <VmPanel
              name="VM-02"
              spec="n2-standard-8 · 8 cpu · 32GB"
              state={phase.vm2 ?? lastVm2}
            />
          </div>
        </LayoutGroup>
      </div>
    </div>
  );
}

function DemoControls({
  phaseIdx,
  total,
  paused,
  onPrev,
  onNext,
  onTogglePaused,
}: {
  phaseIdx: number;
  total: number;
  paused: boolean;
  onPrev: () => void;
  onNext: () => void;
  onTogglePaused: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous step"
        className="h-7 w-7 rounded-full border border-creamLine flex items-center justify-center text-creamMuted hover:text-creamInk hover:border-creamInk/40 transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M7.5 2.5 4 6l3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={onTogglePaused}
        aria-label={paused ? "Play" : "Pause"}
        className="h-7 px-3 rounded-full border border-creamLine flex items-center gap-2 text-creamInk hover:border-creamInk/40 transition-colors"
      >
        {paused ? (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M3.5 2.5v7l6-3.5-6-3.5Z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden>
            <rect x="3.25" y="2.5" width="2" height="7" rx="0.4" fill="currentColor" />
            <rect x="6.75" y="2.5" width="2" height="7" rx="0.4" fill="currentColor" />
          </svg>
        )}
        <span className="mono text-[11px] tnum text-creamMuted">
          {phaseIdx + 1}/{total}
        </span>
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next step"
        className="h-7 w-7 rounded-full border border-creamLine flex items-center justify-center text-creamMuted hover:text-creamInk hover:border-creamInk/40 transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M4.5 2.5 8 6l-3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

function VmPanel({
  name,
  spec,
  state,
}: {
  name: string;
  spec: string;
  state: VmSnapshot;
}) {
  return (
    <div className="rounded-lg border border-creamLine bg-[#0F1419]/60 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-creamLine flex-wrap gap-y-1">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: ACCENT }}
          />
          <span className="mono text-[12px] text-creamInk font-medium">
            {name}
          </span>
          <span className="mono text-[11px] text-creamSubtle hidden md:inline">
            {spec}
          </span>
        </div>
        <span className="mono text-[11px] text-creamMuted">{state.status}</span>
      </div>

      <div className="px-3.5 py-3.5">
        <StatBar label="cpu" value={state.cpuPct} kind="cpu" />
        <div className="h-2" />
        <StatBar label="mem" value={state.memPct} kind="mem" />

        <div className="mt-4 grid grid-cols-8 gap-2">
          {Array.from({ length: SLOTS_PER_VM }, (_, i) => {
            const workerId = state.workers[i] ?? null;
            return <WorkerSlot key={i} workerId={workerId} />;
          })}
        </div>
      </div>
    </div>
  );
}

function WorkerSlot({ workerId }: { workerId: string | null }) {
  return (
    <div className="aspect-square rounded-md border border-dashed border-creamLine relative overflow-hidden">
      {workerId && (
        <motion.div
          layoutId={workerId}
          layout
          className="absolute inset-0 rounded-md flex items-center justify-center"
          transition={{
            layout: { duration: 1.6, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.45, ease: "easeOut" },
          }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          style={{ zIndex: 1 }}
        >
          <div
            className="absolute inset-[2px] rounded-[5px]"
            style={{ backgroundColor: ACCENT, opacity: 0.85 }}
          />
          <div
            className="absolute inset-0 rounded-md pointer-events-none"
            style={{
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: ACCENT,
            }}
          />
          <span className="relative mono font-semibold text-[10px] md:text-[11px] uppercase tracking-wider leading-none select-none text-creamInk">
            {workerId}
          </span>
        </motion.div>
      )}
    </div>
  );
}

function StatBar({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: "cpu" | "mem";
}) {
  const color = (() => {
    if (kind === "cpu") {
      if (value > 95) return HEAVY;
      if (value >= 80) return ACCENT;
      return ACCENT;
    }
    if (value > 75) return HEAVY;
    if (value > 55) return WARM;
    return ACCENT;
  })();

  return (
    <div className="flex items-center gap-3">
      <span className="mono text-[10px] uppercase tracking-eyebrow text-creamSubtle w-[32px] shrink-0">
        {label}
      </span>
      <div className="flex-1 relative h-2.5 rounded-sm bg-creamLine/50 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{
            width: `${value}%`,
            backgroundColor: color,
            opacity: 0.88,
            transition:
              "width 2800ms cubic-bezier(0.22, 1, 0.36, 1), background-color 2200ms ease",
          }}
        />
      </div>
      <span className="mono text-[11.5px] tnum text-creamInk w-[36px] text-right">
        {value}%
      </span>
    </div>
  );
}
