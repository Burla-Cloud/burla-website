import { useCallback, useState } from "react";
import { FINALE } from "../content";

function CopyIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M3 8.5 6.5 12 13 4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="5.5"
        y="5.5"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.5 3.5h-6a2 2 0 0 0-2 2v6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// The finale's instructions ARE the commands: a two-line terminal chip with a
// single copy action, so the prose above never has to repeat them.
export function TryCommands({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(FINALE.commands.join("\n")).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, []);

  return (
    <button
      onClick={copy}
      className={`group relative flex w-full max-w-md flex-col gap-2.5 rounded-2xl border border-cyan/25 bg-panel py-5 pl-5 pr-20 text-left transition-colors hover:border-cyan/60 sm:py-6 sm:pl-7 sm:pr-24 ${className}`}
      aria-label="Copy pip install burla and burla dashboard"
      style={{
        boxShadow:
          "0 22px 60px -22px rgba(0,0,0,0.8), 0 0 28px rgba(126,203,221,0.08)",
      }}
    >
      {FINALE.commands.map((command) => (
        <span
          key={command}
          className="flex items-baseline gap-3 whitespace-nowrap font-mono font-medium text-[clamp(1.05rem,2vw,1.35rem)]"
        >
          <span className="select-none text-cyan">$</span>
          <span className="text-ice">{command}</span>
        </span>
      ))}
      <span
        className={`absolute right-4 top-4 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-eyebrow sm:right-5 sm:top-5 ${
          copied ? "text-cyan" : "text-iceFaint group-hover:text-ice/70"
        }`}
      >
        <CopyIcon done={copied} />
        <span className="hidden sm:inline">{copied ? "copied" : "copy"}</span>
      </span>
    </button>
  );
}
