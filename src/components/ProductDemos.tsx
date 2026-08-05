import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";

export const PANEL_SHADOW =
  "0 32px 80px -36px rgba(0,0,0,0.92), 0 0 0 1px rgba(126,203,221,0.03), 0 0 60px -38px rgba(126,203,221,0.5)";

function DemoShell({
  title,
  status,
  label,
  children,
  className = "",
}: {
  title?: string;
  status?: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative isolate overflow-hidden rounded-xl border border-white/10 bg-[#061019] ${className}`}
      style={{ boxShadow: PANEL_SHADOW }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(126,203,221,0.11),rgba(126,203,221,0))]"
      />
      <div
        aria-hidden
        className="relative flex h-11 items-center justify-between border-b border-white/[0.08] bg-white/[0.025] px-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full bg-white/20" />
            <span className="size-2 rounded-full bg-white/15" />
            <span className="size-2 rounded-full bg-white/10" />
          </div>
          {title && (
            <span className="font-mono text-[10px] text-iceFaint sm:text-[11px]">{title}</span>
          )}
        </div>
        {status}
      </div>
      <div aria-hidden className="relative">
        {children}
      </div>
    </div>
  );
}

function useLoopTime(duration: number, finalFrame: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });
  const reduced = useReducedMotion() ?? false;
  const [elapsed, setElapsed] = useState(reduced ? finalFrame : 0);

  useEffect(() => {
    if (reduced) return;
    if (!inView) return;

    const started = performance.now();
    const interval = window.setInterval(() => {
      setElapsed((performance.now() - started) % duration);
    }, 50);

    return () => window.clearInterval(interval);
  }, [duration, finalFrame, inView, reduced]);

  return { elapsed: reduced ? finalFrame : elapsed, reduced, ref };
}

const ARG_EASE = [0.16, 1, 0.3, 1] as const;
// Hold per hardware option, matching the Workloads headline rotation pace.
const ARG_MS = 2_000;

// The three ways to pin hardware on one call. Values keep the code card's
// highlight conventions: warm amber numbers, warm green strings.
const API_ARGS = [
  { key: "cpu", name: "func_cpu=", value: "64", valueClass: "text-amber-200/90" },
  { key: "gpu", name: "func_gpu=", value: '"A100"', valueClass: "text-emerald-300/90" },
  { key: "image", name: "image=", value: '"pytorch"', valueClass: "text-emerald-300/90" },
] as const;

type ApiArg = (typeof API_ARGS)[number];

// The closing paren travels with the option so no gap ever opens inside the
// call; the reserved width just leaves blank space after the line.
function ArgToken({ arg }: { arg: ApiArg }) {
  return (
    <>
      {arg.name}
      <span className={arg.valueClass}>{arg.value}</span>)
    </>
  );
}

// Cycles the call's hardware argument perpetually, in the spirit of the
// Workloads headline. All options render as invisible sizers stacked in one
// grid cell, so the widest reserves the line's width up front and nothing
// reflows. Timer only runs in view; reduced motion rests on func_cpu=64.
function CyclingArg() {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion() ?? false;
  const inView = useInView(ref, { amount: 0.3 });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    const timer = window.setInterval(() => setStep((s) => s + 1), ARG_MS);
    return () => window.clearInterval(timer);
  }, [inView, reduced]);

  const active = reduced ? API_ARGS[0] : API_ARGS[step % API_ARGS.length];

  return (
    <span ref={ref} className="inline-grid text-left align-baseline">
      {API_ARGS.map((arg) => (
        <span key={arg.key} className="invisible col-start-1 row-start-1">
          <ArgToken arg={arg} />
        </span>
      ))}
      <AnimatePresence initial={false}>
        <motion.span
          key={active.key}
          initial={reduced ? false : { opacity: 0, y: "0.24em" }}
          animate={{ opacity: 1, y: "0em" }}
          exit={{ opacity: 0, y: "-0.24em" }}
          transition={{ duration: reduced ? 0 : 0.34, ease: ARG_EASE }}
          className="col-start-1 row-start-1"
        >
          <ArgToken arg={active} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// The one-call API from docs.burla.dev, with the hardware argument cycling
// through CPU, GPU, and container image to show hardware is defined next to
// the code. Shown as main.py, distinct from the scale.py the terminal runs.
export function ApiDemo() {
  return (
    <DemoShell
      title="main.py"
      label="Python script main.py: remote_parallel_map runs fn across inputs, with the hardware argument cycling between 64 CPUs, an A100 GPU, and a pytorch container image"
      className="h-[360px]"
    >
      {/* 15.5px puts the call line (measured with the widest cycling arg) at
          ~92% of the content width between the px-8 gutters, with no overflow. */}
      <div className="flex h-[316px] items-center px-6 sm:px-8">
        <code className="block whitespace-pre font-mono text-[15.5px] leading-9 text-ice/90">
          <span className="block">
            <span className="text-cyan/75">from</span> burla{" "}
            <span className="text-cyan/75">import</span>{" "}
            <span className="text-cyan">remote_parallel_map</span>
          </span>
          <span className="block">&nbsp;</span>
          <span className="block">
            <span className="text-cyan">remote_parallel_map</span>(fn, inputs,{" "}
            <CyclingArg />
          </span>
        </code>
      </div>
    </DemoShell>
  );
}

const range = (start: number, end: number) =>
  Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);

// Same view/reduced-motion gating as useLoopTime, but driven by
// requestAnimationFrame so the terminal scrollback moves every frame.
function useFrameLoop(duration: number, finalFrame: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.25 });
  const reduced = useReducedMotion() ?? false;
  const [elapsed, setElapsed] = useState(reduced ? finalFrame : 0);

  useEffect(() => {
    if (reduced) return;
    if (!inView) return;

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      setElapsed((now - started) % duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [duration, inView, reduced]);

  return { elapsed: reduced ? finalFrame : elapsed, ref };
}

const TERM_COMMAND = "python scale.py";
const TERM_JOBS = 1_000;
const TERM_LINE_PX = 20;
const TERM_VISIBLE_LINES = 13;
const TERM_TYPE_END = 1_000;
const TERM_RUN_START = 1_300;
const TERM_RUN_END = 3_500;
const TERM_DONE_AT = 3_750;

export function SpeedTerminal() {
  const { elapsed, ref } = useFrameLoop(8_200, 5_000);
  const typedLength =
    elapsed >= TERM_TYPE_END
      ? TERM_COMMAND.length
      : Math.floor((elapsed / TERM_TYPE_END) * (TERM_COMMAND.length + 1));

  // Ease-in ramp: the first jobs print one line at a time, then output rips
  // past like real high-volume terminal output.
  const runProgress = Math.min(
    1,
    Math.max(0, (elapsed - TERM_RUN_START) / (TERM_RUN_END - TERM_RUN_START)),
  );
  const printedF = TERM_JOBS * runProgress ** 3;
  const printed = Math.min(TERM_JOBS, Math.floor(printedF));
  const done = elapsed >= TERM_DONE_AT;

  // Scrollback rows: row 0 is the command, rows 1..1000 are jobs (each keeps
  // its fixed number forever), then a blank line, the summary, and a fresh
  // prompt once the run completes. Only the visible window is rendered; the
  // fractional offset drives a transform so lines slide up out of view.
  const lastRow = done ? TERM_JOBS + 3 : printed;
  const rowsF = done ? lastRow + 1 : 1 + printedF;
  const offsetF = Math.max(0, rowsF - TERM_VISIBLE_LINES);
  const firstRow = Math.floor(offsetF);
  const shift = (offsetF - firstRow) * TERM_LINE_PX;
  const visibleRows = range(firstRow, Math.min(lastRow, firstRow + TERM_VISIBLE_LINES));

  const renderRow = (row: number) => {
    if (row === 0) {
      return (
        <p key="command" className="h-5 leading-5 whitespace-nowrap text-ice">
          <span className="mr-2 select-none text-cyan">$</span>
          {TERM_COMMAND.slice(0, typedLength)}
          {elapsed < TERM_RUN_START && <span className="cursor-block" />}
        </p>
      );
    }
    if (row <= TERM_JOBS) {
      // Row r shows input r-1, so output matches scale.py exactly:
      // print(f"[#{x}]") over range(1000) → [#0] through [#999].
      return (
        <p key={row} className="h-5 leading-5 whitespace-nowrap text-iceFaint">
          <span className="mr-2 text-cyan/70">[#{row - 1}]</span>
          running on separate computer
        </p>
      );
    }
    if (row === TERM_JOBS + 1) {
      return <p key="gap" className="h-5" />;
    }
    if (row === TERM_JOBS + 2) {
      return (
        <p key="summary" className="h-5 leading-5 whitespace-nowrap">
          <span className="mr-2 text-emerald-300">✓</span>
          <span className="font-medium text-ice">1,000 jobs completed</span>
          <span className="text-iceFaint"> in </span>
          <span className="tnum text-cyan">0.83s</span>
        </p>
      );
    }
    return (
      <p key="prompt" className="h-5 leading-5 whitespace-nowrap">
        <span className="mr-2 select-none text-cyan">$</span>
        <span className="cursor-block" />
      </p>
    );
  };

  return (
    <div ref={ref}>
      <DemoShell
        title="scale.py"
        label="Terminal animation running python scale.py across one thousand separate computers in 0.83 seconds"
        className="h-[360px]"
      >
        <div className="flex h-[316px] items-center px-5 font-mono text-[11px] sm:px-7 sm:text-[12px]">
          <div
            className="w-full overflow-hidden"
            style={{ height: TERM_VISIBLE_LINES * TERM_LINE_PX }}
          >
            <div className="will-change-transform" style={{ transform: `translateY(-${shift}px)` }}>
              {visibleRows.map(renderRow)}
            </div>
          </div>
        </div>
      </DemoShell>
    </div>
  );
}

// Official brand marks for the agent title bar, rendered monochrome in the
// bar's muted ink tint. Path data is the real vector art from Simple Icons
// (Cursor and Claude from the current set, OpenAI from simple-icons@15, the
// last release carrying it).
function CursorMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="Cursor"
      className="h-[15px] w-[15px]"
      fill="currentColor"
    >
      <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
    </svg>
  );
}

function CodexMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="OpenAI Codex"
      className="h-[15px] w-[15px]"
      fill="currentColor"
    >
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

function ClaudeMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="Claude"
      className="h-[14px] w-[14px]"
      fill="currentColor"
    >
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </svg>
  );
}

const agentPrompt = "vector embed every article on Wikipedia";

// Timeline mirrors a real Claude Code / Codex session: prompt is typed into
// the input box, submitted into the transcript, then ⏺ blocks stream in.
const AGENT_SUBMIT = 2_000;

type AgentEvent = {
  at: number;
  glyph: string;
  glyphClass: string;
  body: ReactNode;
  results?: { at: number; text: string }[];
};

const AGENT_EVENTS: AgentEvent[] = [
  {
    at: 2_450,
    glyph: "⏺",
    glyphClass: "text-ice/80",
    body: <span className="text-ice/90">I'll fan this out across 1,000 VMs with Burla.</span>,
  },
  {
    at: 3_250,
    glyph: "⏺",
    glyphClass: "text-emerald-300",
    body: (
      <span className="text-ice">
        <span className="font-medium">Write</span>
        <span className="text-iceDim">(embed_wikipedia.py)</span>
      </span>
    ),
    results: [{ at: 3_600, text: "Added 26 lines" }],
  },
  {
    at: 4_350,
    glyph: "⏺",
    glyphClass: "text-emerald-300",
    body: (
      <span className="text-ice">
        <span className="font-medium">Bash</span>
        <span className="text-iceDim">(python embed_wikipedia.py)</span>
      </span>
    ),
    results: [
      { at: 4_700, text: "remote_parallel_map(embed_article, articles)" },
      { at: 5_050, text: "218,492,113 chunks · 1,000 VMs" },
    ],
  },
  {
    at: 6_200,
    glyph: "⏺",
    glyphClass: "text-ice/80",
    body: <span className="text-ice/90">Done. Every article embedded in 108s.</span>,
  },
];

export function AgentTerminal() {
  const { elapsed, ref } = useLoopTime(9_800, 6_600);
  const typeEnd = 1_700;
  const typedLength =
    elapsed >= typeEnd
      ? agentPrompt.length
      : Math.floor((elapsed / typeEnd) * (agentPrompt.length + 1));
  const submitted = elapsed >= AGENT_SUBMIT;
  const working = elapsed >= 2_450 && elapsed < 6_200;

  return (
    <div ref={ref}>
      <DemoShell
        status={
          <span className="flex items-center gap-2.5 text-iceDim">
            <CursorMark />
            <CodexMark />
            <ClaudeMark />
          </span>
        }
        label="AI coding agent session in Cursor, Codex, or Claude Code embedding every Wikipedia article with Burla's remote_parallel_map"
        className="h-[360px]"
      >
        <div className="flex h-[316px] flex-col px-5 py-5 font-mono text-[10px] leading-[1.7] sm:px-7 sm:py-6 sm:text-[11px]">
          <div
            className={`grid grid-cols-[18px_1fr] transition-opacity duration-300 ${
              submitted ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="select-none text-iceFaint">&gt;</span>
            <span className="text-iceDim">{agentPrompt}</span>
          </div>

          <div className="mt-3 space-y-2.5">
            {AGENT_EVENTS.map((event) => (
              <div
                key={event.at}
                className={`transition-opacity duration-300 ${
                  elapsed >= event.at ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="grid grid-cols-[18px_1fr]">
                  <span className={`select-none ${event.glyphClass}`}>{event.glyph}</span>
                  <span>{event.body}</span>
                </div>
                {event.results?.map((result) => (
                  <div
                    key={result.at}
                    className={`grid grid-cols-[18px_1fr] transition-opacity duration-300 ${
                      elapsed >= result.at ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <span />
                    <span className="text-iceFaint">
                      <span className="select-none">⎿&nbsp;&nbsp;</span>
                      {result.text}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-auto">
            <div
              className={`mb-2 text-[9px] transition-opacity duration-300 sm:text-[10px] ${
                working ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="mr-2 select-none text-coral">✳</span>
              <span className="text-iceFaint">Embedding… (esc to interrupt)</span>
            </div>
            <div className="rounded-md border border-white/15 bg-white/[0.02] px-3 py-2">
              <span className="mr-2 select-none text-iceFaint">&gt;</span>
              {!submitted && <span className="text-ice">{agentPrompt.slice(0, typedLength)}</span>}
              <span className="cursor-block" />
            </div>
          </div>
        </div>
      </DemoShell>
    </div>
  );
}

const WIKIPEDIA_CHUNKS = 218_492_113;

// Job started at 1:12:47 PM; log timestamps tick forward with the run.
function clockAt(secondsAfterStart: number) {
  const total = 47 + Math.max(0, secondsAfterStart);
  const minutes = 12 + Math.floor(total / 60);
  const seconds = total % 60;
  return `1:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} PM`;
}

export function DashboardDemo() {
  const { elapsed, ref } = useLoopTime(10_000, 5_000);
  const runEnd = 8_400;
  const rawProgress = Math.min(1, elapsed / runEnd);
  const progress = Math.min(1, 0.03 + rawProgress * 0.97);
  const complete = rawProgress >= 1;
  const completed = Math.min(WIKIPEDIA_CHUNKS, Math.floor(WIKIPEDIA_CHUNKS * progress));
  const remaining = WIKIPEDIA_CHUNKS - completed;
  const jobSeconds = Math.min(108, Math.round(progress * 108));
  const logRows = complete
    ? [...range(completed - 4, completed - 1).map((n) => ({ input: n, done: false })), { input: completed, done: true }]
    : range(completed - 4, completed).map((n) => ({ input: n, done: false }));

  return (
    <div ref={ref}>
      <DemoShell
        title="app.burla.dev"
        label="Burla dashboard job page with a running status chip, function call progress bar, and streaming logs"
        className="h-[360px]"
      >
        <div className="flex h-[316px] flex-col px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="truncate text-[12px] sm:text-[13px]">
              <span className="text-iceFaint">Jobs</span>
              <span className="mx-1.5 text-iceFaint">›</span>
              <span className="font-medium text-ice">embed_wikipedia-81iz1_kfQ3J</span>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md bg-red-500/85 px-2.5 py-1 text-[9px] font-medium text-white transition-opacity duration-300 ${
                complete ? "opacity-35" : "opacity-100"
              }`}
            >
              <span aria-hidden className="text-[7px] leading-none">■</span>
              Stop
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3 whitespace-nowrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-[2px] text-[8px] font-medium tracking-[0.1em] ${
                complete
                  ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-200"
                  : "border-amber-300/35 bg-amber-300/10 text-amber-200"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${complete ? "bg-emerald-300" : "bg-amber-300"}`}
              />
              {complete ? "COMPLETE" : "RUNNING"}
            </span>
            <span className="text-[9.5px] text-iceFaint">
              Function: <span className="font-mono text-iceDim">embed_article</span>
            </span>
            <span className="hidden text-[9.5px] text-iceFaint lg:inline">
              Started At: 1:12 PM EDT, Monday, Aug 3
            </span>
          </div>

          <div className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.015] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 text-[8.5px]">
              <span className="whitespace-nowrap text-iceDim">
                <span className="tnum font-mono text-ice">{completed.toLocaleString()}</span>
                <span className="text-iceFaint"> / </span>
                <span className="tnum font-mono text-ice">{WIKIPEDIA_CHUNKS.toLocaleString()}</span>
                <span className="text-iceFaint"> Function calls complete.</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-[7.5px] text-iceFaint">
                <span className="flex items-center gap-1">
                  <span className="size-1 rounded-full bg-emerald-300" />
                  Success <span className="tnum font-mono">{completed.toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1 rounded-full bg-red-400" />
                  Failed <span className="tnum font-mono">0</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1 rounded-full bg-amber-300" />
                  Remaining <span className="tnum font-mono">{remaining.toLocaleString()}</span>
                </span>
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-300/25">
              <div
                className="h-full rounded-full bg-emerald-300/90"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.015]">
            <div className="flex items-center gap-2 border-b border-white/[0.07] px-3 py-1.5 text-[8.5px] text-iceFaint">
              <span>Index</span>
              <span className="tnum rounded border border-white/[0.12] px-1.5 py-px font-mono text-iceDim">
                0
              </span>
              <span>
                of <span className="tnum font-mono">{WIKIPEDIA_CHUNKS.toLocaleString()}</span>
              </span>
              <span className="rounded border border-white/[0.12] px-1 py-px leading-none">‹</span>
              <span className="rounded border border-white/[0.12] px-1 py-px leading-none">›</span>
              <span className="ml-2">Has logs</span>
              <span className="relative h-2.5 w-5 rounded-full bg-cyan/40">
                <span className="absolute right-px top-px size-2 rounded-full bg-ice/90" />
              </span>
              <span className="ml-1">Failed only</span>
              <span className="tnum rounded border border-white/[0.12] px-1.5 py-px font-mono text-iceDim">
                0
              </span>
            </div>
            <div className="border-b border-white/[0.06] py-1 text-center text-[8px] text-iceFaint">
              Monday, August 3, 2026
            </div>
            <div className="flex-1 font-mono text-[8.5px] leading-none text-iceFaint">
              {logRows.map((row) => (
                <div
                  key={row.input}
                  className="flex items-center gap-3 border-b border-white/[0.05] px-3 py-[7px]"
                >
                  <span className="tnum shrink-0">
                    {clockAt(jobSeconds - (complete ? 0 : completed - row.input))}
                  </span>
                  {row.done ? (
                    <span className="truncate text-iceDim">
                      Done! ts{1785715967 + jobSeconds}.
                      {String(row.input % 10_000_000).padStart(7, "0")}
                    </span>
                  ) : (
                    <span className="truncate">
                      <span className="text-cyan/75">[Input={row.input.toLocaleString()}]</span>
                      <span className="text-iceDim"> embedded chunk </span>
                      ts{1785715967 + jobSeconds}.
                      {String(row.input % 10_000_000).padStart(7, "0")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DemoShell>
    </div>
  );
}
