import { useEffect, useRef, useState } from "react";

/**
 * HeroDemo — a single light IDE panel. The code types itself out (with live
 * syntax highlighting) and stays on screen; once it finishes, the terminal
 * below "runs" it and streams the output. Loops on a gentle delay. Starts when
 * scrolled into view.
 */

const CODE = `from burla import remote_parallel_map

my_inputs = list(range(1000))

def my_function(x):
    print(f"[#{x}] running on separate computer")

remote_parallel_map(my_function, my_inputs)`;

type Out = { text: string; tone: "cmd" | "muted" | "line" | "done" };

// Rapidly climb through the indices the code would print (0 → 999) so the run
// feels real. Only the last few lines are visible at once (the box scrolls).
const STREAM_IDX: number[] = (() => {
  const out: number[] = [];
  let k = 0;
  out.push(0);
  while (k < 999) {
    k = Math.min(999, k + (k < 9 ? 1 : 17 + (k % 7)));
    out.push(k);
  }
  return out;
})();

// The command the user "runs" — typed out char by char in the terminal.
const CMD = "python scale.py";

const OUTPUT: Out[] = [
  { text: CMD, tone: "cmd" },
  { text: "dispatching my_function across 1,000 VMs", tone: "muted" },
  ...STREAM_IDX.map(
    (k): Out => ({ text: `[#${k}] running on separate computer`, tone: "line" }),
  ),
  { text: "done · 1,000 / 1,000 functions finished in 0.94s", tone: "done" },
];

// How many terminal lines are visible at once (stays inside the box).
const TERM_WINDOW = 6;

const KW = new Set([
  "from", "import", "def", "as", "return", "for", "in", "if", "else", "with",
  "class", "lambda", "True", "False", "None",
]);
const BI = new Set(["list", "range", "print", "len", "dict", "set", "str", "int"]);
const HL = new Set(["remote_parallel_map", "burla"]);

type Tok = { c: string; v: string };

function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === "#") {
      out.push({ c: "cm", v: line.slice(i) });
      break;
    }
    if (ch === '"' || ch === "'" || (ch === "f" && (line[i + 1] === '"' || line[i + 1] === "'"))) {
      const start = i;
      const q = ch === "f" ? line[i + 1] : ch;
      let j = ch === "f" ? i + 2 : i + 1;
      while (j < line.length && line[j] !== q) {
        if (line[j] === "\\") j += 2;
        else j++;
      }
      j = Math.min(j + 1, line.length);
      out.push({ c: "st", v: line.slice(start, j) });
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9_.]/.test(line[j])) j++;
      out.push({ c: "nm", v: line.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const w = line.slice(i, j);
      out.push({ c: KW.has(w) ? "kw" : HL.has(w) ? "hl" : BI.has(w) ? "bi" : "tx", v: w });
      i = j;
      continue;
    }
    let j = i;
    while (j < line.length && !/[A-Za-z0-9_'"#]/.test(line[j])) j++;
    out.push({ c: "tx", v: line.slice(i, j === i ? i + 1 : j) });
    i = j === i ? i + 1 : j;
  }
  return out;
}

const COLOR: Record<string, string> = {
  kw: "text-[#7C3AED]", // keywords — violet
  bi: "text-[#2563EB]", // builtins — blue
  hl: "text-[#0E7490] font-semibold", // burla / remote_parallel_map — teal
  st: "text-[#15803D]", // strings — green
  nm: "text-[#C2410C]", // numbers — orange
  cm: "text-[#94A3B8]", // comments — slate
  tx: "text-[#1E293B]", // default — slate ink
};

const LINES = CODE.split("\n");

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function HeroDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [typed, setTyped] = useState(0);
  const [running, setRunning] = useState(false);
  const [shownOut, setShownOut] = useState(0);
  const [cmdLen, setCmdLen] = useState(0);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setArmed(true);
            obs.unobserve(el);
          }
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!armed) return;
    if (prefersReducedMotion()) {
      setTyped(CODE.length);
      setRunning(true);
      setCmdLen(CMD.length);
      setShownOut(OUTPUT.length);
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    setTyped(0);
    setRunning(false);
    setShownOut(0);
    setCmdLen(0);

    let t = 0;
    const typeTick = () => {
      if (cancelled) return;
      t += 1;
      setTyped(t);
      if (t < CODE.length) {
        const c = CODE[t - 1];
        timers.push(window.setTimeout(typeTick, c === "\n" ? 90 : 15));
      } else {
        timers.push(
          window.setTimeout(() => {
            if (cancelled) return;
            // Run begins: the cmd line is present, then we type it out.
            setRunning(true);
            setShownOut(1);
            setCmdLen(0);

            const startStream = () => {
              if (cancelled) return;
              let o = 1; // cmd line already shown
              const outTick = () => {
                if (cancelled) return;
                o += 1;
                setShownOut(o);
                if (o < OUTPUT.length) {
                  const justShown = OUTPUT[o - 1];
                  const delay = justShown.tone === "muted" ? 300 : 32;
                  timers.push(window.setTimeout(outTick, delay));
                } else {
                  // Hold the fully filled-out state for 5s before restarting.
                  timers.push(
                    window.setTimeout(() => {
                      if (!cancelled) setRunKey((k) => k + 1);
                    }, 5000),
                  );
                }
              };
              timers.push(window.setTimeout(outTick, 320));
            };

            let cl = 0;
            const cmdTick = () => {
              if (cancelled) return;
              cl += 1;
              setCmdLen(cl);
              if (cl < CMD.length) {
                timers.push(window.setTimeout(cmdTick, 52));
              } else {
                startStream();
              }
            };
            timers.push(window.setTimeout(cmdTick, 240));
          }, 650),
        );
      }
    };
    timers.push(window.setTimeout(typeTick, 450));

    return () => {
      cancelled = true;
      timers.forEach((id) => clearTimeout(id));
    };
  }, [armed, runKey]);

  // Which line the caret is on while typing.
  let acc = 0;
  let cursorIdx = LINES.length - 1;
  for (let k = 0; k < LINES.length; k++) {
    if (typed <= acc + LINES[k].length) {
      cursorIdx = k;
      break;
    }
    acc += LINES[k].length + 1;
  }
  const typingDone = typed >= CODE.length;

  let rem = typed;

  return (
    <div ref={ref} className="code-shell overflow-hidden">
      {/* titlebar */}
      <div className="code-titlebar">
        <div className="flex items-center gap-3">
          <div className="traffic">
            <span style={{ background: "#FF5F57" }} />
            <span style={{ background: "#FEBC2E" }} />
            <span style={{ background: "#28C840" }} />
          </div>
          <span className="mono normal-case tracking-normal text-inkMuted">scale.py</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCopy}
            className="mono normal-case tracking-normal text-[11px] rounded-md px-2 py-0.5 border border-line bg-white text-inkMuted hover:text-ink hover:border-ink/30 transition-colors"
            aria-label="Copy code"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <span className="inline-flex items-center gap-1.5 mono normal-case tracking-normal text-[11px]">
            <span className="live-dot" />
            <span className="text-inkMuted">Live</span>
          </span>
        </div>
      </div>

      {/* code editor */}
      <div className="mono text-[12.5px] leading-[1.7] px-5 py-4 h-[208px] overflow-hidden bg-white">
        {LINES.map((line, idx) => {
          const take = Math.max(0, Math.min(line.length, rem));
          const visible = line.slice(0, take);
          rem -= line.length + 1;
          const showCaret = !typingDone && idx === cursorIdx;
          return (
            <div key={idx} className="whitespace-pre">
              {tokenize(visible).map((tok, ti) => (
                <span key={ti} className={COLOR[tok.c]}>
                  {tok.v}
                </span>
              ))}
              {showCaret && (
                <span className="inline-block w-[7px] h-[14px] -mb-[2px] align-middle bg-accent animate-blink" />
              )}
              {line.length === 0 && !showCaret ? <span>&nbsp;</span> : null}
            </div>
          );
        })}
      </div>

      {/* terminal */}
      <div className="border-t border-line bg-[#F6F7F9]">
        <div className="flex items-center justify-between px-5 pt-2.5 pb-1">
          <span className="mono text-[10px] uppercase tracking-eyebrow text-inkSubtle">
            Terminal
          </span>
        </div>
        <div className="mono text-[12px] leading-[1.65] px-5 pb-4 h-[150px] overflow-hidden flex flex-col justify-start">
          {!running ? (
            <div className="whitespace-pre text-[#1E293B]">
              <span className="text-[#16A34A]">&gt; </span>
              <span className="inline-block w-[7px] h-[13px] -mb-[2px] align-middle bg-inkSubtle animate-blink" />
            </div>
          ) : (
            OUTPUT.slice(Math.max(0, shownOut - TERM_WINDOW), shownOut).map(
              (o, i) => {
                const absIdx = Math.max(0, shownOut - TERM_WINDOW) + i;
                const isCmd = absIdx === 0;
                const typingCmd = isCmd && cmdLen < CMD.length;
                const display = isCmd ? { ...o, text: CMD.slice(0, cmdLen) } : o;
                const last =
                  typingCmd ||
                  (absIdx === shownOut - 1 && shownOut < OUTPUT.length);
                return <OutLine key={absIdx} out={display} last={last} />;
              },
            )
          )}
        </div>
      </div>
    </div>
  );
}

function OutLine({ out, last }: { out: Out; last: boolean }) {
  if (out.tone === "cmd") {
    return (
      <div className="whitespace-pre text-[#1E293B]">
        <span className="text-[#16A34A]">&gt; </span>
        {out.text}
        {last && (
          <span className="inline-block w-[7px] h-[13px] -mb-[2px] ml-[1px] align-middle bg-accent animate-blink" />
        )}
      </div>
    );
  }
  const cls =
    out.tone === "muted"
      ? "text-[#94A3B8]"
      : out.tone === "done"
        ? "text-[#0E7490] font-semibold"
        : "text-[#64748B]";
  return (
    <div className={`whitespace-pre ${cls}`}>
      {out.tone === "line" && <span className="text-[#CBD5E1]">| </span>}
      {out.text}
      {last && (
        <span className="inline-block w-[7px] h-[13px] -mb-[2px] ml-[1px] align-middle bg-accent animate-blink" />
      )}
    </div>
  );
}
