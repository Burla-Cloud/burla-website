import type { ReactNode } from "react";

// One abstract mark per example card, shared by the landing page workloads
// grid and the docs overview. All marks share a single 24x24 box,
// currentColor stroke, one stroke width, and round caps/joins, so any grid of
// them reads as one designed line set (the card sets the color via text).
const ICONS: Record<string, ReactNode> = {
  // Stacked parquet planks, seams offset row to row like columnar file layers.
  parquet: (
    <>
      <rect x="4" y="4.5" width="16" height="4.4" rx="1.2" />
      <rect x="4" y="9.8" width="16" height="4.4" rx="1.2" />
      <rect x="4" y="15.1" width="16" height="4.4" rx="1.2" />
      <path d="M13.5 4.5v4.4M9 9.8v4.4M15 15.1v4.4" />
    </>
  ),
  // A house: roof, walls, door.
  house: (
    <>
      <path d="M4.4 11.3 12 4.4l7.6 6.9" />
      <path d="M6.5 10.6V19.5h11v-8.9" />
      <path d="M10.3 19.5v-4.7h3.4v4.7" />
    </>
  ),
  // DNA double helix: two crossing strands joined by base-pair rungs.
  helix: (
    <>
      <path d="M9 4c0 4 6 4 6 8s-6 4-6 8" />
      <path d="M15 4c0 4-6 4-6 8s6 4 6 8" />
      <path d="M10.2 7.2h3.6M10 12h4M10.2 16.8h3.6" />
    </>
  ),
  // A trip: origin dot, winding street route, destination dot.
  route: (
    <>
      <circle cx="5.4" cy="18.4" r="1.9" />
      <circle cx="18.6" cy="5.6" r="1.9" />
      <path d="M7 17.2c3.8-1.2 1.5-5.6 5-6.9 2.8-1 3.6-1.8 5.2-3.3" />
    </>
  ),
  // A GPU: chip package with pin legs and one die inside.
  gpu: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3" />
      <rect x="10.4" y="10.4" width="3.2" height="3.2" rx="0.8" />
    </>
  ),
  // A raindrop with a catch-light arc.
  raindrop: (
    <>
      <path d="M12 3.6c3.9 4.8 5.9 7.7 5.9 10.5a5.9 5.9 0 0 1-11.8 0c0-2.8 2-5.7 5.9-10.5Z" />
      <path d="M9.3 14.4a2.8 2.8 0 0 0 1.9 2.5" />
    </>
  ),
  // A map pin with a photo-lens dot.
  pin: (
    <>
      <path d="M12 20.6S5.6 15.2 5.6 10.4a6.4 6.4 0 0 1 12.8 0c0 4.8-6.4 10.2-6.4 10.2Z" />
      <circle cx="12" cy="10.3" r="2.4" />
    </>
  ),
  // An ammonite spiral: alternating semicircles with growing radius.
  spiral: (
    <path d="M12.6 12a1.2 1.2 0 0 0-2.4 0 2.1 2.1 0 0 0 4.2 0 3 3 0 0 0-6 0 3.9 3.9 0 0 0 7.8 0 4.8 4.8 0 0 0-9.6 0 5.4 5.4 0 0 0 10.8 0" />
  ),
  // Three tuning sliders, knobs at different positions.
  sliders: (
    <>
      <path d="M6.4 4v7M6.4 15.4V20" />
      <circle cx="6.4" cy="13.2" r="2.2" />
      <path d="M12 4v2.4M12 10.8V20" />
      <circle cx="12" cy="8.6" r="2.2" />
      <path d="M17.6 4v9.4M17.6 17.8V20" />
      <circle cx="17.6" cy="15.6" r="2.2" />
    </>
  ),
  // A satellite raster tile: one square cut into a grid of cells.
  raster: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16" />
    </>
  ),
  // A die showing three pips on the diagonal.
  dice: (
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
      <circle cx="8.7" cy="8.7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.3" cy="15.3" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  // A review star.
  star: (
    <path d="M12 3.8l2.42 4.9 5.42.79-3.92 3.82.93 5.4L12 16.15l-4.85 2.56.93-5.4-3.92-3.82 5.42-.79Z" />
  ),
  // Shared cloud storage with an upload/download path.
  cloud: (
    <>
      <path d="M7.2 18.2h10.1a3.7 3.7 0 0 0 .5-7.4A5.8 5.8 0 0 0 6.7 9.4a4.4 4.4 0 0 0 .5 8.8Z" />
      <path d="M12 10.5v5.2M9.9 13.5 12 15.7l2.1-2.2" />
    </>
  ),
  // A clock for detached and background jobs.
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.2v5.2l3.4 2" />
    </>
  ),
  // Several worker outputs converging into one result.
  merge: (
    <>
      <path d="M5 5.5h4v4H5zM5 14.5h4v4H5zM15 10h4v4h-4z" />
      <path d="M9 7.5h2.2a2.8 2.8 0 0 1 2.8 2.8v1.7M9 16.5h2.2a2.8 2.8 0 0 0 2.8-2.8V12" />
    </>
  ),
  // A database cylinder with two record seams.
  database: (
    <>
      <ellipse cx="12" cy="6.2" rx="7" ry="3.2" />
      <path d="M5 6.2v5.8c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2V6.2M5 12v5.8c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2V12" />
    </>
  ),
  // A landscape image tile.
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="9.5" r="1.5" />
      <path d="m6 17 4.2-4.1 2.7 2.6 2.1-2 3 3.1" />
    </>
  ),
  // Source-code brackets around a repository dot.
  code: (
    <>
      <path d="m9 7-5 5 5 5M15 7l5 5-5 5M13.4 5l-2.8 14" />
    </>
  ),
};

export function ExampleIcon({ icon }: { icon: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[icon]}
    </svg>
  );
}
