import { useEffect, useRef, useState } from "react";

/**
 * PipelineDiagram — an animated flow showing Burla fanning a job out across
 * heterogeneous hardware: Cloud Storage -> CPUs -> a big-memory CPU step ->
 * GPUs -> Cloud Storage. Connectors animate a flowing dash on view, and nodes
 * light up in left-to-right waves.
 */

type Box = { cx: number; cy: number; w: number; h: number };

const W = 1040;
const H = 270;
const MID = 135;

const storageL: Box = { cx: 80, cy: MID, w: 80, h: 80 };
const storageR: Box = { cx: 960, cy: MID, w: 80, h: 80 };
const cpus: Box[] = [60, 135, 210].map((cy) => ({ cx: 322, cy, w: 132, h: 56 }));
const core: Box = { cx: 520, cy: MID, w: 158, h: 68 };
const gpus: Box[] = [60, 135, 210].map((cy) => ({ cx: 718, cy, w: 132, h: 56 }));

const left = (b: Box) => b.cx - b.w / 2;
const right = (b: Box) => b.cx + b.w / 2;

function curve(x1: number, y1: number, x2: number, y2: number) {
  const dx = (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

type Edge = { d: string; stage: number };

// Gaps so the line starts just off the source node and the arrowhead lands
// just before the target node.
const GAP_OUT = 4;
const GAP_IN = 10;

const EDGES: Edge[] = [
  ...cpus.map((c) => ({
    d: curve(right(storageL) + GAP_OUT, storageL.cy, left(c) - GAP_IN, c.cy),
    stage: 0,
  })),
  ...cpus.map((c) => ({
    d: curve(right(c) + GAP_OUT, c.cy, left(core) - GAP_IN, core.cy),
    stage: 1,
  })),
  ...gpus.map((g) => ({
    d: curve(right(core) + GAP_OUT, core.cy, left(g) - GAP_IN, g.cy),
    stage: 2,
  })),
  ...gpus.map((g) => ({
    d: curve(right(g) + GAP_OUT, g.cy, left(storageR) - GAP_IN, storageR.cy),
    stage: 3,
  })),
];

export function PipelineDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

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
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-3xl border border-line bg-surface shadow-card p-3 md:p-5 overflow-hidden"
    >
      <style>{`
        @keyframes pdFade { from { opacity: 0; } to { opacity: 1; } }
        .pd-edge { opacity: 0; }
        .pd-edge.pd-on { animation: pdFade 0.5s ease-out forwards; }
      `}</style>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="block"
        role="img"
        aria-label="Pipeline: cloud storage to CPUs to a 64 CPU step to GPUs to cloud storage"
      >
        <defs>
          <marker
            id="pdArrow"
            markerUnits="userSpaceOnUse"
            markerWidth="11"
            markerHeight="11"
            viewBox="0 0 12 12"
            refX="8.5"
            refY="6"
            orient="auto"
          >
            <path d="M2.5 2.4 L10 6 L2.5 9.6 Z" fill="#0891B2" />
          </marker>
        </defs>
        {/* solid curved arrows */}
        {EDGES.map((e, i) => (
          <path
            key={`edge-${i}`}
            d={e.d}
            fill="none"
            stroke="#0891B2"
            strokeWidth="2.2"
            strokeLinecap="round"
            markerEnd="url(#pdArrow)"
            className={`pd-edge ${active ? "pd-on" : ""}`}
            style={{ animationDelay: `${e.stage * 0.1}s` }}
          />
        ))}
        {/* flowing data pulses travelling stage by stage */}
        {active &&
          EDGES.map((e, i) => (
            <circle key={`flow-${i}`} r="3" fill="#4FD2EE">
              <animateMotion
                dur="1.5s"
                repeatCount="indefinite"
                path={e.d}
                rotate="auto"
                begin={`${0.6 + e.stage * 0.36}s`}
              />
            </circle>
          ))}

        <StorageNode box={storageL} label="Cloud Storage" active={active} delay={0} />
        {cpus.map((c, i) => (
          <HwNode
            key={`cpu-${i}`}
            box={c}
            label="CPU"
            kind="cpu"
            active={active}
            delay={0.25 + i * 0.05}
          />
        ))}
        <HwNode box={core} label="64 CPU" kind="core" active={active} delay={0.5} />
        {gpus.map((g, i) => (
          <HwNode
            key={`gpu-${i}`}
            box={g}
            label="GPU"
            kind="gpu"
            active={active}
            delay={0.75 + i * 0.05}
          />
        ))}
        <StorageNode
          box={storageR}
          label="Cloud Storage"
          active={active}
          delay={1}
        />
      </svg>
    </div>
  );
}

function HwNode({
  box,
  label,
  kind,
  active,
  delay,
}: {
  box: Box;
  label: string;
  kind: "cpu" | "gpu" | "core";
  active: boolean;
  delay: number;
}) {
  const x = left(box);
  const y = box.cy - box.h / 2;
  return (
    <g
      style={{
        opacity: active ? 1 : 0,
        transform: active ? "none" : "translateY(6px)",
        transition: `opacity 500ms ease ${delay}s, transform 500ms ease ${delay}s`,
      }}
    >
      <rect
        x={x}
        y={y}
        width={box.w}
        height={box.h}
        rx="12"
        fill="#FFFFFF"
        stroke="#D2DAE2"
        strokeWidth="1.5"
      />
      <Glyph kind={kind} x={x + 22} y={box.cy} />
      <text
        x={x + 52}
        y={box.cy}
        dominantBaseline="central"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="16"
        fontWeight="600"
        fill="#0F1419"
      >
        {label}
      </text>
    </g>
  );
}

function Glyph({
  kind,
  x,
  y,
}: {
  kind: "cpu" | "gpu" | "core";
  x: number;
  y: number;
}) {
  const stroke = "#155E75";
  // All glyphs are authored on a 24×24 grid, centered at (x, y) at scale s.
  const s = 1.18;
  const common = {
    stroke,
    strokeWidth: 1.7,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const wrap = `translate(${x - 12 * s}, ${y - 12 * s}) scale(${s})`;
  if (kind === "gpu") {
    // graphics card: board with a cooling fan, left mounting bracket,
    // heatsink vents, and connector pins along the bottom edge
    return (
      <g
        transform={wrap}
        stroke="#7BC0DB"
        strokeWidth={1.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6 H2 V17 H4" />
        <rect x="4" y="6.5" width="17" height="10.5" rx="2" fill="#EFF8FC" />
        <circle cx="10" cy="11.75" r="3.7" fill="#FFFFFF" />
        <path d="M10 11.75 V8 M10 11.75 13.1 13.7 M10 11.75 6.9 13.7" />
        <circle cx="10" cy="11.75" r="0.9" fill="#7BC0DB" stroke="none" />
        <path d="M16.2 9.4 V14.1 M18.4 9.4 V14.1" />
        <path d="M6 17 V18.9 M8 17 V18.9 M10 17 V18.9" />
      </g>
    );
  }
  if (kind === "core") {
    // server rack: two stacked units with status lights and vent ticks
    return (
      <g transform={wrap} {...common}>
        <rect x="3" y="3.5" width="18" height="7.5" rx="2" fill="#EAF6FA" />
        <rect x="3" y="13" width="18" height="7.5" rx="2" fill="#EAF6FA" />
        <circle cx="6.5" cy="7.25" r="1" fill={stroke} stroke="none" />
        <circle cx="6.5" cy="16.75" r="1" fill={stroke} stroke="none" />
        <path d="M14.5 7.25h3.5M14.5 16.75h3.5" />
      </g>
    );
  }
  // cpu: a standard chip — rounded body, inner die, pins on all four sides
  return (
    <g
      transform={wrap}
      stroke="#7BC0DB"
      strokeWidth={1.4}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="5" width="14" height="14" rx="2.5" fill="#EFF8FC" />
      <rect x="9" y="9" width="6" height="6" rx="1.4" fill="#FFFFFF" />
      <path d="M8.5 2.6v2.4M12 2.6v2.4M15.5 2.6v2.4M8.5 19v2.4M12 19v2.4M15.5 19v2.4M2.6 8.5h2.4M2.6 12h2.4M2.6 15.5h2.4M19 8.5h2.4M19 12h2.4M19 15.5h2.4" />
    </g>
  );
}

function StorageNode({
  box,
  label,
  active,
  delay,
}: {
  box: Box;
  label: string;
  active: boolean;
  delay: number;
}) {
  const x = left(box);
  const y = box.cy - box.h / 2;
  return (
    <g
      style={{
        opacity: active ? 1 : 0,
        transition: `opacity 500ms ease ${delay}s`,
      }}
    >
      <rect
        x={x}
        y={y}
        width={box.w}
        height={box.h}
        rx="16"
        fill="#FFFFFF"
        stroke="#D2DAE2"
        strokeWidth="1.5"
      />
      {/* fluffy cloud resting on a short database cylinder */}
      <g
        transform={`translate(${box.cx - 18}, ${box.cy - 26}) scale(1.5)`}
        stroke="#7BC0DB"
        strokeWidth="1.25"
        fill="#EFF8FC"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A6 6 0 0 0 6 20h13a5 5 0 0 0 .35-9.96z" />
      </g>
      <g
        transform={`translate(${box.cx}, ${box.cy + 11})`}
        stroke="#66B5D6"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M -11 -5 v 6 a 11 3.4 0 0 0 22 0 v -6" fill="#EFF8FC" />
        <ellipse cx="0" cy="-5" rx="11" ry="3.4" fill="#CCE8F3" />
        <path d="M -11 -1.6 a 11 3.4 0 0 0 22 0" fill="none" />
      </g>
      <text
        x={box.cx}
        y={box.cy + box.h / 2 + 22}
        textAnchor="middle"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="13"
        fontWeight="600"
        fill="#3F4854"
      >
        {label}
      </text>
    </g>
  );
}
