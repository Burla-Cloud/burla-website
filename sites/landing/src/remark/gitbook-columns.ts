import { visit } from "unist-util-visit";
import type { Root, Paragraph, RootContent } from "mdast";

const OPEN_COLS_RE = /^\{%\s*columns\s*%\}$/;
const CLOSE_COLS_RE = /^\{%\s*endcolumns\s*%\}$/;
const OPEN_COL_RE = /^\{%\s*column(?:\s+width=["\u201C\u201D]([^"\u201C\u201D]+)["\u201C\u201D])?\s*%\}$/;
const CLOSE_COL_RE = /^\{%\s*endcolumn\s*%\}$/;

function paragraphText(node: Paragraph): string | null {
  if (node.children.length !== 1) return null;
  const first = node.children[0]!;
  if (first.type !== "text") return null;
  return first.value.trim();
}

export default function remarkGitbookColumns() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node, index, parent) => {
      if (!parent || index === undefined) return;
      const text = paragraphText(node as Paragraph);
      if (!text) return;

      let replacement: string | null = null;

      if (OPEN_COLS_RE.test(text)) {
        replacement = `<div class="cols">`;
      } else if (CLOSE_COLS_RE.test(text)) {
        replacement = `</div>`;
      } else {
        const openCol = OPEN_COL_RE.exec(text);
        if (openCol) {
          const width = openCol[1];
          const style = width ? ` style="flex-basis: ${width};"` : "";
          replacement = `<div class="col"${style}>`;
        } else if (CLOSE_COL_RE.test(text)) {
          replacement = `</div>`;
        }
      }

      if (replacement !== null) {
        (parent.children[index] as unknown as RootContent) = {
          type: "html",
          value: replacement,
        } as RootContent;
      }
    });
  };
}
