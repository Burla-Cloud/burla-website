// Writes one real HTML file per route after `vite build`.
//
// The app is a client-rendered SPA, so without this every URL on the site
// served the same index.html: same <title>, same description, no canonical.
// Google saw a few hundred byte-identical pages and dropped them as
// "Duplicate without user-selected canonical". Each prerendered file carries
// its own title, description, and <link rel="canonical">, which is what makes
// the URLs distinct to a crawler. The body is still hydrated by the SPA.
//
// Every route is emitted twice, as `<route>.html` and `<route>/index.html`, so
// nginx serves it directly whether its try_files tries `$uri.html` or `$uri/`.

import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const CONTENT = path.join(ROOT, "src", "docs", "content");
const ORIGIN = process.env.SITE_ORIGIN ?? "https://burla.dev";

// ---------------------------------------------------------------------------
// Route metadata
// ---------------------------------------------------------------------------

/** Runs registry.ts/examples.ts in node so routes have a single source of truth. */
async function loadRegistry() {
  const bundle = await esbuild.build({
    stdin: {
      contents: `
        export { DOCS_PAGES } from "./src/docs/registry.ts";
        export { ALL_EXAMPLE_CATEGORIES } from "./src/docs/examples.ts";
      `,
      resolveDir: ROOT,
      sourcefile: "prerender-entry.ts",
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
  });
  const code = bundle.outputFiles[0].text;
  const url = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  return import(url);
}

/** "/docs/get-started" -> src/docs/content/get-started.md */
function markdownFor(route) {
  const file = path.join(CONTENT, `${route.slice("/docs".length)}.md`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
}

function frontmatterDescription(raw) {
  const fm = raw?.match(/^---\n([\s\S]*?)\n---\n/)?.[1];
  return fm?.match(/^description:\s*(.+)$/m)?.[1]?.trim();
}

const SITE_DESCRIPTION =
  "Burla is the world's simplest cluster-compute software. Easily scale ML-pipelines, AI inference, batch processing, and more.";

async function routes() {
  const { DOCS_PAGES, ALL_EXAMPLE_CATEGORIES } = await loadRegistry();

  const exampleDescriptions = new Map(
    ALL_EXAMPLE_CATEGORIES.flatMap((category) =>
      category.examples.map((example) => [example.route, example.description]),
    ),
  );

  const blog = fs.readFileSync(path.join(ROOT, "src", "blog", "dynamic-hardware.md"), "utf8");

  const pages = [
    {
      route: "/",
      title: "Burla · The simplest way to scale Python",
      description: SITE_DESCRIPTION,
    },
    {
      route: "/blog",
      title: "You should not need to estimate CPU or RAM · Burla",
      description: frontmatterDescription(blog) ?? SITE_DESCRIPTION,
    },
    {
      route: "/docs",
      title: "Documentation · Burla",
      description:
        "Burla documentation: getting started, worked examples, and the API and CLI reference.",
    },
  ];

  for (const page of DOCS_PAGES) {
    // The examples cover page is generated from examples.ts, not markdown.
    if (page.route === "/docs/examples") {
      pages.push({
        route: page.route,
        title: `${page.nav} · Burla`,
        description:
          "Complete Burla workloads, organized by the kind of problem they solve.",
      });
      continue;
    }
    const raw = markdownFor(page.route);
    if (raw === undefined) {
      console.warn(`prerender: no markdown for ${page.route}, skipping`);
      continue;
    }
    pages.push({
      route: page.route,
      title: `${page.nav} · Burla`,
      description:
        frontmatterDescription(raw) ??
        exampleDescriptions.get(page.route) ??
        SITE_DESCRIPTION,
    });
  }

  // Old URLs the router bounces elsewhere. They get a page so crawlers do not
  // fall through to the SPA shell, but they point at their replacement and
  // stay out of the index and the sitemap.
  const redirects = [
    ...ALL_EXAMPLE_CATEGORIES.map((category) => ({
      route: category.legacyRoute,
      canonical: category.examples[0].route,
    })),
    { route: "/docs/basics", canonical: "/docs/examples" },
    { route: "/docs/blog/dynamic-hardware", canonical: "/blog" },
  ].map((entry) => ({
    ...entry,
    title: "Burla",
    description: SITE_DESCRIPTION,
    noindex: true,
  }));

  return [...pages, ...redirects];
}

// ---------------------------------------------------------------------------
// HTML rewriting
// ---------------------------------------------------------------------------

const escapeAttr = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function render(template, { title, description, canonical, noindex }) {
  const t = escapeAttr(title);
  const d = escapeAttr(description);
  const html = template
    .replace(/\s*<link rel="canonical"[^>]*>/g, "")
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${d}" />`,
    )
    .replace(
      /<meta\s+property="og:title"[\s\S]*?\/>/,
      `<meta property="og:title" content="${t}" />`,
    )
    .replace(
      /<meta\s+property="og:description"[\s\S]*?\/>/,
      `<meta property="og:description" content="${d}" />`,
    )
    .replace(
      /<meta\s+property="og:url"[\s\S]*?\/>/,
      `<meta property="og:url" content="${canonical}" />`,
    )
    .replace(
      /<meta\s+name="twitter:title"[\s\S]*?\/>/,
      `<meta name="twitter:title" content="${t}" />`,
    )
    .replace(
      /<meta\s+name="twitter:description"[\s\S]*?\/>/,
      `<meta name="twitter:description" content="${d}" />`,
    );

  const head = noindex
    ? `<meta name="robots" content="noindex" />\n    <link rel="canonical" href="${canonical}" />`
    : `<link rel="canonical" href="${canonical}" />`;
  return html.replace("</head>", `  ${head}\n  </head>`);
}

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

// ---------------------------------------------------------------------------

export async function prerender() {
  const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
  const pages = await routes();
  const indexable = [];

  for (const page of pages) {
    const canonical = page.canonical ?? page.route;
    const url = `${ORIGIN}${canonical === "/" ? "/" : canonical}`;
    const html = render(template, { ...page, canonical: url });

    if (page.route === "/") {
      write(path.join(DIST, "index.html"), html);
    } else {
      const rel = page.route.replace(/^\//, "");
      write(path.join(DIST, `${rel}.html`), html);
      write(path.join(DIST, rel, "index.html"), html);
    }
    if (!page.noindex) indexable.push(url);
  }

  // Unknown URLs must not render as another copy of the homepage.
  write(
    path.join(DIST, "404.html"),
    render(template, {
      title: "Page not found · Burla",
      description: SITE_DESCRIPTION,
      canonical: `${ORIGIN}/`,
      noindex: true,
    }).replace(/\s*<link rel="canonical"[^>]*>/, ""),
  );

  write(
    path.join(DIST, "robots.txt"),
    ["User-agent: *", "Allow: /", "", `Sitemap: ${ORIGIN}/sitemap.xml`, ""].join("\n"),
  );

  write(
    path.join(DIST, "sitemap.xml"),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...indexable.map((url) => `  <url><loc>${escapeAttr(url)}</loc></url>`),
      `  <url><loc>${ORIGIN}/privacy/</loc></url>`,
      `  <url><loc>${ORIGIN}/terms/</loc></url>`,
      "</urlset>",
      "",
    ].join("\n"),
  );

  console.log(`prerender: ${pages.length} routes, ${indexable.length} in sitemap`);
}

if (import.meta.filename === process.argv[1]) await prerender();
