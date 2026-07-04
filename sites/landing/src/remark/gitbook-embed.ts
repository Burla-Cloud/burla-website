import { visit } from "unist-util-visit";
import type { Root, Paragraph, RootContent } from "mdast";

const EMBED_START_RE = /^\{%\s*embed\s+url=["\u201C\u201D]$/;
const EMBED_END_RE = /^["\u201C\u201D]\s*%\}$/;
const EMBED_FULL_RE = /^\{%\s*embed\s+url=["\u201C\u201D]([^"\u201C\u201D]+)["\u201C\u201D]\s*%\}$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function titleOf(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, "").replace(/\.[a-z]+$/i, "");
    if (u.hostname.includes("colab.research.google.com")) return "Google Colab";
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      return "YouTube";
    }
    if (u.hostname.includes("kaggle.com")) {
      return path.split("/").pop()?.replace(/[-_]/g, " ") || "Kaggle";
    }
    if (u.hostname === "docs.burla.dev" || u.hostname === "burla.dev") {
      const last = path.split("/").pop();
      if (!last) return "Burla";
      return `${last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} | Burla`;
    }
    return u.hostname;
  } catch {
    return url;
  }
}

function extractEmbedUrl(node: Paragraph): string | null {
  if (node.children.length === 1 && node.children[0]!.type === "text") {
    const m = EMBED_FULL_RE.exec(node.children[0]!.value.trim());
    return m ? m[1]! : null;
  }
  if (
    node.children.length === 3 &&
    node.children[0]!.type === "text" &&
    node.children[1]!.type === "link" &&
    node.children[2]!.type === "text"
  ) {
    const head = node.children[0]!.value.trim();
    const tail = node.children[2]!.value.trim();
    if (EMBED_START_RE.test(head) && EMBED_END_RE.test(tail)) {
      return node.children[1]!.url;
    }
  }
  return null;
}

const BASE = (process.env.SITE_BASE_PATH ?? "").replace(/\/$/, "");

function buildCardHtml(url: string): string {
  const title = titleOf(url);
  const host = hostnameOf(url);
  const isInternal = host === "docs.burla.dev" || host === "burla.dev";
  let href = url;
  if (isInternal) {
    try {
      const u = new URL(url);
      href = `${BASE}${u.pathname}${u.hash}`;
    } catch {}
  }
  const target = isInternal ? "" : ` target="_blank" rel="noopener"`;
  return `<a class="page-card" href="${escapeHtml(href)}"${target}>
    <span class="page-card__logo" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
    </span>
    <span class="page-card__body">
      <span class="page-card__title">${escapeHtml(title)}</span>
      <span class="page-card__host">${escapeHtml(host)}</span>
    </span>
    <span class="page-card__chevron" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </span>
  </a>`;
}

export default function remarkGitbookEmbed() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node, index, parent) => {
      if (!parent || index === undefined) return;
      const url = extractEmbedUrl(node as Paragraph);
      if (!url) return;

      (parent.children[index] as unknown as RootContent) = {
        type: "html",
        value: buildCardHtml(url),
      } as RootContent;
    });
  };
}
