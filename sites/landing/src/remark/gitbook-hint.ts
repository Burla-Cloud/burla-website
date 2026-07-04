import { visit } from "unist-util-visit";
import type { Root, Paragraph, RootContent } from "mdast";

const OPEN_RE = /^\{%\s*hint\s+style=["\u201C\u201D]([^"\u201C\u201D]+)["\u201C\u201D]\s*%\}$/;
const CLOSE_RE = /^\{%\s*endhint\s*%\}$/;

function paragraphText(node: Paragraph): string | null {
  if (node.children.length !== 1) return null;
  const first = node.children[0]!;
  if (first.type !== "text") return null;
  return first.value.trim();
}

export default function remarkGitbookHint() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node, index, parent) => {
      if (!parent || index === undefined) return;
      const text = paragraphText(node as Paragraph);
      if (!text) return;

      const openMatch = OPEN_RE.exec(text);
      if (openMatch) {
        const style = openMatch[1]!;
        (parent.children[index] as unknown as RootContent) = {
          type: "html",
          value: `<aside class="hint hint--${style}" role="note">`,
        } as RootContent;
        return;
      }

      if (CLOSE_RE.test(text)) {
        (parent.children[index] as unknown as RootContent) = {
          type: "html",
          value: `</aside>`,
        } as RootContent;
      }
    });
  };
}
