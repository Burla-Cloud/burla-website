import { useEffect, useRef, useState } from "react";
import profilePic from "../assets/profile.png";

/**
 * BurlaDashboard — a faithful mockup of the real Burla jobs view: a light-grey
 * app shell with a sidebar, then stacked white cards for the running-job
 * header, the "function calls complete" progress bar with a
 * Success / Failed / Remaining legend, and a controls + streaming log panel.
 * The job starts at 0 and climbs to fully processed once it scrolls into view.
 */

const TOTAL = 23_927;
const NAV = ["Cluster Status", "Jobs", "Filesystem", "Settings"];

const cardCls =
  "rounded-[10px] border border-[#E7E9ED] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

function clockStr(d: Date) {
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m}:${s} ${ampm}`;
}

export function BurlaDashboard() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [logs, setLogs] = useState<{ t: string; msg: string }[]>([]);
  const inputRef = useRef(0);
  const stepRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(true);
            obs.unobserve(el);
          }
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setCompleted((c) => {
        if (c >= TOTAL) return TOTAL;
        const next = c + 28 + Math.floor(Math.random() * 44);
        return next >= TOTAL ? TOTAL : next;
      });
    }, 140);
    return () => window.clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const push = () => {
      stepRef.current += 1;
      let msg: string;
      const ts = (1774303000 + Math.random() * 9).toFixed(6);
      if (stepRef.current > 10) {
        msg = `[Input=${inputRef.current}] Done! ts${ts}`;
        inputRef.current += 1;
        stepRef.current = 0;
      } else {
        msg = `[Input=${inputRef.current}] step ${stepRef.current}/10 ts${ts}`;
      }
      setLogs((prev) => [...prev.slice(-11), { t: clockStr(new Date()), msg }]);
    };
    push();
    const id = window.setInterval(push, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  const remaining = TOTAL - completed;
  const pct = (completed / TOTAL) * 100;

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-xl border border-[#E3E5EA] text-[11px]"
      style={{ background: "#F4F5F7" }}
    >
      <div className="flex">
        {/* sidebar */}
        <aside className="hidden sm:flex w-[130px] shrink-0 flex-col border-r border-[#E3E5EA] bg-white">
          <div className="flex items-center border-b border-[#EEF0F3] px-4 py-[15px]">
            <svg
              width="17"
              height="17"
              viewBox="0 0 32 32"
              aria-hidden
              className="shrink-0"
            >
              <rect x="1" y="7" width="6" height="6" rx="1.3" fill="#155E75" />
              <rect x="7" y="13" width="6" height="6" rx="1.3" fill="#155E75" />
              <rect x="1" y="19" width="6" height="6" rx="1.3" fill="#155E75" />
              <rect x="19" y="19" width="12" height="6" rx="1.3" fill="#155E75" />
            </svg>
          </div>
          <nav className="flex flex-col py-2">
            {NAV.map((n) => (
              <div key={n} className="px-4 py-[7px] text-[10.5px] text-[#5B6470]">
                {n}
              </div>
            ))}
          </nav>
        </aside>

        {/* main */}
        <div className="relative min-w-0 flex-1 px-3.5 pb-3.5 pt-2.5">
          {/* avatar in the top-right gutter */}
          <div className="mb-2 flex justify-end pr-0.5">
            <Avatar />
          </div>

          {/* header card */}
          <div className={`${cardCls} px-4 py-3`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 truncate font-display text-[13px] md:text-[14px] font-semibold text-[#1B2430]">
                <span className="font-normal text-[#6B7480]">Jobs</span>
                <span className="mx-1.5 text-[#AEB4BD]">›</span>
                <span className="mono">parse_file-81iz1_obSBCJ</span>
              </div>
              <StopButton />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1">
              <RunningBadge />
              <span className="text-[10px] text-[#5B6470]">
                <span className="text-[#9098A2]">Function:</span> parse_file
              </span>
              <span className="text-[10px] text-[#5B6470]">
                <span className="text-[#9098A2]">Started At:</span> 5:56 PM EDT,
                Monday, Mar 23
              </span>
            </div>
          </div>

          {/* progress card */}
          <div className={`${cardCls} mt-2.5 px-4 py-3`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3.5 gap-y-1">
              <span className="text-[11px] tabular-nums text-[#1B2430]">
                {completed.toLocaleString()}{" "}
                <span className="text-[#6B7480]">
                  / {TOTAL.toLocaleString()} Function calls complete.
                </span>
              </span>
              <span className="flex items-center gap-3 text-[9.5px]">
                <Legend color="#22C55E" label="Success" value={completed} />
                <Legend color="#EF4444" label="Failed" value={0} />
                <Legend color="#F59E0B" label="Remaining" value={remaining} />
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full"
              style={{ background: "#F5B100" }}
            >
              <div
                className="h-full transition-[width] duration-200 ease-linear"
                style={{ width: `${pct}%`, background: "#16A34A" }}
              />
            </div>
          </div>

          {/* controls + logs card */}
          <div className={`${cardCls} mt-2.5 overflow-hidden`}>
            <div className="flex flex-wrap items-center gap-3 border-b border-[#EEF0F3] px-4 py-2.5 text-[10px] text-[#6B7480]">
              <span className="inline-flex items-center gap-1.5">
                Index
                <span className="inline-flex items-center justify-center rounded border border-[#E1E4E8] bg-white px-2 py-0.5 mono text-[#1B2430]">
                  0
                </span>
                <span>of {TOTAL.toLocaleString()}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[#AEB4BD]">
                <NavArrow dir="left" />
                <NavArrow dir="right" />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Toggle /> Has logs
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Toggle /> Failed only
                <span className="mono text-[#1B2430]">0</span>
              </span>
            </div>

            <div className="px-4 pt-2.5 text-center mono text-[9.5px] text-[#8A929C]">
              Monday, March 23, 2026
            </div>

            <div className="flex h-[188px] flex-col justify-start px-4 pb-2 pt-1.5">
              {logs.map((l, i) => (
                <div
                  key={`${l.msg}-${i}`}
                  className="flex gap-5 whitespace-nowrap border-b border-[#F1F2F4] py-[4px] mono text-[10px]"
                >
                  <span className="w-[58px] shrink-0 text-[#9098A2]">{l.t}</span>
                  <span className="truncate text-[#2B333B]">{l.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <span className="block h-6 w-6 overflow-hidden rounded-full ring-1 ring-black/10">
      <img
        src={profilePic}
        alt="Account"
        className="h-full w-full object-cover"
      />
    </span>
  );
}

function StopButton() {
  return (
    <button
      type="button"
      className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-[#EF4444] px-2.5 py-1 text-[10.5px] font-medium text-white hover:bg-[#DC2626]"
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M8.7 8.7l6.6 6.6" />
      </svg>
      Stop
    </button>
  );
}

function RunningBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-eyebrowTight"
      style={{ background: "rgba(245,158,11,0.14)", color: "#B45309" }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: "#F59E0B" }}
      />
      Running
    </span>
  );
}

function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[#6B7480]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
      <span className="tabular-nums text-[#1B2430]">
        {value.toLocaleString()}
      </span>
    </span>
  );
}

function NavArrow({ dir }: { dir: "left" | "right" }) {
  return (
    <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded border border-[#E1E4E8] bg-white">
      <svg width="8" height="8" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d={dir === "left" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Toggle({ on }: { on?: boolean }) {
  return (
    <span
      className={`inline-flex h-[14px] w-[24px] items-center rounded-full px-0.5 transition-colors ${
        on ? "bg-[#0EA5C4]" : "bg-[#D7DBE0]"
      }`}
    >
      <span
        className={`h-[10px] w-[10px] rounded-full bg-white shadow-sm transition-transform ${
          on ? "translate-x-[10px]" : ""
        }`}
      />
    </span>
  );
}
