import { visit } from "unist-util-visit";
import type { Root, Link, Html } from "mdast";

const BASE = (process.env.SITE_BASE_PATH ?? "").replace(/\/$/, "");

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

function rewriteTarget(raw: string): string | null {
  if (!raw) return null;
  if (/^(mailto:|tel:|#)/i.test(raw)) return null;

  let href = raw;
  let isInternalAbsolute = false;
  if (/^https?:/i.test(href)) {
    try {
      const url = new URL(href);
      if (url.hostname !== "docs.burla.dev" && url.hostname !== "burla.dev") return null;
      href = `${url.pathname}${url.hash}`;
      isInternalAbsolute = true;
    } catch {
      return null;
    }
  }

  const [pathPart, hashPart = ""] = href.split("#", 2);
  if (!isInternalAbsolute && !/\.md(\?|$)/i.test(pathPart) && !pathPart.endsWith("/")) return null;

  let path = pathPart.replace(/\.md$/i, "");
  if (path.startsWith("./")) path = path.slice(2);
  if (path.startsWith("/")) path = path.slice(1);

  if (path === "README" || path === "") {
    return hashPart ? `${BASE}/#${hashPart}` : `${BASE}/`;
  }
  const aliased = URL_ALIASES.get(path.toLowerCase());
  if (aliased) return hashPart ? `${BASE}/${aliased}#${hashPart}` : `${BASE}/${aliased}`;
  for (const [re, repl] of URL_PREFIX_ALIASES) {
    path = path.replace(re, repl);
  }
  return hashPart ? `${BASE}/${path}#${hashPart}` : `${BASE}/${path}`;
}

const HREF_ATTR_RE = /\bhref=(["'])([^"']+)\1/g;

export default function remarkGitbookLinks() {
  return (tree: Root) => {
    visit(tree, "link", (node: Link) => {
      const next = rewriteTarget(node.url);
      if (next) node.url = next;
    });
    visit(tree, "html", (node: Html) => {
      node.value = node.value.replace(HREF_ATTR_RE, (match, quote, href) => {
        const next = rewriteTarget(href);
        return next ? `href=${quote}${next}${quote}` : match;
      });
    });
  };
}
