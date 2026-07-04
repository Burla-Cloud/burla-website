import { visit } from "unist-util-visit";
import type { Root, Html, Image } from "mdast";

const BASE = (process.env.SITE_BASE_PATH ?? "").replace(/\/$/, "");
const RAW_HTML_RE = /(src|href)="(?:\.\.\/)*\.gitbook\/assets\//g;
const MD_PATH_RE = /^(?:\.\.\/)*\.gitbook\/assets\//;

export default function remarkGitbookAssets() {
  return (tree: Root) => {
    visit(tree, "html", (node: Html) => {
      node.value = node.value.replace(RAW_HTML_RE, `$1="${BASE}/gitbook-assets/`);
    });
    visit(tree, "image", (node: Image) => {
      if (MD_PATH_RE.test(node.url)) {
        node.url = node.url.replace(MD_PATH_RE, `${BASE}/gitbook-assets/`);
      }
    });
  };
}
