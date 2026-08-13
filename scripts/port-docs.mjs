// One-time (re-runnable) port of the GitBook docs repo (../user-docs) into
// this site. Copies the pages listed in REGISTRY into src/docs/content/,
// rewriting asset references and internal links, and converts referenced
// assets into public/docs-assets/ (large PNGs -> webp, large GIFs -> mp4).
//
// Usage: node scripts/port-docs.mjs [path-to-user-docs]

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_ROOT = path.resolve(process.argv[2] ?? path.join(SITE_ROOT, "../user-docs"));
const CONTENT_OUT = path.join(SITE_ROOT, "src/docs/content");
const ASSETS_OUT = path.join(SITE_ROOT, "public/docs-assets");

// source file (relative to user-docs root) -> route under /docs
const REGISTRY = {
  "get-started.md": "/docs/get-started",
  "API-Reference.md": "/docs/api-reference",
  "CLI-Reference.md": "/docs/cli-reference",
  "blog/dynamic-hardware.md": "/docs/blog/dynamic-hardware",

  "examples/process-2.4tb-of-parquet-files-in-76s.md":
    "/docs/featured-examples/process-2.4tb-of-parquet-files-in-76s",
  "demo-blogs/airbnb-burla.md": "/docs/featured-examples/airbnb-burla",
  "demo-blogs/amazon-review-distiller.md": "/docs/featured-examples/amazon-review-distiller",
  "demo-blogs/arxiv-fossils.md": "/docs/featured-examples/arxiv-fossils",
  "examples/multi-stage-genomic-pipeline.md":
    "/docs/featured-examples/multi-stage-genomic-pipeline",

  "demo-categories/basic-examples.md": "/docs/all-examples/basic-examples",
  "how-to-guides/read-and-write-gcs-files.md":
    "/docs/all-examples/basic-examples/read-and-write-gcs-files",
  "how-to-guides/run-python-in-the-background.md":
    "/docs/all-examples/basic-examples/run-python-in-the-background",
  "how-to-guides/limit-parallelism-for-apis-databases-and-websites.md":
    "/docs/all-examples/basic-examples/limit-parallelism-for-apis-databases-and-websites",
  "demo-blogs/process-thousands-of-files-quickly.md":
    "/docs/all-examples/basic-examples/process-thousands-of-files-quickly",
  "demo-blogs/process-one-giant-file-quickly.md":
    "/docs/all-examples/basic-examples/process-one-giant-file-quickly",
  "demo-blogs/process-data-in-your-database-quickly.md":
    "/docs/all-examples/basic-examples/process-data-in-your-database-quickly",

  "demo-categories/ml-embeddings-and-search.md": "/docs/all-examples/ml-embeddings-and-search",
  "demo-blogs/gpu-embedding-demo.md":
    "/docs/all-examples/ml-embeddings-and-search/gpu-embedding-demo",
  "examples/parallel-hyperparameter-tuning.md":
    "/docs/all-examples/ml-embeddings-and-search/parallel-hyperparameter-tuning",
  "demo-blogs/ml-inference-batch.md":
    "/docs/all-examples/ml-embeddings-and-search/ml-inference-batch",
  "demo-blogs/met-weirdest-art.md": "/docs/all-examples/ml-embeddings-and-search/met-weirdest-art",

  "demo-categories/data-processing-examples.md": "/docs/all-examples/data-processing-examples",
  "demo-blogs/nyc-ghost-neighborhoods.md":
    "/docs/all-examples/data-processing-examples/nyc-ghost-neighborhoods",
  "demo-blogs/world-photo-index.md":
    "/docs/all-examples/data-processing-examples/world-photo-index",
  "demo-blogs/github-repo-summarizer.md":
    "/docs/all-examples/data-processing-examples/github-repo-summarizer",
  "demo-blogs/parquet-parallel.md":
    "/docs/all-examples/data-processing-examples/parquet-parallel",
  "demo-blogs/pandas-apply-parallel.md":
    "/docs/all-examples/data-processing-examples/pandas-apply-parallel",

  "demo-categories/production-data-jobs.md": "/docs/all-examples/production-data-jobs",
  "demo-blogs/python-etl-no-airflow.md":
    "/docs/all-examples/production-data-jobs/python-etl-no-airflow",
  "demo-blogs/image-dataset-resize.md":
    "/docs/all-examples/production-data-jobs/image-dataset-resize",
  "demo-blogs/rate-limited-api-requests.md":
    "/docs/all-examples/production-data-jobs/rate-limited-api-requests",
  "demo-blogs/parallel-web-scraping.md":
    "/docs/all-examples/production-data-jobs/parallel-web-scraping",
  "demo-blogs/monte-carlo-simulation.md":
    "/docs/all-examples/production-data-jobs/monte-carlo-simulation",

  "demo-categories/scientific-and-geospatial-work.md":
    "/docs/all-examples/scientific-and-geospatial-work",
  "demo-blogs/bioinformatics-alignment.md":
    "/docs/all-examples/scientific-and-geospatial-work/bioinformatics-alignment",
  "demo-blogs/ghcn-rainiest-day.md":
    "/docs/all-examples/scientific-and-geospatial-work/ghcn-rainiest-day",
  "demo-blogs/gdal-raster-processing.md":
    "/docs/all-examples/scientific-and-geospatial-work/gdal-raster-processing",
};

// These routes are maintained directly in this repository. Keep their source
// entries in REGISTRY so imported pages still rewrite links to the right route.
const SITE_OWNED_ROUTES = new Set([
  "/docs/featured-examples/airbnb-burla",
  "/docs/featured-examples/amazon-review-distiller",
  "/docs/featured-examples/arxiv-fossils",
  "/docs/all-examples/ml-embeddings-and-search/gpu-embedding-demo",
  "/docs/all-examples/ml-embeddings-and-search/ml-inference-batch",
  "/docs/all-examples/ml-embeddings-and-search/met-weirdest-art",
  "/docs/all-examples/data-processing-examples/nyc-ghost-neighborhoods",
  "/docs/all-examples/data-processing-examples/world-photo-index",
  "/docs/all-examples/data-processing-examples/github-repo-summarizer",
  "/docs/all-examples/data-processing-examples/parquet-parallel",
  "/docs/all-examples/data-processing-examples/pandas-apply-parallel",
  "/docs/all-examples/production-data-jobs/python-etl-no-airflow",
  "/docs/all-examples/production-data-jobs/image-dataset-resize",
  "/docs/all-examples/production-data-jobs/rate-limited-api-requests",
  "/docs/all-examples/production-data-jobs/parallel-web-scraping",
  "/docs/all-examples/production-data-jobs/monte-carlo-simulation",
  "/docs/all-examples/scientific-and-geospatial-work/bioinformatics-alignment",
  "/docs/all-examples/scientific-and-geospatial-work/ghcn-rainiest-day",
  "/docs/all-examples/scientific-and-geospatial-work/gdal-raster-processing",
]);

const SITE_OWNED_CARD_SLUGS = new Set(
  [...SITE_OWNED_ROUTES].map((route) => route.split("/").at(-1)),
);

const WEBP_THRESHOLD = 300 * 1024; // png larger than this -> webp
const MP4_THRESHOLD = 1024 * 1024; // gif larger than this -> mp4

// ---------------------------------------------------------------------------

/** "CleanShot 2025-11-25 at 12.59.38.png" -> "cleanshot-2025-11-25-at-12-59-38" */
function slugifyBase(base) {
  return base
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// assets: source path (relative to user-docs root) -> output info
const assetPlan = new Map();

function planAsset(srcRel) {
  const clean = decodeURIComponent(srcRel).replace(/^\/+/, "");
  // The React examples index renders generated marks, not GitBook card art.
  const card = path.basename(clean).match(/^(.*)-card\.[^.]+$/);
  if (card && SITE_OWNED_CARD_SLUGS.has(card[1])) return null;
  if (assetPlan.has(clean)) return assetPlan.get(clean).publicPath;
  const abs = path.join(DOCS_ROOT, clean);
  if (!fs.existsSync(abs)) {
    console.warn(`  !! missing asset: ${clean}`);
    return null;
  }
  const size = fs.statSync(abs).size;
  const subdir = path.dirname(clean).replace(/^\.gitbook\/assets\/?/, ""); // "" | "how-to-guides" | ...
  const ext = path.extname(clean).toLowerCase();
  const base = slugifyBase(path.basename(clean, path.extname(clean)));

  let outExt = ext;
  let mode = "copy";
  if (ext === ".png" && size > WEBP_THRESHOLD) {
    outExt = ".webp";
    mode = "webp";
  } else if (ext === ".gif" && size > MP4_THRESHOLD) {
    outExt = ".mp4";
    mode = "mp4";
  }
  const outRel = path.join(subdir, `${base}${outExt}`);
  const info = { abs, outRel, mode, publicPath: `/docs-assets/${outRel.split(path.sep).join("/")}` };
  assetPlan.set(clean, info);
  return info.publicPath;
}

/** Resolve a reference found in `fileRel` against the docs root. */
function resolveRef(fileRel, ref) {
  const [target, hash = ""] = ref.split("#");
  const resolved = path
    .normalize(path.join(path.dirname(fileRel), decodeURIComponent(target)))
    .split(path.sep)
    .join("/");
  return { resolved, hash: hash ? `#${hash}` : "" };
}

function rewriteRef(fileRel, ref) {
  if (/^(https?:|mailto:|#)/.test(ref)) return ref;
  const { resolved, hash } = resolveRef(fileRel, ref);
  if (resolved.includes(".gitbook/assets/")) {
    const publicPath = planAsset(resolved);
    return publicPath ?? ref;
  }
  if (resolved.endsWith(".md")) {
    const route = REGISTRY[resolved];
    if (route) return `${route}${hash}`;
    console.warn(`  !! link to un-ported page in ${fileRel}: ${resolved}`);
    return `https://github.com/Burla-Cloud/${resolved}`; // should not happen
  }
  return ref;
}

function transformMarkdown(fileRel, raw) {
  let out = raw;

  // Frontmatter: keep only cover/coverY/description, rewriting the cover path.
  const fmMatch = out.match(/^---\n([\s\S]*?)\n---\n/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const kept = [];
    const cover = fm.match(/^cover:\s*(.+)$/m);
    const coverY = fm.match(/^coverY:\s*(.+)$/m);
    const description = fm.match(/^description:\s*(.+)$/m);
    if (cover) kept.push(`cover: ${rewriteRef(fileRel, cover[1].trim())}`);
    if (coverY) kept.push(`coverY: ${coverY[1].trim()}`);
    if (description) kept.push(`description: ${description[1].trim()}`);
    out = kept.length
      ? out.replace(fmMatch[0], `---\n${kept.join("\n")}\n---\n`)
      : out.replace(fmMatch[0], "");
  }

  // HTML src/href attributes.
  out = out.replace(/(src|href)="([^"]+)"/g, (m, attr, ref) => {
    return `${attr}="${rewriteRef(fileRel, ref)}"`;
  });

  // Markdown links/images: ](...)
  out = out.replace(/\]\(([^)\s]+)\)/g, (m, ref) => `](${rewriteRef(fileRel, ref)})`);

  // GIFs that became mp4s: swap the <img> for a <video>.
  out = out.replace(
    /<img src="([^"]+\.mp4)"[^>]*>/g,
    '<video src="$1" autoplay loop muted playsinline></video>',
  );

  // Do not carry the old GitBook contact CTA into the docs pages. The Burla
  // site footer is the consistent place for contact links.
  out = out.replace(
    /\n{0,3}\*{3}\n+\s*Questions\?\\\n+\[Schedule a call with us\]\([^)]+\), or email \*\*jake@burla\.dev\*\*\. We're always happy to talk\.\s*$/m,
    "\n",
  );

  return out;
}

// ---------------------------------------------------------------------------

const siteOwnedContent = new Map(
  [...SITE_OWNED_ROUTES].map((route) => {
    const destRel = `${route.replace(/^\/docs\//, "")}.md`;
    const destAbs = path.join(CONTENT_OUT, destRel);
    return [route, fs.readFileSync(destAbs, "utf8")];
  }),
);

fs.rmSync(CONTENT_OUT, { recursive: true, force: true });
fs.rmSync(ASSETS_OUT, { recursive: true, force: true });

for (const [srcRel, route] of Object.entries(REGISTRY)) {
  const srcAbs = path.join(DOCS_ROOT, srcRel);
  const transformed =
    siteOwnedContent.get(route) ?? transformMarkdown(srcRel, fs.readFileSync(srcAbs, "utf8"));
  const destRel = `${route.replace(/^\/docs\//, "")}.md`;
  const destAbs = path.join(CONTENT_OUT, destRel);
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.writeFileSync(destAbs, transformed);
  const source = siteOwnedContent.has(route) ? "site" : srcRel;
  console.log(`page  ${source} -> src/docs/content/${destRel}`);
}

let converted = 0;
let copied = 0;
for (const [srcRel, info] of assetPlan) {
  const outAbs = path.join(ASSETS_OUT, info.outRel);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  if (info.mode === "copy") {
    fs.copyFileSync(info.abs, outAbs);
    copied++;
  } else if (info.mode === "webp") {
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error", "-i", info.abs,
      "-vf", "scale='min(1600,iw)':-1",
      "-c:v", "libwebp", "-quality", "82",
      outAbs,
    ]);
    converted++;
  } else if (info.mode === "mp4") {
    execFileSync("ffmpeg", [
      "-y", "-loglevel", "error", "-i", info.abs,
      "-movflags", "faststart", "-pix_fmt", "yuv420p",
      "-vf", "scale='min(1280,iw)':-2:flags=lanczos,crop=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v", "libx264", "-crf", "26", "-an",
      outAbs,
    ]);
    converted++;
  }
  console.log(`asset ${info.mode.padEnd(5)} ${srcRel} -> public/docs-assets/${info.outRel}`);
}

console.log(`\n${Object.keys(REGISTRY).length} pages, ${copied} assets copied, ${converted} converted.`);
