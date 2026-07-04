import { visit } from "unist-util-visit";

const BASE = (process.env.SITE_BASE_PATH ?? "").replace(/\/$/, "");

const URL_ALIASES: Array<[RegExp, string]> = [
  [/^demo-walkthroughs$/, "examples/demo-walkthroughs"],
  [/^demo-blogs\//, "examples/demo-walkthroughs/"],
  [
    /^general-use-cases\/(run-batch-inference-and-vector-embeddings|run-pipeline-stages-on-different-hardware)$/,
    "use-cases/more-use-cases/$1",
  ],
  [/^(run-batch-inference-and-vector-embeddings|run-pipeline-stages-on-different-hardware)$/, "use-cases/more-use-cases/$1"],
  [/^general-use-cases\//, "use-cases/"],
  [
    /^common-patterns\/(limit-parallelism-for-apis-databases-and-websites|use-custom-docker-images-and-gpus|run-python-in-the-background)$/,
    "how-to/more-how-to-articles/$1",
  ],
  [/^(limit-parallelism-for-apis-databases-and-websites|use-custom-docker-images-and-gpus|run-python-in-the-background)$/, "how-to/more-how-to-articles/$1"],
  [/^common-patterns\//, "how-to/"],
];

function rewriteHref(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  if (/^(mailto:|tel:|#)/i.test(raw)) return null;

  let href = raw;
  if (/^https?:/i.test(href)) {
    try {
      const url = new URL(href);
      if (url.hostname !== "docs.burla.dev" && url.hostname !== "burla.dev") return null;
      href = `${url.pathname}${url.hash}`;
    } catch {
      return null;
    }
  }

  const [pathPart, hashPart = ""] = href.split("#", 2);
  let path = pathPart.replace(/\.md$/i, "");
  if (path.startsWith("./")) path = path.slice(2);
  if (path.startsWith("/")) path = path.slice(1);
  if (BASE && path.startsWith(BASE.slice(1) + "/")) path = path.slice(BASE.length);

  if (path === "README" || path === "") return hashPart ? `${BASE}/#${hashPart}` : `${BASE}/`;
  if (path.toLowerCase() === "api-reference") path = "api-reference";
  for (const [re, repl] of URL_ALIASES) path = path.replace(re, repl);

  return hashPart ? `${BASE}/${path}#${hashPart}` : `${BASE}/${path}`;
}

export default function rehypeGitbookLinks() {
  return (tree: unknown) => {
    visit(tree, "element", (node: any) => {
      if (node.tagName !== "a" || !node.properties) return;
      const next = rewriteHref(node.properties.href);
      if (next) node.properties.href = next;
    });
  };
}
