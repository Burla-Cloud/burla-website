import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export interface SidebarLink {
  kind: "link";
  title: string;
  href: string;
}

export interface SidebarSection {
  heading: string | null;
  entries: SidebarLink[];
}

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SUMMARY_PATH = resolve(here, "../../../../user-docs/SUMMARY.md");
const SUMMARY_PATH =
  process.env.USER_DOCS_SUMMARY_PATH ??
  (process.env.USER_DOCS_PATH ? resolve(process.env.USER_DOCS_PATH, "SUMMARY.md") : DEFAULT_SUMMARY_PATH);

const URL_PREFIX_ALIASES: Array<[RegExp, string]> = [
  [/^general-use-cases\//, "docs/use-cases/"],
  [/^common-patterns\//, "docs/how-to/"],
  [/^demo-blogs\//, "examples/"],
];

const URL_ALIASES = new Map<string, string>([
  ["get-started", "docs/quickstart"],
  ["api-reference", "docs/api-reference"],
  ["about", "docs/about"],
  ["demo-walkthroughs", "examples"],
  ["the-experiment-you-dont-run", "docs/essays/the-experiment-you-dont-run"],
  ["stop-designing-the-cluster", "docs/essays/stop-designing-the-cluster"],
]);

const HIDDEN_URLS = new Set([
  "/security",
  "/privacy-policy",
  "/software-as-a-service-agreement",
  "/website-privacy-policy",
]);

export function idToUrl(rawId: string): string {
  let id = rawId.trim().replace(/\.md$/i, "");
  if (id.startsWith("./")) id = id.slice(2);
  if (id === "README" || id === "") return "/";
  const lower = id.toLowerCase();
  const aliased = URL_ALIASES.get(lower);
  if (aliased) return "/" + aliased;
  for (const [re, repl] of URL_PREFIX_ALIASES) id = id.replace(re, repl);
  return "/" + id;
}

export function urlToSlug(url: string): string {
  if (url === "/" || url === "") return "";
  return url.replace(/^\//, "");
}

function mdPathToHref(path: string): string {
  return idToUrl(path);
}

const LINK_RE = /^(\s*)[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*$/;
const H2_RE = /^##\s+(.+?)\s*$/;

export function loadSidebarTitleByUrl(url: string): string | null {
  const sections = loadDocsNav();
  for (const section of sections) {
    for (const entry of section.entries) {
      if (entry.href === url) return entry.title;
    }
  }
  return null;
}

export function loadSectionForUrl(url: string): string | null {
  const sections = loadDocsNav();
  for (const section of sections) {
    for (const entry of section.entries) {
      if (entry.href === url) {
        return section.heading;
      }
    }
  }
  return null;
}

export function loadSidebar(): SidebarSection[] {
  const raw = readFileSync(SUMMARY_PATH, "utf8");
  const lines = raw.split(/\r?\n/);

  const sections: SidebarSection[] = [];
  let current: SidebarSection = { heading: null, entries: [] };
  sections.push(current);

  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith("#") && !line.startsWith("##")) continue;

    const h2 = H2_RE.exec(line);
    if (h2) {
      current = { heading: h2[1]!.trim(), entries: [] };
      sections.push(current);
      continue;
    }

    const link = LINK_RE.exec(line);
    if (link) {
      const [, , title, path] = link;
      current.entries.push({ kind: "link", title: title!, href: mdPathToHref(path!) });
    }
  }

  const uniqueSections: SidebarSection[] = [];
  const sectionByHeading = new Map<string, SidebarSection>();
  for (const section of sections) {
    if (!section.heading) {
      uniqueSections.push(section);
      continue;
    }
    const key = section.heading.toLowerCase();
    const existing = sectionByHeading.get(key);
    if (existing) {
      existing.entries.push(...section.entries);
      continue;
    }
    sectionByHeading.set(key, section);
    uniqueSections.push(section);
  }

  for (const section of uniqueSections) {
    section.entries = section.entries.map((entry) => {
      if (entry.title === "Other Examples") return { ...entry, title: "Demo walkthroughs" };
      return entry;
    });
  }

  const essaysIndex = uniqueSections.findIndex((section) => section.heading?.toLowerCase() === "essays");
  if (essaysIndex > 0) {
    const [essays] = uniqueSections.splice(essaysIndex, 1);
    uniqueSections.splice(1, 0, essays);
  }

  return uniqueSections;
}

function uniqueLinks(links: SidebarLink[]): SidebarLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.href) || HIDDEN_URLS.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

function sectionEntries(sections: SidebarSection[], heading: string): SidebarLink[] {
  const section = sections.find((item) => item.heading?.toLowerCase() === heading.toLowerCase());
  return uniqueLinks(section?.entries ?? []);
}

export function loadDocsNav(): SidebarSection[] {
  const sections = loadSidebar();
  const examples = sectionEntries(sections, "Examples").filter((link) => link.href !== "/examples");

  return [
    {
      heading: "Start here",
      entries: [
        { kind: "link" as const, title: "Overview", href: "/docs" },
        { kind: "link" as const, title: "Quickstart", href: "/docs/quickstart" },
        { kind: "link" as const, title: "API/CLI Reference", href: "/docs/api-reference" },
        { kind: "link" as const, title: "About", href: "/docs/about" },
      ],
    },
    { heading: "Use Cases", entries: sectionEntries(sections, "Use Cases") },
    { heading: "How To", entries: sectionEntries(sections, "How To") },
    {
      heading: "Examples",
      entries: [{ kind: "link" as const, title: "All examples", href: "/examples" }, ...examples],
    },
    { heading: "Essays", entries: sectionEntries(sections, "Essays") },
  ].filter((section) => section.entries.length > 0);
}
