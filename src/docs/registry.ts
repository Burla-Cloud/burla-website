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

const toItems = (examples: ExampleCard[]): DocItem[] =>
  examples.map((example) => ({ label: example.title, to: example.route }));

const toDocPages = (examples: ExampleCard[]): DocPage[] =>
  examples.map((example) => ({ route: example.route, nav: example.title }));

// Getting Started's step 2 is titled after the cloud the reader picked, so its
// sidebar row (and anchor) changes with that choice.
const CLOUD_CLI_ITEMS: Record<string, DocItem> = {
  aws: {
    label: "Log in to the AWS CLI",
    to: "/docs/get-started#2-log-in-to-the-aws-cli",
  },
  gcp: {
    label: "Log in to the Google Cloud CLI",
    to: "/docs/get-started#2-log-in-to-the-google-cloud-cli",
  },
  azure: {
    label: "Log in to the Azure CLI",
    to: "/docs/get-started#2-log-in-to-the-azure-cli",
  },
};

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
            label: "Select your cloud provider",
            to: "/docs/get-started#1-select-your-cloud-provider",
          },
          CLOUD_CLI_ITEMS.aws,
          {
            label: "Install Burla",
            to: "/docs/get-started#3-install-burla",
          },
          {
            label: "Open the dashboard",
            to: "/docs/get-started#4-open-the-dashboard-and-boot-some-machines",
          },
          {
            label: "Run some code",
            to: "/docs/get-started#5-run-some-code-in-the-cloud",
          },
          {
            label: "Deploy for your team",
            to: "/docs/get-started#6-deploy-it-for-your-team-optional",
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
          { label: "burla deploy", to: "/docs/cli-reference#burla-deploy" },
          { label: "burla dashboard", to: "/docs/cli-reference#burla-dashboard" },
          { label: "burla login", to: "/docs/cli-reference#burla-login" },
          { label: "burla config", to: "/docs/cli-reference#burla-config" },
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
];

/** Every routable docs page, including the two generated cover pages. */
export const DOCS_PAGES: DocPage[] = [
  ...CORE_PAGES,
  ...ALL_EXAMPLE_CATEGORIES.flatMap((category) => toDocPages(category.examples)),
];

const byRoute = new Map(DOCS_PAGES.map((page) => [page.route, page]));
const redirects = new Map(
  [
    ...ALL_EXAMPLE_CATEGORIES.map(
      (category) => [category.legacyRoute, category.examples[0].route] as const,
    ),
    [
      "/docs/all-examples/basic-examples/use-custom-docker-images-and-gpus",
      "/docs/all-examples/basic-examples/use-custom-docker-images",
    ] as const,
    ["/docs/basics", "/docs/examples"] as const,
  ],
);

/**
 * Getting Started's sidebar tree depends on the chosen cloud: before a choice
 * only step 1 is on the page, and after one step 2 is named for that cloud.
 */
export function forCloud(tab: DocTab, cloud: string | null): DocTab {
  if (tab.to !== "/docs/get-started") return tab;
  return {
    ...tab,
    groups: tab.groups.map((group) => ({
      ...group,
      items: cloud
        ? group.items.map((item, index) =>
            index === 1 ? (CLOUD_CLI_ITEMS[cloud] ?? item) : item,
          )
        : group.items.slice(0, 1),
    })),
  };
}

export function findDocPage(route: string): DocPage | undefined {
  return byRoute.get(route);
}

export function findDocRedirect(route: string): string | undefined {
  return redirects.get(route);
}

export function findDocTab(route: string): DocTab | undefined {
  return DOCS_TABS.find((tab) => tab.match.some((prefix) => route.startsWith(prefix)));
}
