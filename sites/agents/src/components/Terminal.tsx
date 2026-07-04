import { useEffect, useMemo, useRef, useState } from "react";

export type Frame =
  | { kind: "user"; text: string; speed?: number }
  | { kind: "assistant"; text: string; speed?: number }
  | { kind: "system"; text: string; speed?: number }
  | { kind: "stdout"; text: string; speed?: number; tone?: "live" | "accent" | "muted" | "ink" }
  | { kind: "wait"; ms: number };

interface TerminalProps {
  script: Frame[];
  title?: string;
  className?: string;
  height?: number | string;
  loop?: boolean;
  loopGapMs?: number;
  triggerOnView?: boolean;
  onComplete?: () => void;
}

interface RenderedLine {
  id: number;
  kind: Frame["kind"];
  full: string;
  shown: string;
  done: boolean;
  tone?: "live" | "accent" | "muted" | "ink";
}

/**
 * Terminal — a typewriter-style mock terminal that renders a sequence of
 * frames. Each frame either types text at a per-char speed, or waits.
 * Used by Hero. Triggers on viewport entry.
 */
export function Terminal({
  script,
  title = "agent ~",
  className = "",
  height = 420,
  loop = false,
  loopGapMs = 2000,
  triggerOnView = true,
  onComplete,
}: TerminalProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [armed, setArmed] = useState(!triggerOnView);
  const [lines, setLines] = useState<RenderedLine[]>([]);
  const [runId, setRunId] = useState(0);
  const completedRef = useRef(false);

  const stableScript = useMemo(() => script, [script]);

  useEffect(() => {
    if (!triggerOnView || armed || !ref.current) return;
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
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [triggerOnView, armed]);

  useEffect(() => {
    if (!armed) return;
    let cancelled = false;
    let timeouts: number[] = [];
    completedRef.current = false;
    setLines([]);

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(resolve, ms);
        timeouts.push(id);
      });

    const run = async () => {
      let counter = 0;
      for (const frame of stableScript) {
        if (cancelled) return;
        if (frame.kind === "wait") {
          await wait(frame.ms);
          continue;
        }
        const id = counter++;
        const text = frame.text;
        const speed =
          frame.speed ??
          (frame.kind === "user"
            ? 22
            : frame.kind === "stdout"
              ? 8
              : 14);
        setLines((prev) => [
          ...prev,
          {
            id,
            kind: frame.kind,
            full: text,
            shown: "",
            done: false,
            tone: frame.kind === "stdout" ? frame.tone : undefined,
          },
        ]);
        for (let i = 1; i <= text.length; i++) {
          if (cancelled) return;
          await wait(speed);
          setLines((prev) =>
            prev.map((l) =>
              l.id === id ? { ...l, shown: text.slice(0, i) } : l
            )
          );
        }
        setLines((prev) =>
          prev.map((l) => (l.id === id ? { ...l, done: true } : l))
        );
      }
      if (!cancelled) {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
        if (loop) {
          await wait(loopGapMs);
          if (!cancelled) setRunId((n) => n + 1);
        }
      }
    };
    run();

    return () => {
      cancelled = true;
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, [armed, stableScript, loop, loopGapMs, runId, onComplete]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      ref={ref}
      className={`code-shell ${className}`}
      role="presentation"
    >
      <div className="code-titlebar">
        <div className="flex items-center gap-3">
          <div className="traffic">
            <span style={{ background: "#E1E5EB" }} />
            <span style={{ background: "#E1E5EB" }} />
            <span style={{ background: "#E1E5EB" }} />
          </div>
          <span className="mono normal-case tracking-normal">{title}</span>
        </div>
        <span className="chip-live" aria-label="Live demo">
          <span className="live-dot" />
          Live
        </span>
      </div>
      <div
        ref={bodyRef}
        className="mono text-[12.5px] leading-[1.7] overflow-y-auto px-5 py-5 md:px-6 md:py-6"
        style={{
          height: typeof height === "number" ? `${height}px` : height,
        }}
      >
        {lines.map((line) => (
          <TerminalLine key={line.id} line={line} />
        ))}
      </div>
    </div>
  );
}

function TerminalLine({ line }: { line: RenderedLine }) {
  const isUser = line.kind === "user";
  const isAssistant = line.kind === "assistant";
  const isSystem = line.kind === "system";
  const isStdout = line.kind === "stdout";

  const toneClass =
    line.tone === "live"
      ? "text-live"
      : line.tone === "accent"
        ? "text-accent"
        : line.tone === "muted"
          ? "text-inkSubtle"
          : "text-inkMuted";

  return (
    <div className="flex gap-3">
      <div className="select-none w-5 shrink-0 pt-px">
        {isUser && <span className="text-accent">›</span>}
        {isAssistant && <span className="text-blue">◆</span>}
        {isSystem && <span className="text-inkSubtle">·</span>}
        {isStdout && <span className="text-inkDim">|</span>}
      </div>
      <div
        className={`flex-1 break-words ${
          isUser
            ? "text-ink"
            : isAssistant
              ? "text-inkMuted"
              : isSystem
                ? "text-inkSubtle"
                : toneClass
        }`}
      >
        {line.shown}
        {!line.done && (
          <span className="inline-block w-[8px] h-[14px] -mb-[2px] ml-[1px] align-middle bg-accent animate-blink" />
        )}
      </div>
    </div>
  );
}
