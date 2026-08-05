import {
  ALL_EXAMPLE_CATEGORIES,
} from "./examples";
import type { ExampleCard } from "./examples";

export type DocPage = {
  route: string;
  /** Sidebar / document-title label. The page h1 lives in the markdown. */
  nav: string;
};

export type DocItem = {
  label: string;
  /** Route, optionally with a #hash into that page. */
  to: string;
};

export type DocGroup = {
  /** Group heading. When it has a route, the heading itself is a page. */
  label: string;
  route?: string;
  items: DocItem[];
};

export type DocTab = {
  label: string;
  /** Where the navbar tab points. */
  to: string;
  /** Route prefixes that make this tab active. */
  match: string[];
  groups: DocGroup[];
};

const CORE_PAGES: DocPage[] = [
  { route: "/docs/get-started", nav: "Getting Started" },
  { route: "/docs/api-reference", nav: "API Reference" },
  { route: "/docs/cli-reference", nav: "CLI Reference" },
  { route: "/docs/examples", nav: "Examples" },
];

// Featured examples stay routable (the landing page links to them) but are
// not listed in the sidebar.
const FEATURED_PAGES: DocPage[] = [
  {
    route: "/docs/featured-examples/process-2.4tb-of-parquet-files-in-76s",
    nav: "Query 2.4TBs of Parquet files in 76s",
  },
  {
    route: "/docs/featured-examples/airbnb-burla",
    nav: "Ranking 1.7M Airbnbs by TV location",
  },
  {
    route: "/docs/featured-examples/amazon-review-distiller",
    nav: "Ranking 572M Amazon reviews",
  },
  {
    route: "/docs/featured-examples/arxiv-fossils",
    nav: "Clustering 2.7M arXiv abstracts",
  },
  {
    route: "/docs/featured-examples/multi-stage-genomic-pipeline",
    nav: "Genomic alignment pipeline (Illumina)",
  },
];

const BLOG_PAGES: DocPage[] = [
  {
    route: "/docs/blog/dynamic-hardware",
    nav: "You should never have to guess how much CPU or RAM you need",
  },
];

const toItems = (examples: ExampleCard[]): DocItem[] =>
  examples.map((example) => ({ label: example.title, to: example.route }));

const toDocPages = (examples: ExampleCard[]): DocPage[] =>
  examples.map((example) => ({ route: example.route, nav: example.title }));

export const DOCS_TABS: DocTab[] = [
  {
    label: "Getting Started",
    to: "/docs/get-started",
    match: ["/docs/get-started"],
    groups: [
      {
        label: "Getting Started",
        route: "/docs/get-started",
        items: [
          {
            label: "Set up gcloud",
            to: "/docs/get-started#1-ensure-gcloud-is-setup-and-installed",
          },
          {
            label: "burla install",
            to: "/docs/get-started#2-run-the-burla-install-command",
          },
          {
            label: "Run some code",
            to: "/docs/get-started#3-start-a-machine-and-run-some-code",
          },
        ],
      },
    ],
  },
  {
    label: "API Reference",
    to: "/docs/api-reference",
    match: ["/docs/api-reference"],
    groups: [
      {
        label: "API Reference",
        route: "/docs/api-reference",
        items: [
          {
            label: "remote_parallel_map",
            to: "/docs/api-reference#burlaremote_parallel_map",
          },
        ],
      },
    ],
  },
  {
    label: "CLI Reference",
    to: "/docs/cli-reference",
    match: ["/docs/cli-reference"],
    groups: [
      {
        label: "CLI Reference",
        route: "/docs/cli-reference",
        items: [
          { label: "burla install", to: "/docs/cli-reference#burla-install" },
          { label: "burla login", to: "/docs/cli-reference#burla-login" },
        ],
      },
    ],
  },
  {
    label: "Examples",
    to: "/docs/examples",
    match: [
      "/docs/examples",
      "/docs/featured-examples",
      ...ALL_EXAMPLE_CATEGORIES.map((category) => `${category.legacyRoute}/`),
    ],
    groups: ALL_EXAMPLE_CATEGORIES.map((category) => ({
      label: category.label,
      route: category.examples[0].route,
      items: toItems(category.examples),
    })),
  },
  {
    label: "Blog",
    to: "/docs/blog/dynamic-hardware",
    match: ["/docs/blog"],
    groups: [{ label: "Blog", items: BLOG_PAGES.map((page) => ({ label: page.nav, to: page.route })) }],
  },
];

/** Every routable docs page, including the two generated cover pages. */
export const DOCS_PAGES: DocPage[] = [
  ...CORE_PAGES,
  ...FEATURED_PAGES,
  ...ALL_EXAMPLE_CATEGORIES.flatMap((category) => toDocPages(category.examples)),
  ...BLOG_PAGES,
];

const byRoute = new Map(DOCS_PAGES.map((page) => [page.route, page]));
const redirects = new Map(
  [
    ...ALL_EXAMPLE_CATEGORIES.map(
      (category) => [category.legacyRoute, category.examples[0].route] as const,
    ),
    ["/docs/basics", "/docs/examples"] as const,
  ],
);

export function findDocPage(route: string): DocPage | undefined {
  return byRoute.get(route);
}

export function findDocRedirect(route: string): string | undefined {
  return redirects.get(route);
}

export function findDocTab(route: string): DocTab | undefined {
  return DOCS_TABS.find((tab) => tab.match.some((prefix) => route.startsWith(prefix)));
}
