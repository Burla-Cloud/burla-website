import { visit, SKIP } from "unist-util-visit";
import type { Root, Paragraph, PhrasingContent, RootContent, Text } from "mdast";

const TOKEN_LINE_RE = /^\{%.*?%\}$/;

function isTokenLine(line: string): boolean {
  return TOKEN_LINE_RE.test(line.trim());
}

function makeText(value: string): Text | null {
  if (!value) return null;
  return { type: "text", value } satisfies Text;
}

function makeParagraph(children: PhrasingContent[]): Paragraph {
  return { type: "paragraph", children };
}

export default function remarkGitbookSplitParagraphs() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node, index, parent) => {
      if (!parent || index === undefined) return;

      const out: Paragraph[] = [];
      let buffer: PhrasingContent[] = [];

      const flushBuffer = () => {
        if (!buffer.length) return;
        const cleaned = buffer.filter(
          (c) => !(c.type === "text" && !c.value.replace(/\s+/g, "")),
        );
        if (cleaned.length) out.push(makeParagraph(cleaned));
        buffer = [];
      };

      for (const child of node.children) {
        if (child.type !== "text") {
          buffer.push(child);
          continue;
        }

        const lines = child.value.split("\n");
        let pending = "";
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          const isLast = i === lines.length - 1;
          if (isTokenLine(line)) {
            if (pending) {
              const t = makeText(pending);
              if (t) buffer.push(t);
              pending = "";
            }
            flushBuffer();
            out.push(makeParagraph([{ type: "text", value: line.trim() }]));
          } else {
            pending += (pending ? "\n" : "") + line;
            if (isLast && pending) {
              const t = makeText(pending);
              if (t) buffer.push(t);
              pending = "";
            }
          }
        }
      }
      flushBuffer();

      if (out.length === 0) return;

      const onlyOne =
        out.length === 1 &&
        out[0]!.children.length === node.children.length;
      if (onlyOne) return;

      (parent.children as RootContent[]).splice(index, 1, ...out);
      return [SKIP, index + out.length];
    });
  };
}
