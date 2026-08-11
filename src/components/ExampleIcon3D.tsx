import { useEffect, useRef } from "react";

// Wireframe marks for the example cards. Geometry is defined once in model
// space, then projected to 2D every frame, so the marks read as real rotating
// objects without a WebGL context (the docs page already spends one on the
// landing galaxy, and a card grid must never depend on getting more).

type Vec3 = [number, number, number];
type Segment = [Vec3, Vec3];
type Accent = { segments: Segment[]; opacity: number };
type Dot = { position: Vec3; radius: number; live?: boolean };

export type Mark3DKind =
  | "cloud"
  | "gpu"
  | "clock"
  | "embed"
  | "etl"
  | "peak"
  | "net"
  | "city"
  | "scan"
  | "table"
  | "gate"
  | "sliders"
  | "merge"
  | "route"
  | "parquet"
  | "spiral"
  | "database"
  | "star"
  | "pin"
  | "code"
  | "image"
  | "globe"
  | "dice"
  | "helix"
  | "raindrop"
  | "raster"
  | "reads";

const TAU = Math.PI * 2;

const VIEW_W = 220;
const VIEW_H = 144;
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;
const SCALE = 112;
const CAMERA_Z = 4.4;
const FOCAL = 3.1;

// Segments land in one of three depth bands, each drawn at its own weight.
// That contrast is what makes a flat line drawing read as a solid volume.
const NEAR_BAND = 0.16;
const FAR_BAND = -0.16;

// Reduced motion still gets a considered pose: far enough into the cycle that
// hands, blocks, and signals sit in a legible arrangement rather than at zero.
const STATIC_POSE_TIME = 6;
const BASE_YAW = -0.24;
const BASE_PITCH = -0.2;

// Single knob for how fast every mark moves. These sit next to body copy, so
// they should barely register as moving: closer to a slow breath than an
// animation. Every card runs at this one rate.
const MOTION_RATE = 0.15;

function polyline(points: Vec3[], close = false): Segment[] {
  const segments: Segment[] = [];
  for (let i = 1; i < points.length; i += 1) segments.push([points[i - 1], points[i]]);
  if (close && points.length > 2) segments.push([points[points.length - 1], points[0]]);
  return segments;
}

/** Horizontal ring (cylinder cross-section) at height y. */
function ringXZ(radius: number, y: number, steps = 30): Segment[] {
  const points: Vec3[] = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * TAU;
    points.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
  }
  return polyline(points, true);
}

/** Upright ring (dial face) at depth z. */
function ringXY(radius: number, z: number, steps = 32): Segment[] {
  const points: Vec3[] = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * TAU;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius, z]);
  }
  return polyline(points, true);
}

/** Upright ring centered somewhere other than the origin. */
function ringXYAt(cx: number, cy: number, radius: number, z: number, steps = 18): Segment[] {
  const points: Vec3[] = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * TAU;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, z]);
  }
  return polyline(points, true);
}

/** Great circle through the poles at longitude phi. */
function meridian(radius: number, phi: number, steps = 32): Segment[] {
  const points: Vec3[] = [];
  for (let i = 0; i < steps; i += 1) {
    const theta = (i / steps) * TAU;
    points.push([
      radius * Math.cos(theta) * Math.cos(phi),
      radius * Math.sin(theta),
      radius * Math.cos(theta) * Math.sin(phi),
    ]);
  }
  return polyline(points, true);
}

/** Square grid lying flat at height y. */
function gridXZ(half: number, y: number, divisions: number): Segment[] {
  const segments: Segment[] = [];
  for (let i = 0; i <= divisions; i += 1) {
    const t = -half + (2 * half * i) / divisions;
    segments.push([
      [-half, y, t],
      [half, y, t],
    ]);
    segments.push([
      [t, y, -half],
      [t, y, half],
    ]);
  }
  return segments;
}

function box(
  width: number,
  height: number,
  depth: number,
  offsetZ = 0,
  offsetY = 0,
): Segment[] {
  const x = width / 2;
  const y0 = offsetY - height / 2;
  const y1 = offsetY + height / 2;
  const z0 = offsetZ - depth / 2;
  const z1 = offsetZ + depth / 2;
  const corners: Vec3[] = [
    [-x, y0, z0],
    [x, y0, z0],
    [x, y1, z0],
    [-x, y1, z0],
    [-x, y0, z1],
    [x, y0, z1],
    [x, y1, z1],
    [-x, y1, z1],
  ];
  const edges: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  return edges.map(([a, b]) => [corners[a], corners[b]] as Segment);
}

function translate(segments: Segment[], dx: number, dy: number, dz: number): Segment[] {
  return segments.map(
    ([a, b]) =>
      [
        [a[0] + dx, a[1] + dy, a[2] + dz],
        [b[0] + dx, b[1] + dy, b[2] + dz],
      ] as Segment,
  );
}

/** Bake extra camera pitch into geometry that would otherwise sit edge-on. */
function tiltSegments(segments: Segment[], pitch: number): Segment[] {
  return segments.map(
    ([a, b]) => [rotate(a, 0, pitch), rotate(b, 0, pitch)] as Segment,
  );
}

/** Axis-aligned square outline on a front-facing plane at depth z. */
function frontRect(cx: number, cy: number, halfW: number, halfH: number, z: number): Segment[] {
  return polyline(
    [
      [cx - halfW, cy - halfH, z],
      [cx + halfW, cy - halfH, z],
      [cx + halfW, cy + halfH, z],
      [cx - halfW, cy + halfH, z],
    ],
    true,
  );
}

/** A file travelling to or from storage. A solid block so it reads at any angle. */
function dataBlock(y: number, size: number): Segment[] {
  return box(size * 1.5, size, size, 0, y);
}

/** 0 at the ends of a travel cycle, 1 in the middle. */
function travelFade(progress: number): number {
  return Math.min(1, Math.sin(Math.PI * progress) * 1.6);
}

function helixPoint(
  radius: number,
  y0: number,
  y1: number,
  turns: number,
  phase: number,
  t: number,
): Vec3 {
  const angle = phase + t * turns * TAU;
  return [Math.cos(angle) * radius, y0 + (y1 - y0) * t, Math.sin(angle) * radius];
}

function helixStrand(
  radius: number,
  y0: number,
  y1: number,
  turns: number,
  phase: number,
  steps: number,
  from = 0,
  to = 1,
): Segment[] {
  const points: Vec3[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = from + ((to - from) * i) / steps;
    points.push(helixPoint(radius, y0, y1, turns, phase, t));
  }
  return polyline(points);
}

type IconSpec = {
  base: Segment[];
  accents: (time: number) => [Accent, Accent];
  dots: (time: number) => Dot[];
};

const BUCKET_RADIUS = 0.72;
const BUCKET_TOP = 0.14;
const BUCKET_BOTTOM = -0.6;

const bucketStruts: Segment[] = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * TAU;
  const x = Math.cos(angle) * BUCKET_RADIUS;
  const z = Math.sin(angle) * BUCKET_RADIUS;
  return [
    [x, BUCKET_TOP, z],
    [x, BUCKET_BOTTOM, z],
  ] as Segment;
});

const CHIP_PIN_OFFSETS = [-0.4, -0.135, 0.135, 0.4];

const chipPins: Segment[] = CHIP_PIN_OFFSETS.flatMap((offset) => [
  [
    [offset, 0.57, 0],
    [offset, 0.8, 0],
  ] as Segment,
  [
    [offset, -0.57, 0],
    [offset, -0.8, 0],
  ] as Segment,
  [
    [0.57, offset, 0],
    [0.8, offset, 0],
  ] as Segment,
  [
    [-0.57, offset, 0],
    [-0.8, offset, 0],
  ] as Segment,
]);

const DIAL_RADIUS = 0.78;

const dialStruts: Segment[] = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * TAU;
  const x = Math.cos(angle) * DIAL_RADIUS;
  const y = Math.sin(angle) * DIAL_RADIUS;
  return [
    [x, y, -0.1],
    [x, y, 0.1],
  ] as Segment;
});

const dialTicks: Segment[] = Array.from({ length: 12 }, (_, index) => {
  const angle = (index / 12) * TAU;
  const inner = index % 3 === 0 ? 0.44 : 0.52;
  return [
    [Math.cos(angle) * inner, Math.sin(angle) * inner, 0.1],
    [Math.cos(angle) * 0.58, Math.sin(angle) * 0.58, 0.1],
  ] as Segment;
});

/** Walks the perimeter of a square, so a signal can trace the chip's die. */
function squarePerimeter(progress: number, half: number, z: number): Vec3 {
  const side = Math.floor(progress * 4) % 4;
  const along = (progress * 4) % 1;
  const span = half * 2 * along - half;
  if (side === 0) return [span, -half, z];
  if (side === 1) return [half, span, z];
  if (side === 2) return [-span, half, z];
  return [-half, -span, z];
}

function hand(angle: number, length: number, z: number): Segment[] {
  return [
    [
      [0, 0, z],
      [Math.cos(angle) * length, Math.sin(angle) * length, z],
    ],
  ];
}

// ---- sliders ---------------------------------------------------------------

const SLIDER_RAIL_X = [-0.38, 0, 0.38];
const SLIDER_FACE_Z = 0.08;

const sliderRails: Segment[] = SLIDER_RAIL_X.map(
  (x) =>
    [
      [x, -0.32, SLIDER_FACE_Z],
      [x, 0.32, SLIDER_FACE_Z],
    ] as Segment,
);

function sliderKnobY(time: number, index: number): number {
  return Math.sin(time * 0.6 + index * 2.1) * 0.24;
}

// ---- merge -----------------------------------------------------------------

const FUNNEL_TOP_R = 0.66;
const FUNNEL_BOTTOM_R = 0.16;

const funnelStruts: Segment[] = Array.from({ length: 6 }, (_, index) => {
  const angle = (index / 6) * TAU;
  return [
    [Math.cos(angle) * FUNNEL_TOP_R, 0.35, Math.sin(angle) * FUNNEL_TOP_R],
    [Math.cos(angle) * FUNNEL_BOTTOM_R, -0.2, Math.sin(angle) * FUNNEL_BOTTOM_R],
  ] as Segment;
});

// ---- route -----------------------------------------------------------------

// The fork lives in a flat plane, which is illegible at the near-level camera
// pitch the other marks use, so its geometry is baked with extra tilt.
const ROUTE_TILT = -0.55;

const ROUTE_BRANCHES: Vec3[][] = [
  [
    [-0.15, 0, 0],
    [0.25, 0, -0.32],
    [0.75, 0, -0.52],
  ],
  [
    [-0.15, 0, 0],
    [0.8, 0, 0],
  ],
  [
    [-0.15, 0, 0],
    [0.25, 0, 0.32],
    [0.75, 0, 0.52],
  ],
];

function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Position along trunk-then-branch, so travelers fan out at the fork. */
function routePosition(progress: number, branch: Vec3[]): Vec3 {
  if (progress < 0.4) return lerp3([-0.85, 0, 0], [-0.15, 0, 0], progress / 0.4);
  const local = (progress - 0.4) / 0.6;
  if (branch.length === 2) return lerp3(branch[0], branch[1], local);
  return local < 0.5
    ? lerp3(branch[0], branch[1], local * 2)
    : lerp3(branch[1], branch[2], local * 2 - 1);
}

// ---- spiral ----------------------------------------------------------------

const SPIRAL = { radius: 0.56, y0: -0.55, y1: 0.55, turns: 2.2 };

// ---- star ------------------------------------------------------------------

function octahedron(radius: number): Segment[] {
  const top: Vec3 = [0, radius, 0];
  const bottom: Vec3 = [0, -radius, 0];
  const ring: Vec3[] = [
    [radius, 0, 0],
    [0, 0, radius],
    [-radius, 0, 0],
    [0, 0, -radius],
  ];
  const segments: Segment[] = [];
  ring.forEach((corner, index) => {
    segments.push([top, corner]);
    segments.push([bottom, corner]);
    segments.push([corner, ring[(index + 1) % 4]]);
  });
  return segments;
}

// ---- pin -------------------------------------------------------------------

const pinShape: Segment[] = [
  ...ringXZ(0.24, 0.3, 16),
  ...ringXZ(0.1, 0.46, 12),
  ...Array.from({ length: 4 }, (_, index) => {
    const angle = (index / 4) * TAU;
    return [
      [Math.cos(angle) * 0.24, 0.3, Math.sin(angle) * 0.24],
      [0, -0.28, 0],
    ] as Segment;
  }),
];

// ---- dice ------------------------------------------------------------------

/** A pip drawn as a small x so it stays visible from oblique angles. */
function pip(x: number, y: number, z: number, axis: "x" | "y" | "z"): Segment[] {
  const s = 0.055;
  if (axis === "z") {
    return [
      [
        [x - s, y - s, z],
        [x + s, y + s, z],
      ],
      [
        [x - s, y + s, z],
        [x + s, y - s, z],
      ],
    ];
  }
  if (axis === "y") {
    return [
      [
        [x - s, y, z - s],
        [x + s, y, z + s],
      ],
      [
        [x - s, y, z + s],
        [x + s, y, z - s],
      ],
    ];
  }
  return [
    [
      [x, y - s, z - s],
      [x, y + s, z + s],
    ],
    [
      [x, y + s, z - s],
      [x, y - s, z + s],
    ],
  ];
}

const DIE_HALF = 0.44;

const DIE_PIPS: Vec3[] = [
  // three on the front face
  [-0.18, 0.18, DIE_HALF],
  [0, 0, DIE_HALF],
  [0.18, -0.18, DIE_HALF],
  // two on the top face
  [-0.18, DIE_HALF, 0.18],
  [0.18, DIE_HALF, -0.18],
  // one on the right face
  [DIE_HALF, 0, 0],
];

const dieSegments: Segment[] = [
  ...box(DIE_HALF * 2, DIE_HALF * 2, DIE_HALF * 2),
  ...pip(-0.18, 0.18, DIE_HALF, "z"),
  ...pip(0, 0, DIE_HALF, "z"),
  ...pip(0.18, -0.18, DIE_HALF, "z"),
  ...pip(-0.18, DIE_HALF, 0.18, "y"),
  ...pip(0.18, DIE_HALF, -0.18, "y"),
  ...pip(DIE_HALF, 0, 0, "x"),
];

// ---- embed -----------------------------------------------------------------

/** A tiny 3D cross marking a point in the embedding space. */
function pointMark(position: Vec3): Segment[] {
  const [x, y, z] = position;
  const s = 0.05;
  return [
    [
      [x - s, y, z],
      [x + s, y, z],
    ],
    [
      [x, y - s, z],
      [x, y + s, z],
    ],
    [
      [x, y, z - s],
      [x, y, z + s],
    ],
  ];
}

const EMBED_POINTS: Vec3[] = [
  [0.35, 0.3, -0.2],
  [-0.4, 0.15, 0.3],
  [0.15, -0.35, 0.35],
  [-0.25, -0.3, -0.35],
  [0.45, -0.12, 0.15],
  [-0.12, 0.4, 0.18],
  [0.05, 0.05, -0.45],
];

// ---- etl -------------------------------------------------------------------

const etlPipeline: Segment[] = [
  ...translate(box(0.34, 0.34, 0.34), -0.68, 0, 0),
  ...box(0.42, 0.42, 0.42),
  [
    [-0.51, 0, 0],
    [-0.21, 0, 0],
  ],
  [
    [0.21, 0, 0],
    [0.44, 0, 0],
  ],
  ...translate(ringXZ(0.24, 0.22, 16), 0.68, 0, 0),
  ...translate(ringXZ(0.24, -0.22, 16), 0.68, 0, 0),
  ...Array.from({ length: 4 }, (_, index) => {
    const angle = (index / 4) * TAU;
    return [
      [0.68 + Math.cos(angle) * 0.24, 0.22, Math.sin(angle) * 0.24],
      [0.68 + Math.cos(angle) * 0.24, -0.22, Math.sin(angle) * 0.24],
    ] as Segment;
  }),
];

// ---- peak ------------------------------------------------------------------

/** Loss-surface height: one clear optimum for the tuner to find. */
function peakHeight(x: number, z: number): number {
  const dx = x - 0.15;
  const dz = z + 0.1;
  return 0.5 * Math.exp(-(dx * dx + dz * dz) / 0.16) - 0.28;
}

const peakMesh: Segment[] = (() => {
  const segments: Segment[] = [];
  const n = 6;
  const half = 0.75;
  const at = (i: number) => -half + (2 * half * i) / n;
  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const x0 = at(j);
      const x1 = at(j + 1);
      const z = at(i);
      segments.push([
        [x0, peakHeight(x0, z), z],
        [x1, peakHeight(x1, z), z],
      ]);
      segments.push([
        [z, peakHeight(z, x0), x0],
        [z, peakHeight(z, x1), x1],
      ]);
    }
  }
  return segments;
})();

// ---- net -------------------------------------------------------------------

const NET_LAYERS: Vec3[][] = [
  [
    [-0.6, -0.3, 0.12],
    [-0.6, 0, -0.12],
    [-0.6, 0.3, 0.12],
  ],
  [
    [0, -0.42, -0.1],
    [0, -0.14, 0.14],
    [0, 0.14, -0.14],
    [0, 0.42, 0.1],
  ],
  [
    [0.6, -0.16, 0.1],
    [0.6, 0.16, -0.1],
  ],
];

const netEdges: Segment[] = [
  ...NET_LAYERS[0].flatMap((a) => NET_LAYERS[1].map((b) => [a, b] as Segment)),
  ...NET_LAYERS[1].flatMap((a) => NET_LAYERS[2].map((b) => [a, b] as Segment)),
];

const netNodes: Segment[] = NET_LAYERS.flat().flatMap((node) => pointMark(node));

// ---- city ------------------------------------------------------------------

const CITY_GROUND = -0.45;

const CITY_BUILDINGS: [number, number, number][] = [
  // [x, z, height]
  [-0.5, -0.5, 0.55],
  [-0.15, -0.42, 0.34],
  [0.3, -0.55, 0.72],
  [-0.55, 0.2, 0.4],
  [0.05, 0.12, 0.62],
  [0.5, 0.3, 0.3],
  [-0.15, 0.55, 0.46],
];

function building(x: number, z: number, height: number): Segment[] {
  return translate(box(0.2, height, 0.2), x, CITY_GROUND + height / 2, z);
}

// ---- scan ------------------------------------------------------------------

const SCAN_COLUMN_X = [-0.3, 0, 0.3];

const scanSheet: Segment[] = [
  ...box(1.2, 0.09, 0.8, 0, -0.05),
  ...SCAN_COLUMN_X.map(
    (x) =>
      [
        [x, 0, -0.4],
        [x, 0, 0.4],
      ] as Segment,
  ),
];

// ---- table -----------------------------------------------------------------

const tableGrid: Segment[] = (() => {
  const segments: Segment[] = [...box(1.1, 0.85, 0.12)];
  for (let i = 1; i < 4; i += 1) {
    const x = -0.55 + (1.1 * i) / 4;
    segments.push([
      [x, -0.425, 0.061],
      [x, 0.425, 0.061],
    ]);
  }
  for (let i = 1; i < 4; i += 1) {
    const y = -0.425 + (0.85 * i) / 4;
    segments.push([
      [-0.55, y, 0.061],
      [0.55, y, 0.061],
    ]);
  }
  return segments;
})();

// ---- gate ------------------------------------------------------------------

const gateWalls: Segment[] = [
  ...box(0.12, 0.75, 0.5, -0.42),
  ...box(0.12, 0.75, 0.5, 0.42),
  // records waiting in the queue
  ...translate(box(0.13, 0.13, 0.13), -0.52, 0, 0),
  ...translate(box(0.13, 0.13, 0.13), -0.74, 0, 0),
];

// ---- helix -----------------------------------------------------------------

// Drawn on its side: a vertical double helix at this size collapses into a
// scribble, while the horizontal silhouette is instantly readable as DNA.
const HELIX = { radius: 0.34, y0: -0.82, y1: 0.82, turns: 1.5 };

function sideways(point: Vec3): Vec3 {
  return [point[1], point[0], point[2]];
}

function sidewaysSegments(segments: Segment[]): Segment[] {
  return segments.map(([a, b]) => [sideways(a), sideways(b)] as Segment);
}

const helixRungs: Segment[] = Array.from({ length: 9 }, (_, index) => {
  const t = index / 8;
  return [
    helixPoint(HELIX.radius, HELIX.y0, HELIX.y1, HELIX.turns, 0, t),
    helixPoint(HELIX.radius, HELIX.y0, HELIX.y1, HELIX.turns, Math.PI, t),
  ] as Segment;
});

// ---- raster ----------------------------------------------------------------

const RASTER_HALF = 0.75;
const RASTER_DIVISIONS = 4;
const RASTER_CELL = (RASTER_HALF * 2) / RASTER_DIVISIONS;
const RASTER_Y = -0.15;
const RASTER_LIFT = 0.2;

function rasterCellCenter(index: number): [number, number] {
  const col = index % RASTER_DIVISIONS;
  const row = Math.floor(index / RASTER_DIVISIONS) % RASTER_DIVISIONS;
  return [
    -RASTER_HALF + RASTER_CELL * (col + 0.5),
    -RASTER_HALF + RASTER_CELL * (row + 0.5),
  ];
}

// Visit order hops around the grid so the "processing" tile does not scan
// boringly left to right.
const RASTER_ORDER = [0, 6, 11, 3, 13, 5, 10, 1, 15, 8, 2, 12, 7, 14, 4, 9];

const READ_DEPTH = 0.13;
const READ_HEIGHT = 0.07;
const READ_REFERENCE_Y = -0.72;
const READ_LANDING_Y = 0.92;

/** One sequencing read: a short slab sitting at x on row y, at depth z. */
function readSlab(x: number, y: number, width: number, z = 0): Segment[] {
  return translate(box(width, READ_HEIGHT, READ_DEPTH), x, y, z);
}

// A pileup: reads scattered over the reference in both x and depth, so the
// stack reads as staggered coverage rather than a set of full-width planks.
const READ_PILEUP: [number, number, number, number][] = [
  [-0.46, -0.42, 0.46, 0.18],
  [0.34, -0.42, 0.54, -0.16],
  [-0.54, -0.16, 0.3, -0.2],
  [0.14, -0.16, 0.58, 0.14],
  [-0.3, 0.1, 0.62, -0.1],
  [0.52, 0.1, 0.28, 0.2],
  [-0.02, 0.36, 0.44, -0.18],
];

// Each landing read drops into the gap its row leaves open.
const READ_LANDINGS: [number, number, number, number][] = [
  [0.5, 0.36, 0.36, 0.16],
  [-0.52, 0.36, 0.4, 0.02],
  [0.16, 0.62, 0.46, -0.14],
];

// Reference strand: a long spine with base ticks along it.
const READ_REFERENCE: Segment[] = [
  ...box(1.76, 0.05, READ_DEPTH, 0, READ_REFERENCE_Y),
  ...Array.from({ length: 7 }, (_, index) => {
    const x = -0.72 + index * 0.24;
    return [
      [x, READ_REFERENCE_Y + 0.025, -READ_DEPTH / 2],
      [x, READ_REFERENCE_Y + 0.025, READ_DEPTH / 2],
    ] as Segment;
  }),
];

const ICONS: Record<Mark3DKind, IconSpec> = {
  // Cloud storage: a bucket with files leaving and arriving.
  cloud: {
    base: [
      ...ringXZ(BUCKET_RADIUS, BUCKET_TOP),
      ...ringXZ(BUCKET_RADIUS, -0.23),
      ...ringXZ(BUCKET_RADIUS, BUCKET_BOTTOM),
      ...ringXZ(BUCKET_RADIUS * 0.58, BUCKET_TOP, 24),
      ...bucketStruts,
    ],
    accents: (time) => {
      const rising = (time * 0.38) % 1;
      const falling = (time * 0.38 + 0.5) % 1;
      return [
        {
          segments: dataBlock(0.32 + rising * 0.38, 0.15),
          opacity: travelFade(rising),
        },
        {
          segments: dataBlock(0.7 - falling * 0.38, 0.13),
          opacity: travelFade(falling),
        },
      ];
    },
    dots: () => [],
  },

  // GPU: a chip package with pins and a die that pulses under a scan line.
  gpu: {
    base: [
      ...box(1.14, 1.14, 0.2),
      ...polyline(
        [
          [-0.4, -0.4, 0.101],
          [0.4, -0.4, 0.101],
          [0.4, 0.4, 0.101],
          [-0.4, 0.4, 0.101],
        ],
        true,
      ),
      ...chipPins,
    ],
    accents: (time) => {
      const pulse = 1 + Math.sin(time * 2.1) * 0.045;
      return [
        {
          segments: box(0.52 * pulse, 0.52 * pulse, 0.18, 0.19),
          opacity: 0.72 + Math.sin(time * 2.1) * 0.22,
        },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => [
      { position: squarePerimeter((time * 0.22) % 1, 0.27, 0.29), radius: 3, live: true },
    ],
  },

  // Background jobs: a dial that keeps turning with work orbiting around it.
  clock: {
    base: [
      ...ringXY(DIAL_RADIUS, 0.1, 34),
      ...ringXY(DIAL_RADIUS, -0.1, 34),
      ...ringXY(0.58, 0.1, 30),
      ...dialStruts,
      ...dialTicks,
    ],
    accents: (time) => [
      {
        segments: hand(Math.PI / 2 - time * 0.16, 0.3, 0.14),
        opacity: 0.85,
      },
      {
        segments: hand(Math.PI / 2 - time * 0.62, 0.46, 0.14),
        opacity: 1,
      },
    ],
    dots: (time) => {
      const angle = time * 0.5;
      return [
        {
          position: [Math.cos(angle) * 1.02, Math.sin(angle) * 0.24, Math.sin(angle) * 0.88],
          radius: 3.4,
        },
        { position: [0, 0, 0.14], radius: 2.6 },
      ];
    },
  },

  // Embeddings: a vector space with lookups reaching out to each point.
  embed: {
    base: [
      ...box(1.2, 1.05, 1.05),
      ...EMBED_POINTS.flatMap((point) => pointMark(point)),
    ],
    accents: (time) => {
      const beat = time * 0.25;
      const local = beat % 1;
      const target = EMBED_POINTS[Math.floor(beat) % EMBED_POINTS.length];
      const reach = Math.sin(Math.PI * local);
      return [
        {
          segments: [
            [
              [0, 0, 0],
              [target[0] * reach, target[1] * reach, target[2] * reach],
            ],
          ],
          opacity: 0.85 * travelFade(local),
        },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const beat = time * 0.25;
      const local = beat % 1;
      const target = EMBED_POINTS[Math.floor(beat) % EMBED_POINTS.length];
      const reach = Math.sin(Math.PI * local);
      return [
        {
          position: [target[0] * reach, target[1] * reach, target[2] * reach],
          radius: 2.4 * travelFade(local),
          live: true,
        },
      ];
    },
  },

  // ETL: extract and transform stages feeding a database, one record at a time.
  etl: {
    base: etlPipeline,
    accents: (time) => {
      const p = (time * 0.3) % 1;
      return [
        { segments: [], opacity: 0 },
        {
          segments: translate(box(0.13, 0.13, 0.13), -0.68 + p * 1.36, 0, 0),
          opacity: travelFade(p),
        },
      ];
    },
    dots: () => [],
  },

  // Hyperparameter tuning: a search spiraling in on the optimum of a surface.
  peak: {
    base: peakMesh,
    accents: () => [
      { segments: [], opacity: 0 },
      { segments: [], opacity: 0 },
    ],
    dots: (time) => {
      const p = (time * 0.16) % 1;
      const angle = p * 3 * TAU;
      const r = 0.62 * (1 - p);
      const x = 0.15 + Math.cos(angle) * r;
      const z = -0.1 + Math.sin(angle) * r;
      return [
        {
          position: [x, peakHeight(x, z) + 0.05, z],
          radius: 2.4,
          live: true,
        },
      ];
    },
  },

  // Batch inference: activations flowing through a small network.
  net: {
    base: [...netEdges, ...netNodes],
    accents: (time) => {
      const beat = time * 0.3;
      const local = beat % 1;
      const step = Math.floor(beat);
      const input = NET_LAYERS[0][step % 3];
      const hidden = NET_LAYERS[1][(step * 2 + 1) % 4];
      const output = NET_LAYERS[2][step % 2];
      const segments: Segment[] =
        local < 0.5 ? [[input, hidden]] : [[hidden, output]];
      return [
        { segments, opacity: 0.8 * travelFade(local) },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const beat = time * 0.3;
      const local = beat % 1;
      const step = Math.floor(beat);
      const input = NET_LAYERS[0][step % 3];
      const hidden = NET_LAYERS[1][(step * 2 + 1) % 4];
      const output = NET_LAYERS[2][step % 2];
      const position =
        local < 0.5
          ? lerp3(input, hidden, local * 2)
          : lerp3(hidden, output, local * 2 - 1);
      return [{ position, radius: 2.4 * travelFade(local), live: true }];
    },
  },

  // Taxi data: a city block with a cab circling and a neighborhood fading.
  city: {
    base: [
      ...gridXZ(0.75, CITY_GROUND, 4),
      ...CITY_BUILDINGS.slice(0, 6).flatMap(([x, z, h]) => building(x, z, h)),
    ],
    accents: (time) => {
      const [x, z, h] = CITY_BUILDINGS[6];
      return [
        {
          segments: building(x, z, h),
          opacity: 0.25 + (Math.sin(time * 0.8) * 0.5 + 0.5) * 0.6,
        },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const walk = squarePerimeter((time * 0.12) % 1, 0.375, 0);
      return [
        { position: [walk[0], CITY_GROUND + 0.02, walk[1]], radius: 2.4, live: true },
      ];
    },
  },

  // Parquet audit: a scan line sweeping the length of one shard.
  scan: {
    base: scanSheet,
    accents: (time) => {
      const p = (time * 0.25) % 1;
      const x = -0.55 + p * 1.1;
      return [
        {
          segments: [
            [
              [x, 0.01, -0.42],
              [x, 0.01, 0.42],
            ],
          ],
          opacity: travelFade(p),
        },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const p = (time * 0.25) % 1;
      return [
        {
          position: [-0.55 + p * 1.1, 0.01, 0.42],
          radius: 2.2 * travelFade(p),
          live: true,
        },
      ];
    },
  },

  // Dataframes: a table with a transform sweeping row by row.
  table: {
    base: tableGrid,
    accents: (time) => {
      const p = (time * 0.2) % 1;
      const y = 0.32 - p * 0.64;
      return [
        {
          segments: frontRect(0, y, 0.55, 0.1, 0.07),
          opacity: 0.85 * travelFade(p),
        },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const p = (time * 0.2) % 1;
      return [
        {
          position: [-0.55, 0.32 - p * 0.64, 0.07],
          radius: 2.2 * travelFade(p),
          live: true,
        },
      ];
    },
  },

  // Rate-limited backfill: records queue up and pass the gate one at a time.
  gate: {
    base: gateWalls,
    accents: (time) => {
      const p = (time * 0.28) % 1;
      return [
        { segments: [], opacity: 0 },
        {
          segments: translate(box(0.13, 0.13, 0.13), -0.3 + p * 1.05, 0, 0),
          opacity: travelFade(p),
        },
      ];
    },
    dots: () => [],
  },

  // Rate limits: a control panel whose faders settle at different levels.
  sliders: {
    base: [...box(1.3, 1.0, 0.16), ...sliderRails],
    accents: (time) => {
      const outer = [
        ...frontRect(SLIDER_RAIL_X[0], sliderKnobY(time, 0), 0.08, 0.05, 0.09),
        ...frontRect(SLIDER_RAIL_X[2], sliderKnobY(time, 2), 0.08, 0.05, 0.09),
      ];
      return [
        { segments: outer, opacity: 0.9 },
        {
          segments: frontRect(SLIDER_RAIL_X[1], sliderKnobY(time, 1), 0.08, 0.05, 0.09),
          opacity: 1,
        },
      ];
    },
    dots: () => [],
  },

  // Map-reduce: many blocks funnel down into one output.
  merge: {
    base: [
      ...ringXZ(FUNNEL_TOP_R, 0.35, 26),
      ...ringXZ(FUNNEL_BOTTOM_R, -0.2, 14),
      ...funnelStruts,
      ...box(0.44, 0.3, 0.44, 0, -0.55),
    ],
    accents: (time) => {
      const fall = (time * 0.3) % 1;
      const drop = (time * 0.3 + 0.5) % 1;
      const spread = 0.34 * (1 - fall);
      return [
        {
          segments: [
            ...translate(dataBlock(0.85 - fall * 0.42, 0.12), -spread, 0, 0),
            ...translate(dataBlock(0.85 - fall * 0.42, 0.12), spread, 0, 0),
          ],
          opacity: travelFade(fall),
        },
        {
          segments: dataBlock(-0.24 - drop * 0.2, 0.11),
          opacity: travelFade(drop) * 0.9,
        },
      ];
    },
    dots: () => [],
  },

  // Splitting work: one path forks into three, with travelers fanning out.
  route: {
    base: tiltSegments(
      [
        ...polyline([
          [-0.85, 0, 0],
          [-0.15, 0, 0],
        ]),
        ...ROUTE_BRANCHES.flatMap((branch) => polyline(branch)),
        ...translate(ringXZ(0.09, 0, 12), -0.85, 0, 0),
        ...translate(ringXZ(0.09, 0, 12), 0.75, 0, -0.52),
        ...translate(ringXZ(0.09, 0, 12), 0.8, 0, 0),
        ...translate(ringXZ(0.09, 0, 12), 0.75, 0, 0.52),
      ],
      ROUTE_TILT,
    ),
    accents: () => [
      { segments: [], opacity: 0 },
      { segments: [], opacity: 0 },
    ],
    dots: (time) => [
      {
        position: rotate(routePosition((time * 0.25) % 1, ROUTE_BRANCHES[0]), 0, ROUTE_TILT),
        radius: 2.6,
      },
      {
        position: rotate(
          routePosition((time * 0.25 + 0.45) % 1, ROUTE_BRANCHES[2]),
          0,
          ROUTE_TILT,
        ),
        radius: 2.6,
        live: true,
      },
    ],
  },

  // Thousands of files: a stack of shards with one being pulled for work.
  parquet: {
    base: [
      ...box(1.1, 0.1, 0.72, 0, -0.39),
      ...box(1.1, 0.1, 0.72, 0, -0.13),
      ...box(1.1, 0.1, 0.72, 0, 0.39),
    ],
    accents: (time) => {
      const slide = (Math.sin(time * 0.5) * 0.5 + 0.5) * 0.34;
      return [
        {
          segments: translate(box(1.1, 0.1, 0.72, 0, 0.13), slide, 0, 0),
          opacity: 0.95,
        },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const slide = (Math.sin(time * 0.5) * 0.5 + 0.5) * 0.34;
      return [{ position: [0.55 + slide, 0.13, 0.36], radius: 2.3, live: true }];
    },
  },

  // One giant file: a stream coiling through, chunk by chunk.
  spiral: {
    base: [
      ...helixStrand(SPIRAL.radius, SPIRAL.y0, SPIRAL.y1, SPIRAL.turns, 0, 72),
      [
        [0, SPIRAL.y0 - 0.1, 0],
        [0, SPIRAL.y1 + 0.1, 0],
      ],
    ],
    accents: (time) => {
      const p = (time * 0.14) % 1;
      return [
        {
          segments: helixStrand(
            SPIRAL.radius,
            SPIRAL.y0,
            SPIRAL.y1,
            SPIRAL.turns,
            0,
            10,
            Math.max(0, p - 0.1),
            p,
          ),
          opacity: 1,
        },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const p = (time * 0.14) % 1;
      return [
        {
          position: helixPoint(SPIRAL.radius, SPIRAL.y0, SPIRAL.y1, SPIRAL.turns, 0, p),
          radius: 2.6,
          live: true,
        },
      ];
    },
  },

  // Databases: the classic cylinder, with a read sweeping down the rows.
  database: {
    base: [
      ...ringXZ(0.6, 0.5, 26),
      ...ringXZ(0.6, 0, 26),
      ...ringXZ(0.6, -0.5, 26),
      ...Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * TAU;
        return [
          [Math.cos(angle) * 0.6, 0.5, Math.sin(angle) * 0.6],
          [Math.cos(angle) * 0.6, -0.5, Math.sin(angle) * 0.6],
        ] as Segment;
      }),
    ],
    accents: (time) => {
      const sweep = (time * 0.32) % 1;
      return [
        {
          segments: ringXZ(0.54, 0.5 - sweep, 22),
          opacity: travelFade(sweep),
        },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const sweep = (time * 0.32) % 1;
      return [
        {
          position: [0.54, 0.5 - sweep, 0],
          radius: 2.4 * travelFade(sweep),
          live: true,
        },
      ];
    },
  },

  // Semantic search: a gem being inspected, with a probe circling it.
  star: {
    base: [...octahedron(0.72), ...ringXZ(0.52, 0, 26)],
    accents: (time) => {
      const scale = 0.42 + Math.sin(time * 1.1) * 0.05;
      return [
        {
          segments: octahedron(scale),
          opacity: 0.65 + Math.sin(time * 1.1) * 0.2,
        },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const angle = time * 0.42;
      return [
        {
          position: [Math.cos(angle) * 0.98, Math.sin(angle * 1.3) * 0.22, Math.sin(angle) * 0.98],
          radius: 2.8,
          live: true,
        },
      ];
    },
  },

  // Geotagged photos: a pin hovering over a ground grid.
  pin: {
    base: [...gridXZ(0.8, -0.5, 4), ...ringXZ(0.32, -0.49, 18)],
    accents: (time) => {
      const bob = Math.sin(time * 0.9) * 0.05;
      return [
        { segments: translate(pinShape, 0, bob, 0), opacity: 0.95 },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const bob = Math.sin(time * 0.9) * 0.05;
      return [{ position: [0, 0.32 + bob, 0], radius: 2.6, live: true }];
    },
  },

  // Code analysis: a terminal with a prompt and a patient cursor.
  code: {
    base: [
      ...box(1.3, 0.9, 0.14),
      ...polyline([
        [-0.65, 0.27, 0.071],
        [0.65, 0.27, 0.071],
      ]),
      ...polyline([
        [-0.28, 0.1, 0.071],
        [0.18, 0.1, 0.071],
      ]),
      ...polyline([
        [-0.45, -0.06, 0.071],
        [0.32, -0.06, 0.071],
      ]),
      ...polyline([
        [-0.45, -0.22, 0.071],
        [0.05, -0.22, 0.071],
      ]),
    ],
    accents: (time) => [
      {
        segments: [
          [
            [-0.5, 0.16, 0.071],
            [-0.38, 0.1, 0.071],
          ],
          [
            [-0.38, 0.1, 0.071],
            [-0.5, 0.04, 0.071],
          ],
        ],
        opacity: 0.95,
      },
      {
        segments: [
          [
            [0.14, -0.28, 0.071],
            [0.14, -0.16, 0.071],
          ],
        ],
        opacity: Math.sin(time * 2.4) > 0 ? 1 : 0.12,
      },
    ],
    dots: () => [],
  },

  // Image resizing: a framed scene with its output size breathing.
  image: {
    base: [
      ...box(1.25, 0.9, 0.12),
      ...polyline([
        [-0.5, -0.3, 0.061],
        [-0.2, 0.06, 0.061],
        [-0.02, -0.12, 0.061],
        [0.26, 0.2, 0.061],
        [0.5, -0.3, 0.061],
      ]),
      ...ringXYAt(-0.36, 0.22, 0.09, 0.061, 14),
    ],
    accents: (time) => {
      const scale = 0.72 + Math.sin(time * 0.7) * 0.14;
      return [
        {
          segments: frontRect(0, 0, 0.55 * scale, 0.36 * scale, 0.07),
          opacity: 0.85,
        },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const scale = 0.72 + Math.sin(time * 0.7) * 0.14;
      return [{ position: [0.55 * scale, 0.36 * scale, 0.07], radius: 2.4, live: true }];
    },
  },

  // Web scraping: the globe with a crawler in orbit.
  globe: {
    base: [
      ...ringXZ(0.7, 0, 32),
      ...ringXZ(0.574, 0.4, 26),
      ...ringXZ(0.574, -0.4, 26),
      ...meridian(0.7, 0),
      ...meridian(0.7, TAU / 6),
      ...meridian(0.7, TAU / 3),
    ],
    accents: () => [
      { segments: [], opacity: 0 },
      { segments: [], opacity: 0 },
    ],
    dots: (time) => {
      const angle = time * 0.4;
      return [
        {
          position: [Math.cos(angle) * 0.98, Math.sin(angle) * 0.34, Math.sin(angle) * 0.86],
          radius: 2.8,
          live: true,
        },
      ];
    },
  },

  // Monte Carlo: a die with the highlighted pip hopping at random.
  dice: {
    base: [...translate(dieSegments, 0, 0.02, 0), ...ringXZ(0.66, -0.62, 24)],
    accents: () => [
      { segments: [], opacity: 0 },
      { segments: [], opacity: 0 },
    ],
    dots: (time) => {
      // Hop between pips on a fixed beat; the multiplier scrambles the order.
      const pick = (Math.floor(time * 0.7) * 5 + 3) % DIE_PIPS.length;
      const pipPosition = DIE_PIPS[pick];
      return [
        {
          position: [pipPosition[0], pipPosition[1] + 0.02, pipPosition[2]],
          radius: 2.6,
          live: true,
        },
      ];
    },
  },

  // Bioinformatics: a double helix with a read pulse travelling one strand.
  helix: {
    base: sidewaysSegments([
      ...helixStrand(HELIX.radius, HELIX.y0, HELIX.y1, HELIX.turns, 0, 56),
      ...helixStrand(HELIX.radius, HELIX.y0, HELIX.y1, HELIX.turns, Math.PI, 56),
      ...helixRungs,
    ]),
    accents: (time) => {
      const p = (time * 0.13) % 1;
      return [
        {
          segments: sidewaysSegments(
            helixStrand(
              HELIX.radius,
              HELIX.y0,
              HELIX.y1,
              HELIX.turns,
              0,
              8,
              Math.max(0, p - 0.09),
              p,
            ),
          ),
          opacity: 1,
        },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const p = (time * 0.13) % 1;
      return [
        {
          position: sideways(
            helixPoint(HELIX.radius, HELIX.y0, HELIX.y1, HELIX.turns, 0, p),
          ),
          radius: 2.5,
          live: true,
        },
      ];
    },
  },

  // Sequence alignment: short reads stacking up over a reference strand.
  reads: {
    base: [
      ...READ_REFERENCE,
      ...READ_PILEUP.flatMap(([x, y, width, z]) => readSlab(x, y, width, z)),
    ],
    accents: (time) => {
      const beat = time * 0.4;
      const drop = beat % 1;
      const [x, y, width, z] = READ_LANDINGS[Math.floor(beat) % READ_LANDINGS.length];
      const fall = READ_LANDING_Y - (READ_LANDING_Y - y) * drop;
      return [
        { segments: readSlab(x, fall, width, z), opacity: travelFade(drop) },
        {
          segments: [
            [
              [x, READ_REFERENCE_Y + 0.05, z],
              [x, fall - READ_HEIGHT / 2, z],
            ],
          ],
          opacity: 0.3 * travelFade(drop),
        },
      ];
    },
    dots: (time) => {
      const beat = time * 0.4;
      const drop = beat % 1;
      const [x, y, , z] = READ_LANDINGS[Math.floor(beat) % READ_LANDINGS.length];
      return [
        {
          position: [x, READ_LANDING_Y - (READ_LANDING_Y - y) * drop, z],
          radius: 2.4 * travelFade(drop),
          live: true,
        },
      ];
    },
  },

  // Weather data: rain falling into a gauge.
  raindrop: {
    base: [
      ...ringXZ(0.5, 0.35, 24),
      ...ringXZ(0.5, -0.6, 24),
      ...Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * TAU;
        return [
          [Math.cos(angle) * 0.5, 0.35, Math.sin(angle) * 0.5],
          [Math.cos(angle) * 0.5, -0.6, Math.sin(angle) * 0.5],
        ] as Segment;
      }),
    ],
    accents: (time) => [
      {
        segments: ringXZ(0.44, -0.22 + Math.sin(time * 0.5) * 0.04, 20),
        opacity: 0.85,
      },
      { segments: [], opacity: 0 },
    ],
    dots: (time) => {
      const first = (time * 0.45) % 1;
      const second = (time * 0.45 + 0.5) % 1;
      return [
        { position: [-0.16, 0.62 - second * 0.84, -0.06], radius: 2 * travelFade(second) },
        {
          position: [0.12, 0.62 - first * 0.84, 0.06],
          radius: 2.2 * travelFade(first),
          live: true,
        },
      ];
    },
  },

  // Raster tiles: a grid where one tile at a time lifts for processing.
  raster: {
    base: gridXZ(RASTER_HALF, RASTER_Y, RASTER_DIVISIONS),
    accents: (time) => {
      const beat = time * 0.35;
      const local = beat % 1;
      const cell = RASTER_ORDER[Math.floor(beat) % RASTER_ORDER.length];
      const [cx, cz] = rasterCellCenter(cell);
      const half = RASTER_CELL * 0.42;
      const lifted = RASTER_Y + RASTER_LIFT;
      const tile: Segment[] = [
        ...polyline(
          [
            [cx - half, lifted, cz - half],
            [cx + half, lifted, cz - half],
            [cx + half, lifted, cz + half],
            [cx - half, lifted, cz + half],
          ],
          true,
        ),
        ...(
          [
            [cx - half, cz - half],
            [cx + half, cz - half],
            [cx + half, cz + half],
            [cx - half, cz + half],
          ] as [number, number][]
        ).map(
          ([x, z]) =>
            [
              [x, RASTER_Y, z],
              [x, lifted, z],
            ] as Segment,
        ),
      ];
      return [
        { segments: tile, opacity: travelFade(local) },
        { segments: [], opacity: 0 },
      ];
    },
    dots: (time) => {
      const beat = time * 0.35;
      const local = beat % 1;
      const cell = RASTER_ORDER[Math.floor(beat) % RASTER_ORDER.length];
      const [cx, cz] = rasterCellCenter(cell);
      return [
        {
          position: [cx, RASTER_Y + RASTER_LIFT + 0.04, cz],
          radius: 2.4 * travelFade(local),
          live: true,
        },
      ];
    },
  },
};

function rotate(point: Vec3, yaw: number, pitch: number): Vec3 {
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const x = point[0] * cosYaw + point[2] * sinYaw;
  const zYaw = point[2] * cosYaw - point[0] * sinYaw;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  return [
    x,
    point[1] * cosPitch - zYaw * sinPitch,
    point[1] * sinPitch + zYaw * cosPitch,
  ];
}

/** Perspective projection. Returns viewBox coordinates plus the depth scale. */
function project(point: Vec3): [number, number, number] {
  const scale = FOCAL / (CAMERA_Z + point[2]);
  return [CENTER_X + point[0] * scale * SCALE, CENTER_Y - point[1] * scale * SCALE, scale];
}

function segmentPath(segments: Segment[], yaw: number, pitch: number): string {
  let path = "";
  for (const [from, to] of segments) {
    const a = project(rotate(from, yaw, pitch));
    const b = project(rotate(to, yaw, pitch));
    path += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return path;
}

/** Cheap string hash so cards sharing an icon do not animate in lockstep. */
function phaseFromSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 997) / 997 * 20;
}

export function ExampleIcon3D({
  icon,
  reducedMotion,
  seed = "",
}: {
  icon: Mark3DKind;
  reducedMotion: boolean;
  seed?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const farRef = useRef<SVGPathElement>(null);
  const midRef = useRef<SVGPathElement>(null);
  const nearRef = useRef<SVGPathElement>(null);
  const accentARef = useRef<SVGPathElement>(null);
  const accentBRef = useRef<SVGPathElement>(null);
  const dotARef = useRef<SVGCircleElement>(null);
  const dotBRef = useRef<SVGCircleElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const spec = ICONS[icon];
    const dotRefs = [dotARef, dotBRef];
    const accentRefs = [accentARef, accentBRef];
    const phase = phaseFromSeed(seed);

    const draw = (time: number, yaw: number, pitch: number) => {
      let far = "";
      let mid = "";
      let near = "";

      for (const [from, to] of spec.base) {
        const a = rotate(from, yaw, pitch);
        const b = rotate(to, yaw, pitch);
        const pa = project(a);
        const pb = project(b);
        const command = `M${pa[0].toFixed(1)} ${pa[1].toFixed(1)}L${pb[0].toFixed(1)} ${pb[1].toFixed(1)}`;
        const depth = (a[2] + b[2]) / 2;
        if (depth < FAR_BAND) far += command;
        else if (depth > NEAR_BAND) near += command;
        else mid += command;
      }

      farRef.current?.setAttribute("d", far);
      midRef.current?.setAttribute("d", mid);
      nearRef.current?.setAttribute("d", near);

      spec.accents(time).forEach((accent, index) => {
        const path = accentRefs[index].current;
        if (!path) return;
        path.setAttribute("d", segmentPath(accent.segments, yaw, pitch));
        path.setAttribute("opacity", accent.opacity.toFixed(2));
      });

      const dots = spec.dots(time);
      dotRefs.forEach((ref, index) => {
        const circle = ref.current;
        if (!circle) return;
        const dot = dots[index];
        if (!dot) {
          circle.setAttribute("r", "0");
          return;
        }
        const [x, y, scale] = project(rotate(dot.position, yaw, pitch));
        circle.setAttribute("cx", x.toFixed(1));
        circle.setAttribute("cy", y.toFixed(1));
        circle.setAttribute("r", (dot.radius * scale * 1.4).toFixed(2));
        circle.setAttribute(
          "class",
          dot.live ? "example-mark-node-live" : "example-mark-node",
        );
      });
    };

    if (reducedMotion) {
      draw(STATIC_POSE_TIME + phase, BASE_YAW, BASE_PITCH);
      return;
    }

    // Paint one frame immediately: the loop only starts once the card enters
    // the viewport, and an unpainted mark must never be visible (offscreen
    // rendering, scroll jumps that skip the intersection callback).
    draw(STATIC_POSE_TIME + phase, BASE_YAW, BASE_PITCH);

    const rotation = { yaw: BASE_YAW, pitch: BASE_PITCH };
    let frame = 0;
    let lastFrameAt = 0;
    let startedAt = 0;

    const loop = (now: number) => {
      if (!startedAt) startedAt = now;
      const delta = lastFrameAt ? Math.min((now - lastFrameAt) / 1000, 0.05) : 0.016;
      lastFrameAt = now;

      // Pointer response stays on the real clock so the tilt still feels direct.
      const pose = ((now - startedAt) / 1000) * MOTION_RATE + phase;
      const ease = 1 - Math.exp(-delta * 6);
      const targetYaw = Math.sin(pose * 0.4) * 0.26 + pointerRef.current.x * 0.5;
      const targetPitch =
        BASE_PITCH + Math.sin(pose * 0.29) * 0.06 - pointerRef.current.y * 0.3;
      rotation.yaw += (targetYaw - rotation.yaw) * ease;
      rotation.pitch += (targetPitch - rotation.pitch) * ease;

      draw(pose, rotation.yaw, rotation.pitch);
      frame = requestAnimationFrame(loop);
    };

    // Cards below the fold (and the collapsed rows) should not burn frames.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !frame) {
        lastFrameAt = 0;
        frame = requestAnimationFrame(loop);
      } else if (!entry.isIntersecting && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(container);

    // The whole card drives the tilt, not just the mark's own box.
    const surface: HTMLElement = container.closest("a") ?? container;
    const handlePointerMove = (event: PointerEvent) => {
      const bounds = surface.getBoundingClientRect();
      pointerRef.current = {
        x: (event.clientX - bounds.left) / bounds.width - 0.5,
        y: (event.clientY - bounds.top) / bounds.height - 0.5,
      };
    };
    const handlePointerLeave = () => {
      pointerRef.current = { x: 0, y: 0 };
    };
    surface.addEventListener("pointermove", handlePointerMove);
    surface.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      surface.removeEventListener("pointermove", handlePointerMove);
      surface.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [icon, reducedMotion, seed]);

  return (
    <div ref={containerRef} aria-hidden="true" className="example-mark">
      <span className="example-mark-glow" />
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="presentation">
        <g fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke">
          <path ref={farRef} className="example-mark-line" strokeWidth={0.9} opacity={0.26} />
          <path ref={midRef} className="example-mark-line" strokeWidth={1.1} opacity={0.55} />
          <path ref={nearRef} className="example-mark-line" strokeWidth={1.3} opacity={0.95} />
          <path ref={accentARef} className="example-mark-accent" strokeWidth={1.4} />
          <path ref={accentBRef} className="example-mark-live" strokeWidth={1.5} />
        </g>
        <circle ref={dotARef} r={0} className="example-mark-node" />
        <circle ref={dotBRef} r={0} className="example-mark-node" />
      </svg>
    </div>
  );
}
