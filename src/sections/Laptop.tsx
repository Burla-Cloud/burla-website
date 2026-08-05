import type { ReactNode } from "react";
import { Reveal } from "../components/Reveal";
import { LAPTOP } from "../content";

const MONO = '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

// The schematic keeps one SVG for the fleet and the fan-out arrows so their
// proportions hold at every width. The notebook window itself is real HTML
// overlaid on the SVG's left region (positioned with percentages derived from
// the same viewBox numbers), so its type stays crisp and the code column can
// be measured against the cell box directly.
const VB = { w: 1120, h: 476 };

// Notebook window region, in viewBox units. The SVG arrows and the HTML
// overlay both derive from this, so they always agree on where the notebook's
// right edge sits. Height is content-driven, so only the top is pinned.
const WIN = { x: 8, y: 18, w: 486 };

// Worker cards: two columns of four, with the cloud caption and marks below,
// grouped by spacing alone.
const CARD = { w: 192, h: 68, rx: 12 };
const CARD_X = [712, 916];
const CARD_Y = [24, 116, 208, 300];
const FLEET_RIGHT = CARD_X[1] + CARD.w;

const rowCenters = CARD_Y.map((y) => y + CARD.h / 2);

// Fan-out: every arrow leaves one shared point on the notebook's right edge,
// raised to the worker stack's vertical centre (the midpoint between the
// worker-3/4 row and the worker-5/6 row), and lands just short of the left
// worker column. Control points sit on the horizontal thirds so each arrow
// eases evenly across the gap.
const FAN_FROM = { x: WIN.x + WIN.w, y: (rowCenters[1] + rowCenters[2]) / 2 };
const FAN_TO_X = 704;
const FAN_C1 = FAN_FROM.x + (FAN_TO_X - FAN_FROM.x) / 3;
const FAN_C2 = FAN_TO_X - (FAN_TO_X - FAN_FROM.x) / 3;

const ICE = "#EAF6FA";
// Exactly two cyan tiers: a quiet structural stroke for the worker card
// outlines, and one emphasis level shared by arrows, glyphs, sublabels, and
// the cloud marks.
const CYAN_STRUCT = "rgba(126,203,221,0.28)";
const CYAN_EMPH = "rgba(126,203,221,0.7)";

// The notebook is a dark surface one step lighter than the page void, with a
// cyan hairline so it still reads as the focal artifact. Syntax colors match
// the ProductDemos panels: cyan keywords/functions, amber numbers, emerald
// strings. The Out prompt keeps Jupyter's classic warm accent via the site
// coral.
const NB = {
  surface: "#0A1B2A",
  border: "rgba(126,203,221,0.3)",
  chromeLine: "rgba(255,255,255,0.08)",
  dots: [
    "rgba(234,246,250,0.32)",
    "rgba(234,246,250,0.2)",
    "rgba(234,246,250,0.12)",
  ],
  title: "rgba(234,246,250,0.55)",
  cellBg: "rgba(255,255,255,0.045)",
  bar: "#7ECBDD",
  prompt: "rgba(126,203,221,0.85)",
  code: "#EAF6FA",
  keyword: "rgba(126,203,221,0.75)",
  fn: "#7ECBDD",
  num: "rgba(253,230,138,0.9)",
  str: "rgba(110,231,183,0.9)",
  out: "rgba(234,246,250,0.62)",
  outTag: "rgba(126,203,221,0.7)",
  outPrompt: "#FF806C",
  done: "#6EE7B7",
};

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

// The cloud marks, inlined from the Wikimedia Commons brand SVGs
// (Amazon_Web_Services_Logo.svg, Google_Cloud_logo.svg, Microsoft_Azure.svg)
// but flattened to the page's emphasis cyan so they read as quiet secondary
// information instead of three competing brand palettes. Each renders as a
// nested <svg> with the artwork's tight viewBox so the three sit on one
// optical size despite very different aspect ratios.
type LogoBox = { x: number; y: number; width: number; height: number };

function AwsLogo(box: LogoBox) {
  return (
    <svg {...box} viewBox="0 0 304 182" role="img" aria-label="Amazon Web Services">
      <path
        fill={CYAN_EMPH}
        d="M86.4 66.4c0 3.7.4 6.7 1.1 8.9.8 2.2 1.8 4.6 3.2 7.2.5.8.7 1.6.7 2.3 0 1-.6 2-1.9 3l-6.3 4.2c-.9.6-1.8.9-2.6.9-1 0-2-.5-3-1.4-1.4-1.5-2.6-3.1-3.6-4.7-1-1.7-2-3.6-3.1-5.9-7.8 9.2-17.6 13.8-29.4 13.8-8.4 0-15.1-2.4-20-7.2-4.9-4.8-7.4-11.2-7.4-19.2 0-8.5 3-15.4 9.1-20.6 6.1-5.2 14.2-7.8 24.5-7.8 3.4 0 6.9.3 10.6.8 3.7.5 7.5 1.3 11.5 2.2v-7.3c0-7.6-1.6-12.9-4.7-16-3.2-3.1-8.6-4.6-16.3-4.6-3.5 0-7.1.4-10.8 1.3-3.7.9-7.3 2-10.8 3.4-1.6.7-2.8 1.1-3.5 1.3-.7.2-1.2.3-1.6.3-1.4 0-2.1-1-2.1-3.1v-4.9c0-1.6.2-2.8.7-3.5.5-.7 1.4-1.4 2.8-2.1 3.5-1.8 7.7-3.3 12.6-4.5 4.9-1.3 10.1-1.9 15.6-1.9 11.9 0 20.6 2.7 26.2 8.1 5.5 5.4 8.3 13.6 8.3 24.6v32.4zM45.8 81.6c3.3 0 6.7-.6 10.3-1.8 3.6-1.2 6.8-3.4 9.5-6.4 1.6-1.9 2.8-4 3.4-6.4.6-2.4 1-5.3 1-8.7v-4.2c-2.9-.7-6-1.3-9.2-1.7-3.2-.4-6.3-.6-9.4-.6-6.7 0-11.6 1.3-14.9 4-3.3 2.7-4.9 6.5-4.9 11.5 0 4.7 1.2 8.2 3.7 10.6 2.4 2.5 5.9 3.7 10.5 3.7zm80.3 10.8c-1.8 0-3-.3-3.8-1-.8-.6-1.5-2-2.1-3.9L96.7 10.2c-.6-2-.9-3.3-.9-4 0-1.6.8-2.5 2.4-2.5h9.8c1.9 0 3.2.3 3.9 1 .8.6 1.4 2 2 3.9l16.8 66.2 15.6-66.2c.5-2 1.1-3.3 1.9-3.9.8-.6 2.2-1 4-1h8c1.9 0 3.2.3 4 1 .8.6 1.5 2 1.9 3.9l15.8 67 17.3-67c.6-2 1.3-3.3 2-3.9.8-.6 2.1-1 3.9-1h9.3c1.6 0 2.5.8 2.5 2.5 0 .5-.1 1-.2 1.6-.1.6-.3 1.4-.7 2.5l-24.1 77.3c-.6 2-1.3 3.3-2.1 3.9-.8.6-2.1 1-3.8 1h-8.6c-1.9 0-3.2-.3-4-1-.8-.7-1.5-2-1.9-4L156 23l-15.4 64.4c-.5 2-1.1 3.3-1.9 4-.8.7-2.2 1-4 1h-8.6zm128.5 2.7c-5.2 0-10.4-.6-15.4-1.8-5-1.2-8.9-2.5-11.5-4-1.6-.9-2.7-1.9-3.1-2.8-.4-.9-.6-1.9-.6-2.8v-5.1c0-2.1.8-3.1 2.3-3.1.6 0 1.2.1 1.8.3.6.2 1.5.6 2.5 1 3.4 1.5 7.1 2.7 11 3.5 4 .8 7.9 1.2 11.9 1.2 6.3 0 11.2-1.1 14.6-3.3 3.4-2.2 5.2-5.4 5.2-9.5 0-2.8-.9-5.1-2.7-7-1.8-1.9-5.2-3.6-10.1-5.2L246 52c-7.3-2.3-12.7-5.7-16-10.2-3.3-4.4-5-9.3-5-14.5 0-4.2.9-7.9 2.7-11.1 1.8-3.2 4.2-6 7.2-8.2 3-2.3 6.4-4 10.4-5.2 4-1.2 8.2-1.7 12.6-1.7 2.2 0 4.5.1 6.7.4 2.3.3 4.4.7 6.5 1.1 2 .5 3.9 1 5.7 1.6 1.8.6 3.2 1.2 4.2 1.8 1.4.8 2.4 1.6 3 2.5.6.8.9 1.9.9 3.3v4.7c0 2.1-.8 3.2-2.3 3.2-.8 0-2.1-.4-3.8-1.2-5.7-2.6-12.1-3.9-19.2-3.9-5.7 0-10.2.9-13.3 2.8-3.1 1.9-4.7 4.8-4.7 8.9 0 2.8 1 5.2 3 7.1 2 1.9 5.7 3.8 11 5.5l14.2 4.5c7.2 2.3 12.4 5.5 15.5 9.6 3.1 4.1 4.6 8.8 4.6 14 0 4.3-.9 8.2-2.6 11.6-1.8 3.4-4.2 6.4-7.3 8.8-3.1 2.5-6.8 4.3-11.1 5.6-4.5 1.4-9.2 2.1-14.3 2.1z"
      />
      <path
        fill={CYAN_EMPH}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M273.5 143.7c-32.9 24.3-80.7 37.2-121.8 37.2-57.6 0-109.5-21.3-148.7-56.7-3.1-2.8-.3-6.6 3.4-4.4 42.4 24.6 94.7 39.5 148.8 39.5 36.5 0 76.6-7.6 113.5-23.2 5.5-2.5 10.2 3.6 4.8 7.6z"
      />
      <path
        fill={CYAN_EMPH}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M287.2 128.1c-4.2-5.4-27.8-2.6-38.5-1.3-3.2.4-3.7-2.4-.8-4.5 18.8-13.2 49.7-9.4 53.3-5 3.6 4.5-1 35.4-18.6 50.2-2.7 2.3-5.3 1.1-4.1-1.9 4-9.9 12.9-32.2 8.7-37.5z"
      />
    </svg>
  );
}

function GoogleCloudLogo(box: LogoBox) {
  return (
    <svg {...box} viewBox="1 0.1 32.9 26.4" role="img" aria-label="Google Cloud">
      <path
        fill={CYAN_EMPH}
        d="M21.85 7.41l1 0 2.85-2.85.14-1.21A12.81 12.81 0 0 0 5 9.6a1.55 1.55 0 0 1 1-.06l5.7-.94s.29-.48.44-.45a7.11 7.11 0 0 1 9.73-.74z"
      />
      <path
        fill={CYAN_EMPH}
        d="M29.76 9.6a12.84 12.84 0 0 0-3.87-6.24l-4 4A7.11 7.11 0 0 1 24.5 13v.71a3.56 3.56 0 1 1 0 7.12h-7.12l-.71.72v4.27l.71.71h7.12A9.26 9.26 0 0 0 29.76 9.6z"
      />
      <path
        fill={CYAN_EMPH}
        d="M10.25 26.49h7.12v-5.7h-7.12a3.54 3.54 0 0 1-1.47-.32l-1 .31-2.87 2.85-.25 1a9.21 9.21 0 0 0 5.59 1.86z"
      />
      <path
        fill={CYAN_EMPH}
        d="M10.25 8a9.26 9.26 0 0 0-5.59 16.6l4.13-4.13a3.56 3.56 0 1 1 4.71-4.71l4.13-4.13A9.25 9.25 0 0 0 10.25 8z"
      />
    </svg>
  );
}

function AzureLogo(box: LogoBox) {
  return (
    <svg {...box} viewBox="4.1 6.5 88.5 83" role="img" aria-label="Microsoft Azure">
      <path
        fill={CYAN_EMPH}
        d="M33.338 6.544h26.038l-27.03 80.087a4.152 4.152 0 0 1-3.933 2.824H8.149a4.145 4.145 0 0 1-3.928-5.47L29.404 9.368a4.152 4.152 0 0 1 3.934-2.825z"
      />
      <path
        fill={CYAN_EMPH}
        d="M71.175 60.261h-41.29a1.911 1.911 0 0 0-1.305 3.309l26.532 24.764a4.171 4.171 0 0 0 2.846 1.121h23.38z"
      />
      <path
        fill={CYAN_EMPH}
        d="M66.595 9.364a4.145 4.145 0 0 0-3.928-2.82H33.648a4.146 4.146 0 0 1 3.928 2.82l25.184 74.62a4.146 4.146 0 0 1-3.928 5.472h29.02a4.146 4.146 0 0 0 3.927-5.472z"
      />
    </svg>
  );
}

// The cloud marks sit below the worker cards, grouped only by whitespace and
// with a clear gap from the fleet; their bottoms land near the notebook
// window's bottom edge (y=458). Widths follow each viewBox ratio.
const CLOUD_MID_X = (CARD_X[0] + FLEET_RIGHT) / 2;
const CLOUD_MID_Y = 440;
const CLOUD_GAP = 132;
const CLOUD_LOGOS = [
  { Logo: AwsLogo, h: 28, ar: 304 / 182 },
  { Logo: GoogleCloudLogo, h: 31, ar: 32.9 / 26.4 },
  { Logo: AzureLogo, h: 30, ar: 88.5 / 83 },
].map(({ Logo, h, ar }, i) => ({
  Logo,
  x: CLOUD_MID_X + (i - 1) * CLOUD_GAP - (h * ar) / 2,
  y: CLOUD_MID_Y - h / 2,
  width: h * ar,
  height: h,
}));

// Chip glyph, 24 units square, drawn once and reused per worker card.
function Chip({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x} ${y})`}
      stroke={CYAN_EMPH}
      strokeWidth={1.6}
      strokeLinecap="round"
      fill="none"
    >
      <rect x={4.5} y={4.5} width={15} height={15} rx={2.5} />
      <rect x={8.5} y={8.5} width={7} height={7} rx={1} />
      {[8, 12, 16].map((p) => (
        <g key={p}>
          <path d={`M${p} 1 v3.5`} />
          <path d={`M${p} 19.5 v3.5`} />
          <path d={`M1 ${p} h3.5`} />
          <path d={`M19.5 ${p} h3.5`} />
        </g>
      ))}
    </g>
  );
}

// The notebook window: chrome title bar, the selected input cell with its
// streamed output, then a second In/Out cell pair so the surface reads
// unmistakably as Jupyter. Pure HTML so the code is real text. Height is
// content-driven: the window ends where the last Out line ends, so no empty
// surface hangs below.
function NotebookWindow() {
  return (
    <div
      aria-hidden="true"
      data-nb="window"
      className="absolute overflow-hidden rounded-[14px]"
      style={{
        left: pct(WIN.x, VB.w),
        top: pct(WIN.y, VB.h),
        width: pct(WIN.w, VB.w),
        background: NB.surface,
        border: `1px solid ${NB.border}`,
        boxShadow: "0 22px 55px -24px rgba(0,0,0,0.7)",
      }}
    >
      <div
        className="flex h-[42px] items-center px-4"
        style={{ borderBottom: `1px solid ${NB.chromeLine}` }}
      >
        <span className="flex gap-[7px]">
          {NB.dots.map((dot) => (
            <span
              key={dot}
              className="h-[9px] w-[9px] rounded-full"
              style={{ background: dot }}
            />
          ))}
        </span>
        <span className="ml-3 font-mono text-[12px]" style={{ color: NB.title }}>
          {LAPTOP.window.title}
        </span>
      </div>

      <div className="px-[18px] pb-5 pt-4">
        <div
          data-nb="cell"
          className="relative rounded-lg"
          style={{ background: NB.cellBg }}
        >
          <span
            className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full"
            style={{ background: NB.bar }}
          />
          <div className="flex gap-3 px-4 py-3">
            <span
              className="shrink-0 font-mono text-[11.5px] leading-[24px]"
              style={{ color: NB.prompt }}
            >
              {LAPTOP.window.prompt}
            </span>
            <code
              data-nb="code"
              className="block whitespace-pre font-mono text-[13px] leading-[24px]"
              style={{ color: NB.code }}
            >
              <span className="block">
                <span style={{ color: NB.keyword }}>from</span> burla{" "}
                <span style={{ color: NB.keyword }}>import</span>{" "}
                <span style={{ color: NB.fn }}>remote_parallel_map</span>
              </span>
              <span className="block">&nbsp;</span>
              <span className="block">
                results = <span style={{ color: NB.fn }}>remote_parallel_map</span>(
              </span>
              <span className="block">
                {"    "}run_trial, param_grid, func_cpu=
                <span style={{ color: NB.num }}>64</span>,
              </span>
              <span className="block">)</span>
            </code>
          </div>
        </div>

        <div className="mt-4 font-mono text-[12px] leading-[1.9]">
          {LAPTOP.window.output.map((line) => {
            const [tag, ...rest] = line.split(/(?<=\])/);
            return (
              <p key={line}>
                <span style={{ color: NB.outTag }}>{tag}</span>
                <span style={{ color: NB.out }}>{rest.join("")}</span>
              </p>
            );
          })}
          <p className="mt-1">
            <span style={{ color: NB.done }}>✓ </span>
            <span className="font-medium" style={{ color: NB.code }}>
              {LAPTOP.window.done}
            </span>
          </p>
        </div>

        {/* Second cell: pull the best score back out of `results`. The dimmer
            bar marks it as the inactive cell; the Out[3] prompt pair is the
            Jupyter signature. */}
        <div
          data-nb="cell"
          className="relative mt-4 rounded-lg"
          style={{ background: NB.cellBg }}
        >
          <span
            className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full"
            style={{ background: NB.bar, opacity: 0.4 }}
          />
          <div className="flex gap-3 px-4 py-3">
            <span
              className="shrink-0 font-mono text-[11.5px] leading-[24px]"
              style={{ color: NB.prompt }}
            >
              {LAPTOP.window.prompt2}
            </span>
            <code
              className="block whitespace-pre font-mono text-[13px] leading-[24px]"
              style={{ color: NB.code }}
            >
              <span style={{ color: NB.fn }}>max</span>(r[
              <span style={{ color: NB.str }}>"auc"</span>]{" "}
              <span style={{ color: NB.keyword }}>for</span> r{" "}
              <span style={{ color: NB.keyword }}>in</span> results)
            </code>
          </div>
        </div>
        <div className="mt-2.5 flex gap-3 px-4 font-mono text-[12px]">
          <span style={{ color: NB.outPrompt }}>{LAPTOP.window.outPrompt}</span>
          <span style={{ color: NB.code }}>{LAPTOP.window.result}</span>
        </div>
      </div>
    </div>
  );
}

// One line icon per column below the schematic, keyed by LAPTOP.stats[].icon.
// Same designed-line language as the Workloads marks: 24-unit box, uniform
// 1.5 stroke, round caps and joins.
const STAT_ICONS: Record<string, ReactNode> = {
  // Stacked copies: one environment duplicated behind itself.
  replicate: (
    <>
      <rect x="3.5" y="8.5" width="12" height="12" rx="2.5" />
      <path d="M8.5 4.5h9a2.5 2.5 0 0 1 2.5 2.5v9" />
    </>
  ),
  // A laptop with output lines streaming onto its screen.
  stream: (
    <>
      <rect x="5" y="4.5" width="14" height="9.5" rx="1.5" />
      <path d="M3.5 17.5h17" />
      <path d="M8.5 7.5h7M8.5 10.5h4.5" />
    </>
  ),
  // A lightning bolt for the sub-second deploy.
  bolt: <path d="M13.4 3.5 6.6 13.4h4.7l-1.7 7.1 6.8-9.9h-4.7Z" />,
};

function StatIcon({ icon }: { icon: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-8 w-8 text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {STAT_ICONS[icon]}
    </svg>
  );
}

export function Laptop() {
  // Keep the generous top rhythm while tightening the next handoff by 16px.
  return (
    <section id="laptop" className="relative pb-24 pt-24 sm:pb-28 sm:pt-32">
      <div className="container-x">
        <Reveal>
          <h2 className="h-big max-w-4xl text-ink">
            <span className="block">{LAPTOP.heading[0]}</span>
            <span className="block text-accent">{LAPTOP.heading[1]}</span>
          </h2>
        </Reveal>

        <Reveal className="mt-12 sm:mt-14" y={20}>
          <figure className="relative">
            <svg
              viewBox={`0 0 ${VB.w} ${VB.h}`}
              role="img"
              aria-label="A Jupyter notebook running locally calls remote_parallel_map, fanning code out to a fleet of remote worker machines with sixty-four vCPUs each, hosted in your Amazon Web Services, Google Cloud, or Microsoft Azure account"
              className="block h-auto w-full"
              fill="none"
            >
              {/* Fan-out: one arrow per row of the near worker column, all
                  leaving the same point on the notebook's right edge. */}
              {rowCenters.map((yc) => (
                <g key={`fan-${yc}`}>
                  <path
                    d={`M${FAN_FROM.x} ${FAN_FROM.y} C ${FAN_C1} ${FAN_FROM.y - 0.03 * (yc - FAN_FROM.y)}, ${FAN_C2} ${yc + 0.05 * (yc - FAN_FROM.y)}, ${FAN_TO_X} ${yc}`}
                    stroke={CYAN_EMPH}
                    strokeWidth={1.6}
                    strokeLinecap="round"
                  />
                  <path
                    d={`M${FAN_TO_X - 10} ${yc - 5} L${FAN_TO_X} ${yc} L${FAN_TO_X - 10} ${yc + 5} Z`}
                    fill={CYAN_EMPH}
                  />
                </g>
              ))}

              {/* The fleet */}
              {LAPTOP.fleet.workers.map((name, i) => {
                const x = CARD_X[i % 2];
                const y = CARD_Y[Math.floor(i / 2)];
                return (
                  <g key={name}>
                    <rect
                      x={x}
                      y={y}
                      width={CARD.w}
                      height={CARD.h}
                      rx={CARD.rx}
                      fill="#081826"
                      stroke={CYAN_STRUCT}
                      strokeWidth={1}
                    />
                    <Chip x={x + 18} y={y + CARD.h / 2 - 12} />
                    <text
                      x={x + 56}
                      y={y + 31}
                      fontSize={15}
                      fontWeight={500}
                      fontFamily={MONO}
                      fill={ICE}
                    >
                      {name}
                    </text>
                    <text x={x + 56} y={y + 50} fontSize={11.5} fontFamily={MONO} fill={CYAN_EMPH}>
                      {LAPTOP.fleet.cpus}
                    </text>
                  </g>
                );
              })}

              {/* The monochrome cloud marks sit below the fleet without a
                  containing box or caption. */}
              {CLOUD_LOGOS.map(({ Logo, ...box }, i) => (
                <Logo key={LAPTOP.fleet.clouds[i]} {...box} />
              ))}
            </svg>

            <NotebookWindow />
          </figure>
        </Reveal>

        <Reveal className="mt-14 sm:mt-16" y={20}>
          <div className="grid grid-cols-3 gap-10">
            {LAPTOP.stats.map((stat) => (
              <div key={stat.label}>
                <StatIcon icon={stat.icon} />
                <h3 className="mt-4 font-display text-[20px] font-semibold leading-snug tracking-[-0.015em] text-ink">
                  {stat.label}
                </h3>
                <p className="mt-2.5 text-[17px] leading-7 text-inkDim">{stat.copy}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
