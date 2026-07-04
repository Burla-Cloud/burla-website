import { useState } from "react";
import { Reveal } from "../components/Reveal";

interface QA {
  q: string;
  a: React.ReactNode;
}

const QAS: QA[] = [
  {
    q: "Is Burla really GCP-only?",
    a: (
      <>
        Today, yes. Self-hosting runs entirely inside your GCP project with{" "}
        <span className="mono text-ink">burla install</span>. AWS and Azure
        backends are on the roadmap but not shipping yet. If your agents live
        in a different cloud, this matters. Flag it before standardizing.
      </>
    ),
  },
  {
    q: "Does my function have to be idempotent?",
    a: (
      <>
        Yes. Burla retries failed workers automatically; if your function has
        side effects (uploads, DB writes), make them safe to repeat, typically
        by writing to a deterministic key. Pure compute and reads are fine as
        written.
      </>
    ),
  },
  {
    q: "When should I NOT use Burla?",
    a: (
      <>
        Stateful workloads that need all-reduce between workers (distributed
        training), long-lived per-request connections, or jobs that fit on one
        machine in under a minute. Burla is built for embarrassingly-parallel
        Python: independent inputs, independent outputs, return values flow
        back.
      </>
    ),
  },
  {
    q: "How does pricing work?",
    a: (
      <>
        You pay GCP directly for the underlying compute. For commercial use,
        Burla is{" "}
        <span className="mono text-ink">$250 per user / month</span> for
        access to the IAM and cluster platform. No per-job fees, no tiers,
        no minimums.
      </>
    ),
  },
  {
    q: "What's the cold start, really?",
    a: (
      <>
        One-time on cluster power-on: ~90 seconds for nodes to boot in your
        GCP project. After that, the warm pool stays running and every{" "}
        <span className="mono text-ink">remote_parallel_map</span> call is
        executing on the fleet in under a second. Auto-shutdown is configurable
        if you want the machines to turn off right after a job finishes, or
        a few minutes after.
      </>
    ),
  },
  {
    q: "What happens when a worker crashes?",
    a: (
      <>
        The worker's Python traceback re-raises on the client with the
        original input attached. Workers are retried up to a configurable
        ceiling. Stdout / stderr stream back in real time. Debugging looks
        like a local Python session, not a Kubernetes archaeology dig.
      </>
    ),
  },
  {
    q: "Does Burla support GPUs?",
    a: (
      <>
        Yes. Pass{" "}
        <span className="mono text-ink">func_gpu="A100_80G"</span> or{" "}
        <span className="mono text-ink">"H100"</span>. One GPU per worker.
        Use a GPU image with{" "}
        <span className="mono text-ink">image=...</span> if you need
        non-Python deps (CUDA-built libs, etc.).
      </>
    ),
  },
  {
    q: "Why is the agent the user, not me?",
    a: (
      <>
        Small and simple and open source is what agents perform best with.
      </>
    ),
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="section-tight bg-onyx relative">
      <div className="container-tight">
        <div className="mb-10 md:mb-14">
          <Reveal>
            <div className="eyebrow mb-5">Honest answers</div>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="h-section text-balance">FAQs.</h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="lead mt-6 max-w-[560px] text-pretty">
              If a question isn't here and matters to you, email{" "}
              <a
                href="mailto:jake@burla.dev"
                className="text-accent underline-offset-4 hover:underline"
              >
                jake@burla.dev
              </a>{" "}
              or open a{" "}
              <a
                href="https://github.com/Burla-Cloud/burla/issues"
                target="_blank"
                rel="noreferrer"
                className="text-accent underline-offset-4 hover:underline"
              >
                GitHub issue
              </a>
              .
            </p>
          </Reveal>
        </div>

        <Reveal delay={100}>
          <div className="border-t border-line">
            {QAS.map((qa, i) => (
              <FAQItem
                key={i}
                qa={qa}
                open={open === i}
                onToggle={() => setOpen(open === i ? null : i)}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FAQItem({
  qa,
  open,
  onToggle,
}: {
  qa: QA;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-line">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-6 py-6 md:py-7 text-left group"
        aria-expanded={open}
      >
        <span className="font-display font-medium text-[18px] md:text-[20px] tracking-tighter2 text-ink">
          {qa.q}
        </span>
        <span
          className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
            open
              ? "bg-accent border-accent text-accentInk rotate-45"
              : "border-line text-inkMuted group-hover:border-lineBright group-hover:text-ink"
          }`}
          aria-hidden
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1.5v9M1.5 6h9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pb-7 md:pb-8 pr-12 text-[15px] md:text-[16px] text-inkMuted leading-relaxed text-pretty">
            {qa.a}
          </div>
        </div>
      </div>
    </div>
  );
}
