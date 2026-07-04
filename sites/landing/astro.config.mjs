import { defineConfig } from "astro/config";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

import remarkGitbookSplitParagraphs from "./src/remark/gitbook-split-paragraphs.ts";
import remarkGitbookHint from "./src/remark/gitbook-hint.ts";
import remarkGitbookEmbed from "./src/remark/gitbook-embed.ts";
import remarkGitbookColumns from "./src/remark/gitbook-columns.ts";
import remarkGitbookAssets from "./src/remark/gitbook-assets.ts";
import remarkGitbookLinks from "./src/remark/gitbook-links.ts";
import rehypeGitbookLinks from "./src/rehype/gitbook-links.ts";


const BASE_PATH = process.env.SITE_BASE_PATH ?? "";
const GITBOOK_SHIKI_THEME = {
  name: "gitbook-light",
  type: "light",
  settings: [
    { settings: { foreground: "#191e1f", background: "#ffffff" } },
    { scope: ["keyword", "storage"], settings: { foreground: "#e40021" } },
    { scope: ["keyword.operator", "punctuation", "punctuation.definition", "punctuation.separator"], settings: { foreground: "#59737a" } },
    { scope: ["constant.numeric", "variable.parameter"], settings: { foreground: "#bb5c00" } },
    { scope: ["entity.name.function", "support.function", "support.type", "support.class", "variable.function"], settings: { foreground: "#5f7f8a" } },
    { scope: ["support.type.builtin", "support.function.builtin"], settings: { foreground: "#bb5c00" } },
    { scope: ["string"], settings: { foreground: "#009817" } },
  ],
};

export default defineConfig({
  site: process.env.SITE_URL ?? "https://burla.dev",
  base: BASE_PATH || undefined,
  trailingSlash: "ignore",
  markdown: {
    smartypants: false,
    shikiConfig: {
      theme: GITBOOK_SHIKI_THEME,
      wrap: true,
    },
    remarkPlugins: [
      remarkGitbookSplitParagraphs,
      remarkGitbookAssets,
      remarkGitbookLinks,
      remarkGitbookHint,
      remarkGitbookEmbed,
      remarkGitbookColumns,
    ],
    rehypePlugins: [
      rehypeSlug,
      rehypeGitbookLinks,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "prepend",
          properties: { className: ["heading-anchor"], ariaLabel: "Direct link to heading" },
          content: {
            type: "element",
            tagName: "span",
            properties: { className: ["heading-anchor__icon"], ariaHidden: "true" },
            children: [{ type: "text", value: "#" }],
          },
        },
      ],
    ],
  },
  build: {
    inlineStylesheets: "auto",
  },
});
