import { isValidElement, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import { common } from "lowlight";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import { copyText } from "../lib/copyText";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

const HINT_LABELS: Record<string, string> = {
  info: "Note",
  success: "Tip",
  warning: "Warning",
  danger: "Caution",
};

function Blockquote({ children }: ComponentProps<"blockquote">) {
  const items = Array.isArray(children) ? children : [children];
  // A hint blockquote's first paragraph is the [!HINT:style] marker.
  const markerIndex = items.findIndex((c) => /^\[!HINT:\w+\]$/.test(textOf(c).trim()));
  if (markerIndex !== -1) {
    const style = textOf(items[markerIndex]).trim().match(/^\[!HINT:(\w+)\]$/)![1];
    const rest = items.filter((_, i) => i !== markerIndex);
    return (
      <aside className={`doc-hint doc-hint-${style}`}>
        <span className="doc-hint-label">{HINT_LABELS[style] ?? style}</span>
        <div className="doc-hint-body">{rest}</div>
      </aside>
    );
  }
  return <blockquote>{children}</blockquote>;
}

function Anchor({ href = "", children, ...rest }: ComponentProps<"a">) {
  if (href.startsWith("/docs")) {
    const { className } = rest;
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }
  const external = /^https?:/.test(href);
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      {...rest}
    >
      {children}
    </a>
  );
}

// The whole block is the copy target, with a button in the corner as the
// affordance. Dragging to select text still works: a click that ends on a
// selection is a selection, not a copy.
function Pre({ children, ...rest }: ComponentProps<"pre">) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await copyText(textOf(children).replace(/\n$/, ""));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className="doc-codeblock"
      data-copied={copied ? "true" : undefined}
      onClick={() => {
        if (!window.getSelection()?.toString()) void copy();
      }}
    >
      <pre {...rest}>{children}</pre>
      <button
        type="button"
        className="doc-codeblock-copy"
        aria-label={copied ? "Copied" : "Copy code"}
        onClick={(event) => {
          event.stopPropagation();
          void copy();
        }}
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {copied ? (
            <path d="M4.75 10.5 8.25 14l7-8" />
          ) : (
            <>
              <rect x={7} y={7} width={9.5} height={9.5} rx={2} />
              <path d="M13 4.5H5.5A1.5 1.5 0 0 0 4 6v7.5" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

function Table(props: ComponentProps<"table">) {
  return (
    <div className="doc-table-wrap">
      <table {...props} />
    </div>
  );
}

function Img({ src, alt, ...rest }: ComponentProps<"img">) {
  return <img src={src} alt={alt ?? ""} loading="lazy" {...rest} />;
}

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [
  rehypeRaw,
  rehypeSlug,
  [rehypeHighlight, { languages: { ...common, dockerfile } }] as never,
];
const COMPONENTS = {
  a: Anchor,
  blockquote: Blockquote,
  pre: Pre,
  table: Table,
  img: Img,
};

export function DocMarkdown({
  markdown,
  components,
}: {
  markdown: string;
  components?: ComponentProps<typeof ReactMarkdown>["components"];
}) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={components ? { ...COMPONENTS, ...components } : COMPONENTS}
    >
      {markdown}
    </ReactMarkdown>
  );
}
