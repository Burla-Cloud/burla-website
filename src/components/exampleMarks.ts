import type { Mark3DKind } from "./ExampleIcon3D";

/**
 * Wireframe mark per example, keyed by docs href. Keyed on href rather than on
 * the `icon` field in content.ts because the marks are curated to not repeat
 * within a single view, which the content-level icon names do not guarantee.
 */
export const EXAMPLE_MARKS: Record<string, Mark3DKind> = {
  "/docs/featured-examples/process-2.4tb-of-parquet-files-in-76s": "parquet",
  "/docs/featured-examples/airbnb-burla": "star",
  "/docs/featured-examples/multi-stage-genomic-pipeline": "helix",
  "/docs/all-examples/data-processing-examples/nyc-ghost-neighborhoods": "city",
  "/docs/all-examples/ml-embeddings-and-search/gpu-embedding-demo": "embed",
  "/docs/all-examples/scientific-and-geospatial-work/ghcn-rainiest-day": "raindrop",
  "/docs/all-examples/data-processing-examples/world-photo-index": "pin",
  "/docs/featured-examples/arxiv-fossils": "spiral",
  "/docs/all-examples/ml-embeddings-and-search/parallel-hyperparameter-tuning": "peak",
  "/docs/all-examples/scientific-and-geospatial-work/gdal-raster-processing": "raster",
  "/docs/all-examples/production-data-jobs/monte-carlo-simulation": "dice",
  "/docs/featured-examples/amazon-review-distiller": "merge",
};

export function markFor(href: string): Mark3DKind {
  return EXAMPLE_MARKS[href] ?? "cloud";
}
