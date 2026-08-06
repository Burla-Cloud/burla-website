/* Floating blog diagrams. Inline SVGs in the same visual language as the
   landing page's Laptop schematic: no containing panel, dark card surfaces
   floating directly over the starfield. One emphasis color per idea:
   cyan = workers, amber = the big task, coral = pressure / eviction,
   green = the win. */

const MONO = '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const INK = "rgba(234,246,250,0.92)";
const INK_SOFT = "rgba(234,246,250,0.78)";
const CYAN = "#7ECBDD";
const CORAL = "#FF806C";
const GREEN = "#8FD3A6";
const AMBER = "#E9C989";
const CARD_BG = "#081826";
const CARD_STROKE = "rgba(126,203,221,0.4)";

const WORKER_FILL = "rgba(126,203,221,0.22)";
const WORKER_STROKE = "rgba(126,203,221,0.9)";
const BIG_FILL = "rgba(217,182,120,0.16)";
const BIG_STROKE = "rgba(233,201,137,0.95)";
const EVICTED_STROKE = "rgba(255,128,108,0.85)";

/** Deterministic noise so the chart renders identically on every visit. */
function rnd(seed: number) {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// 1. Long-tail distribution of resource need per task
// ---------------------------------------------------------------------------

const DIST = { n: 32, tailStart: 26, barW: 16, gap: 7, x0: 56, baseline: 244 };

const DIST_BARS = Array.from({ length: DIST.n }, (_, i) => {
  const inTail = i >= DIST.tailStart;
  const h = inTail
    ? 12 + rnd(i * 7 + 3) * 14
    : Math.max(12, 228 * Math.exp(-i / 6.2) * (0.8 + rnd(i) * 0.4));
  return { x: DIST.x0 + i * (DIST.barW + DIST.gap), h, inTail };
});

export function TaskDistribution() {
  const tailX0 = DIST_BARS[DIST.tailStart].x;
  const tailX1 = DIST_BARS[DIST.n - 1].x + DIST.barW;
  const yBracket = 196;

  return (
    <svg
      viewBox="0 0 800 302"
      role="img"
      aria-label="A long-tail bar chart of resource needed per PDF: most PDFs need little CPU or RAM, and a few rare, expensive files at the far end need much more."
      className="block h-auto w-full"
      fill="none"
    >
      <line
        x1={DIST.x0}
        x2={792}
        y1={DIST.baseline + 0.5}
        y2={DIST.baseline + 0.5}
        stroke="rgba(255,255,255,0.25)"
      />

      {DIST_BARS.map(({ x, h, inTail }) => (
        <rect
          key={x}
          x={x}
          y={DIST.baseline - h}
          width={DIST.barW}
          height={h}
          rx={2.5}
          fill={inTail ? CORAL : CYAN}
        />
      ))}

      <path
        d={`M ${tailX0} ${yBracket + 8} L ${tailX0} ${yBracket} L ${tailX1} ${yBracket} L ${tailX1} ${yBracket + 8}`}
        stroke={CORAL}
        strokeWidth={1.5}
      />
      <text
        x={tailX1}
        y={yBracket - 14}
        textAnchor="end"
        fontFamily={MONO}
        fontSize={14}
        fontWeight={500}
        letterSpacing="0.04em"
        fill={CORAL}
      >
        rare, expensive files
      </text>

      <text
        x={20}
        y={(DIST.baseline + 20) / 2}
        transform={`rotate(-90 20 ${(DIST.baseline + 20) / 2})`}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={13}
        letterSpacing="0.05em"
        fill={INK_SOFT}
      >
        number of PDFs
      </text>
      <text
        x={(DIST.x0 + 792) / 2}
        y={286}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={13}
        letterSpacing="0.05em"
        fill={INK_SOFT}
      >
        more CPU / RAM needed by one PDF →
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. One machine, before and after Burla removes workers
// ---------------------------------------------------------------------------

const ADJ = { cardW: 300, cardY: 40, cardH: 332, pad: 16, cell: 84, gap: 8, rightX: 500 };

function AdjCell({
  x,
  y,
  size = ADJ.cell,
  kind,
}: {
  x: number;
  y: number;
  size?: number;
  kind: "worker" | "big" | "evicted";
}) {
  const style = {
    worker: { fill: WORKER_FILL, stroke: WORKER_STROKE },
    big: { fill: BIG_FILL, stroke: BIG_STROKE },
    evicted: { fill: "none", stroke: EVICTED_STROKE },
  }[kind];
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={9}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={1.4}
        strokeDasharray={kind === "evicted" ? "5 5" : undefined}
      />
      {kind === "big" && (
        <text
          x={x + size / 2}
          y={y + size / 2 + 4.5}
          textAnchor="middle"
          fontFamily={MONO}
          fontSize={size > ADJ.cell ? 14 : 11.5}
          letterSpacing="0.04em"
          fill={AMBER}
        >
          big task
        </text>
      )}
    </g>
  );
}

export function WorkerAdjustment() {
  const cellPos = (card: number, col: number, row: number) => ({
    x: card + ADJ.pad + col * (ADJ.cell + ADJ.gap),
    y: ADJ.cardY + ADJ.pad + row * (ADJ.cell + ADJ.gap),
  });
  const grown = ADJ.cell * 2 + ADJ.gap;
  const arrowY = ADJ.cardY + ADJ.cardH / 2 - 24;

  return (
    <svg
      viewBox="0 0 800 416"
      role="img"
      aria-label="Two views of the same machine. Before: nine equal workers fill it and the big task is starved. After Burla removes workers: the big task expands into the freed CPU and RAM."
      className="block h-auto w-full"
      fill="none"
    >
      <text
        x={ADJ.cardW / 2}
        y={20}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={14.5}
        fontWeight={500}
        letterSpacing="0.14em"
        fill={INK}
      >
        BEFORE
      </text>
      <rect
        x={0}
        y={ADJ.cardY}
        width={ADJ.cardW}
        height={ADJ.cardH}
        rx={14}
        fill={CARD_BG}
        stroke={CARD_STROKE}
      />
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => (
          <AdjCell
            key={`b-${row}-${col}`}
            {...cellPos(0, col, row)}
            kind={row === 1 && col === 1 ? "big" : "worker"}
          />
        )),
      )}
      <text
        x={ADJ.cardW / 2}
        y={ADJ.cardY + ADJ.cardH + 30}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={13.5}
        letterSpacing="0.03em"
        fill={CORAL}
      >
        9 workers · big task starved
      </text>

      <g stroke={CYAN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M330 ${arrowY} H462`} />
        <path d={`M450 ${arrowY - 9} L464 ${arrowY} L450 ${arrowY + 9}`} />
      </g>
      <text
        x={400}
        y={arrowY + 34}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={13.5}
        letterSpacing="0.03em"
        fill={INK}
      >
        <tspan x={400}>Burla removes</tspan>
        <tspan x={400} dy={20}>
          workers
        </tspan>
      </text>

      <text
        x={ADJ.rightX + ADJ.cardW / 2}
        y={20}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={14.5}
        fontWeight={500}
        letterSpacing="0.14em"
        fill={INK}
      >
        AFTER
      </text>
      <rect
        x={ADJ.rightX}
        y={ADJ.cardY}
        width={ADJ.cardW}
        height={ADJ.cardH}
        rx={14}
        fill={CARD_BG}
        stroke={CARD_STROKE}
      />
      <AdjCell {...cellPos(ADJ.rightX, 0, 0)} size={grown} kind="big" />
      <AdjCell {...cellPos(ADJ.rightX, 2, 0)} kind="worker" />
      <AdjCell {...cellPos(ADJ.rightX, 2, 1)} kind="evicted" />
      <AdjCell {...cellPos(ADJ.rightX, 0, 2)} kind="worker" />
      <AdjCell {...cellPos(ADJ.rightX, 1, 2)} kind="worker" />
      <AdjCell {...cellPos(ADJ.rightX, 2, 2)} kind="evicted" />
      <text
        x={ADJ.rightX + ADJ.cardW / 2}
        y={ADJ.cardY + ADJ.cardH + 30}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={13.5}
        letterSpacing="0.03em"
        fill={GREEN}
      >
        4 workers · big task has room
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3. Horizontal autoscaling: a new machine joins mid-job
// ---------------------------------------------------------------------------

const GROW = { machineW: 240, machineH: 156, machineY: 140 };
const GROW_X = [0, 280, 560];

// Each arrow leaves the queue from a point roughly above its machine, so no
// curve has to cover a sharp horizontal swing in the short vertical gap, and
// every curve ends in a straight vertical tail that matches its arrowhead.
const GROW_FROM_X = [280, 400, 520];

function GrowMachine({
  x,
  name,
  slots,
  booting = false,
}: {
  x: number;
  name: string;
  slots: ("worker" | "evicted" | "empty")[];
  booting?: boolean;
}) {
  const slotW = (GROW.machineW - 32 - 10) / 2;
  return (
    <g>
      <rect
        x={x}
        y={GROW.machineY}
        width={GROW.machineW}
        height={GROW.machineH}
        rx={13}
        fill={booting ? "rgba(126,203,221,0.07)" : CARD_BG}
        stroke={booting ? "rgba(126,203,221,0.85)" : CARD_STROKE}
        strokeWidth={1.3}
        strokeDasharray={booting ? "6 6" : undefined}
      />
      <text
        x={x + GROW.machineW / 2}
        y={GROW.machineY + 30}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={13}
        fontWeight={500}
        letterSpacing="0.06em"
        fill={INK}
      >
        {name}
      </text>
      {slots.map((slot, i) => {
        if (slot === "empty") return null;
        const sx = x + 16 + (i % 2) * (slotW + 10);
        const sy = GROW.machineY + 46 + Math.floor(i / 2) * 48;
        return (
          <rect
            key={i}
            x={sx}
            y={sy}
            width={slotW}
            height={40}
            rx={8}
            fill={slot === "worker" ? WORKER_FILL : "none"}
            stroke={slot === "worker" ? WORKER_STROKE : EVICTED_STROKE}
            strokeWidth={1.4}
            strokeDasharray={slot === "evicted" ? "5 5" : undefined}
          />
        );
      })}
    </g>
  );
}

export function GrowCluster() {
  const centers = GROW_X.map((x) => x + GROW.machineW / 2);

  return (
    <svg
      viewBox="0 0 800 390"
      role="img"
      aria-label="An input queue of PDFs feeds three machines. Machine 2 is saturated and two of its workers are removed, so machine 3 boots mid-job and starts pulling work, holding parallelism at 8 workers."
      className="block h-auto w-full"
      fill="none"
    >
      <rect x={210} y={0} width={380} height={56} rx={13} fill={CARD_BG} stroke={CARD_STROKE} />
      <text
        x={234}
        y={34}
        fontFamily={MONO}
        fontSize={13}
        fontWeight={500}
        letterSpacing="0.1em"
        fill={INK}
      >
        INPUT QUEUE
      </text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect
            x={382 + i * 50}
            y={14}
            width={42}
            height={28}
            rx={7}
            fill={WORKER_FILL}
            stroke={WORKER_STROKE}
          />
          <text
            x={403 + i * 50}
            y={32.5}
            textAnchor="middle"
            fontFamily={MONO}
            fontSize={11}
            fill={CYAN}
          >
            pdf
          </text>
        </g>
      ))}

      {centers.map((cx, i) => {
        const isNew = i === 2;
        const x0 = GROW_FROM_X[i];
        const yEnd = GROW.machineY - 10;
        return (
          <g
            key={cx}
            stroke={isNew ? CYAN : "rgba(126,203,221,0.55)"}
            strokeWidth={isNew ? 2 : 1.6}
          >
            <path d={`M ${x0} 60 C ${x0} 92, ${cx} 88, ${cx} ${yEnd - 18} L ${cx} ${yEnd}`} />
            <path
              d={`M ${cx - 5.5} ${yEnd - 7} L ${cx} ${yEnd + 2} L ${cx + 5.5} ${yEnd - 7}`}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      <GrowMachine x={GROW_X[0]} name="machine 1" slots={["worker", "worker", "worker", "worker"]} />
      <GrowMachine x={GROW_X[1]} name="machine 2" slots={["worker", "worker", "evicted", "evicted"]} />
      <GrowMachine x={GROW_X[2]} name="machine 3" slots={["worker", "worker", "empty", "empty"]} booting />

      <text
        x={GROW_X[1] + GROW.machineW / 2}
        y={GROW.machineY + GROW.machineH + 30}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={13.5}
        letterSpacing="0.03em"
        fill={CORAL}
      >
        2 workers removed
      </text>
      <text
        x={GROW_X[2] + GROW.machineW / 2}
        y={GROW.machineY + GROW.machineH + 30}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={13.5}
        letterSpacing="0.03em"
        fill={CYAN}
      >
        booting · added mid-job
      </text>

      <text
        x={400}
        y={376}
        textAnchor="middle"
        fontFamily={MONO}
        fontSize={14}
        letterSpacing="0.04em"
        fill={INK}
      >
        parallelism held at 8 workers
      </text>
    </svg>
  );
}
