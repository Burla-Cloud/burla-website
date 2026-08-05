import { useCallback, useState } from "react";
import { PIP_COMMAND } from "../content";

type Props = {
  size?: "chip" | "big" | "mega";
  className?: string;
};

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

// The command reads like a physical terminal chip lifted from the page.
export function PipInstall({ size = "big", className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(PIP_COMMAND).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, []);

  if (size === "chip") {
    return (
      <button
        onClick={copy}
        className={`group inline-flex min-h-11 max-w-full items-center gap-2.5 rounded-full border border-cyan/50 bg-panel px-5 py-2 font-mono text-[14px] font-medium text-ice transition-colors hover:border-cyan ${className}`}
        aria-label="Copy pip install burla"
      >
        <span className="select-none text-cyan">$</span>
        {PIP_COMMAND}
        <span className={copied ? "text-cyan" : "text-iceFaint group-hover:text-ice/70"}>
          <CopyIcon done={copied} />
        </span>
      </button>
    );
  }

  const isMega = size === "mega";

  return (
    <button
      onClick={copy}
      className={`group inline-flex max-w-full items-center justify-center rounded-2xl border border-cyan/25 bg-panel text-left transition-colors hover:border-cyan/60 ${
        isMega
          ? "gap-3 px-4 py-5 min-[380px]:gap-4 min-[380px]:px-6 sm:gap-6 sm:px-9 sm:py-6"
          : "gap-3 px-4 py-4 min-[380px]:gap-4 min-[380px]:px-6 sm:px-7 sm:py-5"
      } ${className}`}
      aria-label="Copy pip install burla"
      style={{
        boxShadow:
          "0 22px 60px -22px rgba(0,0,0,0.8), 0 0 28px rgba(126,203,221,0.08)",
      }}
    >
      <span
        className={`select-none font-mono font-medium text-cyan ${
          isMega
            ? "text-[clamp(1.2rem,2.7vw,2.05rem)]"
            : "text-[clamp(1.05rem,2vw,1.45rem)]"
        }`}
      >
        $
      </span>
      <span
        className={`whitespace-nowrap font-mono font-medium text-ice ${
          isMega
            ? "text-[clamp(1.2rem,2.7vw,2.05rem)]"
            : "text-[clamp(1.05rem,2vw,1.45rem)]"
        }`}
      >
        {PIP_COMMAND}
      </span>
      <span
        className={`ml-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-eyebrow ${
          copied ? "text-cyan" : "text-iceFaint group-hover:text-ice/70"
        }`}
      >
        <CopyIcon done={copied} />
        <span className="hidden min-[380px]:inline">{copied ? "copied" : "copy"}</span>
      </span>
    </button>
  );
}
