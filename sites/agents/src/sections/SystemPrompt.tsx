import { useEffect, useState } from "react";
import { Reveal } from "../components/Reveal";

const SYSTEM_PROMPT = `Burla runs Python functions in parallel across thousands of CPUs
in the user's GCP project.

# Setup (do once per project)

The user needs a GCP project with billing enabled.

\`\`\`bash
gcloud auth login
gcloud auth application-default login
pip install burla
burla install        # deploys the control plane into the project
\`\`\`

Sign in: https://burla.dev/login (Google SSO).
Re-running burla install is safe; it upgrades in place.

# How to use it

\`\`\`python
from burla import remote_parallel_map

def worker(item):
    return result   # module top-level, picklable, no closures

results = remote_parallel_map(
    worker,
    inputs,
    func_cpu=2,
    func_ram="dynamic",
    grow=True,
)
\`\`\`

Returns: list[Any], in COMPLETION order, not input order. If you
need input/output pairing, return a correlator from the worker.

# When to reach for it

- Inputs > 1,000
- Each input is independent (embarrassingly parallel)
- You can write a clean worker(item) -> result function

# When NOT to

- Distributed training or anything that needs all-reduce
- Long-lived per-request connections
- Jobs that fit on one machine in under 60 seconds

# Map-Reduce via /workspace/shared

/workspace/shared is a GCS-backed folder mounted on every worker.
Write partial outputs in the map step, read them in the reduce
step. Wrap the reduce input as a list-of-one:

\`\`\`python
remote_parallel_map(reduce_fn, [partial_paths], func_cpu=8, func_ram=32)
\`\`\`

# Full signature

\`\`\`python
remote_parallel_map(
    function_,            # picklable, module-top-level, <100MB pickled
    inputs,               # list; tuples unpack to *args
    func_cpu=1,           # CPUs per worker
    func_ram="dynamic",   # GB RAM per worker, or "dynamic" for adaptive sizing
    func_gpu=None,        # "A100", "A100_80G", or "H100"
    image=None,           # restrict to / boot new nodes with this Docker image
    grow=False,           # auto-provision additional nodes up to project quota
    max_parallelism=None, # cap concurrent running workers
    detach=False,         # job survives local process exit
    generator=False,      # yield results as they complete (still unordered)
    spinner=True,
)
\`\`\`

Python imports your worker uses are auto-installed on workers.
Non-Python deps (CUDA libs, ffmpeg, etc.) need a pre-built image=.

# When unsure, fetch the docs

Don't guess flag names or behavior from training data. If anything
is unclear, fetch from docs.burla.dev before writing code.

1. Index of every doc page:
   GET https://docs.burla.dev/sitemap.md

2. Specific page from that index:
   GET https://docs.burla.dev/<path-from-sitemap>

3. Fallback (no single page matches):
   GET https://docs.burla.dev/llms-full.txt
   Search for the "# /<path>" heading of the section you want and
   read only that section.`;

const INTEGRATIONS: {
  name: string;
  href: string;
  hint: string;
}[] = [
  {
    name: "Claude",
    href: "https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview",
    hint: "Save as a Claude skill",
  },
  {
    name: "Cursor",
    href: "https://cursor.com/docs/rules",
    hint: "Add as a Cursor rule",
  },
  {
    name: "Codex",
    href: "https://developers.openai.com/codex/guides/agents-md",
    hint: "Save as AGENTS.md",
  },
  {
    name: "Gemini",
    href: "https://ai.google.dev/gemini-api/docs/text-generation",
    hint: "Set as system instruction",
  },
];

const COLLAPSED_LINES = 15;

export function SystemPrompt() {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(SYSTEM_PROMPT);
      setCopied(true);
    } catch {
      // ignore
    }
  };

  const lines = SYSTEM_PROMPT.split("\n");
  const totalLines = lines.length;
  const hiddenLines = Math.max(0, totalLines - COLLAPSED_LINES);

  return (
    <section
      id="system-prompt"
      className="section bg-onyxDeep relative overflow-hidden"
    >
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none mask-fade-y" />
      <div className="container-x relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 mb-10 md:mb-14 items-start">
          <div className="lg:col-span-7">
            <Reveal>
              <div className="eyebrow mb-5">Agent skill</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                Drop this into your agent.
                <br />
                <span className="text-inkMuted">
                  Leave with a working integration.
                </span>
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={140}>
              <p className="lead text-pretty max-w-[460px]">
                Give your agent one file with the install steps, API calls,
                flags, and debugging notes it needs to build with Burla. Drop
                it into Claude, Cursor, Codex, or any tool-using LLM, and it
                can ship the integration.
              </p>
            </Reveal>
          </div>
        </div>

        <Reveal delay={120} y={20}>
          <div className="surface-elev overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5 md:px-6">
              <div className="flex items-center gap-3">
                <span className="chip-accent">paste me</span>
                <span className="mono text-[12px] text-inkSubtle">
                  ~2,820 chars · ~690 tokens
                </span>
              </div>
              <button
                onClick={onCopy}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-150 ${
                  copied
                    ? "bg-live text-onyx"
                    : "bg-accent text-accentInk hover:bg-accentDeep"
                }`}
                aria-label="Copy agent skill"
              >
                {copied ? (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M3.5 8.5l3 3 6-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Copied to clipboard
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden
                    >
                      <rect
                        x="4"
                        y="4"
                        width="9"
                        height="9"
                        rx="1.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M3 11V4.5A1.5 1.5 0 014.5 3H11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Copy agent skill
                  </>
                )}
              </button>
            </div>

            <div
              className={`relative ${
                expanded ? "" : "max-h-[380px] overflow-hidden"
              }`}
            >
              <pre className="mono text-[12px] md:text-[12.5px] leading-[1.7] text-inkMuted px-5 py-7 md:px-7 md:py-8">
                <code>
                  {lines.map((line, i) => (
                    <Line key={i} text={line} />
                  ))}
                </code>
              </pre>
              {!expanded && hiddenLines > 0 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surfaceElev via-surfaceElev/90 to-transparent" />
              )}
            </div>

            {hiddenLines > 0 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full border-t border-line px-5 py-3.5 md:px-6 flex items-center justify-center gap-2 text-[13px] text-inkMuted hover:text-ink hover:bg-surfaceHi transition-colors"
                aria-expanded={expanded}
              >
                <span>
                  {expanded
                    ? "Show less"
                    : `Show full prompt · ${hiddenLines} more lines`}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                  className={`transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}

            <div className="border-t border-line grid grid-cols-2 md:grid-cols-4 divide-x divide-line">
              {INTEGRATIONS.map((target) => (
                <a
                  key={target.name}
                  href={target.href}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-5 hover:bg-surfaceHi transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-[15px] text-ink">
                      {target.name}
                    </span>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="text-inkSubtle group-hover:text-accent transition-colors"
                      aria-hidden
                    >
                      <path
                        d="M5 11l6-6m0 0v6m0-6H5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="mono text-[11px] text-inkSubtle mt-1.5">
                    {target.hint}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Line({ text }: { text: string }) {
  if (text.startsWith("# ")) {
    return (
      <div className="code-line text-accent font-medium mt-3 first:mt-0">
        {text}
      </div>
    );
  }
  if (text.startsWith("```")) {
    return (
      <div className="code-line text-inkSubtle">{text || " "}</div>
    );
  }
  return <div className="code-line">{text || " "}</div>;
}
