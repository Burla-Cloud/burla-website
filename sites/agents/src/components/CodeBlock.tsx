import { useEffect, useState, type ReactNode } from "react";

type Variant = "dark" | "cream";

interface CodeBlockProps {
  code: string;
  language?: "python" | "bash" | "ts" | "text";
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  variant?: Variant;
  copy?: boolean;
  titleRight?: ReactNode;
  className?: string;
  padding?: "default" | "tight" | "loose";
}

const PY_KEYWORDS = new Set([
  "from",
  "import",
  "def",
  "return",
  "if",
  "elif",
  "else",
  "for",
  "while",
  "in",
  "not",
  "and",
  "or",
  "as",
  "with",
  "try",
  "except",
  "finally",
  "raise",
  "class",
  "lambda",
  "yield",
  "pass",
  "break",
  "continue",
  "True",
  "False",
  "None",
  "is",
  "global",
  "nonlocal",
  "async",
  "await",
]);

const PY_HIGHLIGHT = new Set([
  "remote_parallel_map",
  "func_cpu",
  "func_ram",
  "func_gpu",
  "image",
  "grow",
  "max_parallelism",
  "detach",
  "generator",
  "spinner",
  "burla",
]);

const PY_BUILTINS = new Set([
  "len",
  "range",
  "list",
  "dict",
  "set",
  "tuple",
  "str",
  "int",
  "float",
  "bool",
  "print",
  "sum",
  "min",
  "max",
  "open",
  "sorted",
  "enumerate",
  "zip",
  "map",
  "filter",
]);

type Token =
  | { t: "txt"; v: string }
  | { t: "comment"; v: string }
  | { t: "string"; v: string }
  | { t: "kw"; v: string }
  | { t: "bi"; v: string }
  | { t: "hl"; v: string }
  | { t: "num"; v: string }
  | { t: "deco"; v: string };

function tokenizePython(line: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];

    if (ch === "#") {
      out.push({ t: "comment", v: line.slice(i) });
      i = line.length;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j += 2;
        else j++;
      }
      j = Math.min(j + 1, line.length);
      out.push({ t: "string", v: line.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === "f" && (line[i + 1] === '"' || line[i + 1] === "'")) {
      const quote = line[i + 1];
      let j = i + 2;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j += 2;
        else j++;
      }
      j = Math.min(j + 1, line.length);
      out.push({ t: "string", v: line.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === "@") {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_.]/.test(line[j])) j++;
      out.push({ t: "deco", v: line.slice(i, j) });
      i = j;
      continue;
    }

    if (/\d/.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9_.a-zA-Z]/.test(line[j])) j++;
      out.push({ t: "num", v: line.slice(i, j) });
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (PY_KEYWORDS.has(word)) out.push({ t: "kw", v: word });
      else if (PY_HIGHLIGHT.has(word)) out.push({ t: "hl", v: word });
      else if (PY_BUILTINS.has(word)) out.push({ t: "bi", v: word });
      else out.push({ t: "txt", v: word });
      i = j;
      continue;
    }

    let j = i;
    while (
      j < line.length &&
      !/[A-Za-z0-9_'"#@]/.test(line[j])
    )
      j++;
    out.push({ t: "txt", v: line.slice(i, j === i ? i + 1 : j) });
    i = j === i ? i + 1 : j;
  }
  return out;
}

function tokenizeBash(line: string): Token[] {
  if (line.trim().startsWith("#"))
    return [{ t: "comment", v: line }];
  const out: Token[] = [];
  const parts = line.match(/("[^"]*"|'[^']*'|\S+|\s+)/g) || [line];
  let firstWord = true;
  for (const p of parts) {
    if (/^\s+$/.test(p)) {
      out.push({ t: "txt", v: p });
      continue;
    }
    if (p.startsWith('"') || p.startsWith("'")) {
      out.push({ t: "string", v: p });
      continue;
    }
    if (firstWord && /^[a-z]/.test(p)) {
      out.push({ t: "hl", v: p });
      firstWord = false;
      continue;
    }
    if (p.startsWith("-")) {
      out.push({ t: "kw", v: p });
      continue;
    }
    out.push({ t: "txt", v: p });
    firstWord = false;
  }
  return out;
}

function classFor(t: Token["t"], variant: Variant): string {
  if (variant === "dark") {
    switch (t) {
      case "comment":
        return "text-inkSubtle";
      case "string":
        return "text-[#92400E]";
      case "kw":
        return "text-[#164E63]";
      case "bi":
        return "text-[#0E7490]";
      case "hl":
        return "text-accent";
      case "num":
        return "text-[#92400E]";
      case "deco":
        return "text-[#92400E]";
      default:
        return "text-ink";
    }
  }
  switch (t) {
    case "comment":
      return "text-creamSubtle";
    case "string":
      return "text-[#FBBF24]";
    case "kw":
      return "text-[#67E8F9]";
    case "bi":
      return "text-[#A5F3FC]";
    case "hl":
      return "text-[#F5F7F9] font-semibold underline decoration-accent decoration-2 underline-offset-[5px]";
    case "num":
      return "text-[#FBBF24]";
    case "deco":
      return "text-[#FBBF24]";
    default:
      return "text-creamInk";
  }
}

export function CodeBlock({
  code,
  language = "python",
  filename,
  showLineNumbers = false,
  highlightLines = [],
  variant = "dark",
  copy = false,
  titleRight,
  className = "",
  padding = "default",
}: CodeBlockProps) {
  const lines = code.replace(/\n$/, "").split("\n");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // ignore
    }
  };

  const isCream = variant === "cream";
  const pad =
    padding === "tight"
      ? "py-3 px-4"
      : padding === "loose"
        ? "py-7 px-7"
        : "py-5 px-5 md:py-6 md:px-6";

  return (
    <div
      className={`${isCream ? "code-shell-cream" : "code-shell"} ${className}`}
    >
      {(filename || copy || titleRight) && (
        <div
          className={isCream ? "code-titlebar-cream" : "code-titlebar"}
        >
          <div className="flex items-center gap-3">
            <div className="traffic">
              <span
                style={{ background: isCream ? "#212931" : "#D2DAE2" }}
              />
              <span
                style={{ background: isCream ? "#212931" : "#D2DAE2" }}
              />
              <span
                style={{ background: isCream ? "#212931" : "#D2DAE2" }}
              />
            </div>
            {filename && (
              <span className="mono normal-case tracking-normal">
                {filename}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {titleRight}
            {copy && (
              <button
                type="button"
                onClick={onCopy}
                className={`mono normal-case tracking-normal text-[11px] rounded-md px-2 py-1 border ${
                  isCream
                    ? "border-creamLine bg-cream hover:border-creamInk/40 text-creamMuted hover:text-creamInk"
                    : "border-line bg-surface hover:border-lineBright text-inkMuted hover:text-ink"
                } transition-colors`}
                aria-label="Copy code"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>
        </div>
      )}
      <pre
        className={`mono text-[12.5px] md:text-[13px] leading-[1.65] ${pad} ${
          isCream ? "text-creamInk" : "text-ink"
        }`}
      >
        <code>
          {lines.map((line, idx) => {
            const lineNumber = idx + 1;
            const highlighted = highlightLines.includes(lineNumber);
            const tokens =
              language === "python"
                ? tokenizePython(line)
                : language === "bash"
                  ? tokenizeBash(line)
                  : [{ t: "txt" as const, v: line }];
            return (
              <div
                key={idx}
                className={`code-line relative -mx-5 px-5 md:-mx-6 md:px-6 ${
                  highlighted
                    ? isCream
                      ? "bg-accentSoft"
                      : "bg-accentSoft"
                    : ""
                }`}
                style={
                  highlighted
                    ? { boxShadow: "inset 2px 0 0 #155E75" }
                    : undefined
                }
              >
                {showLineNumbers && (
                  <span
                    className={`select-none inline-block w-7 mr-4 text-right ${
                      isCream ? "text-creamSubtle" : "text-inkSubtle"
                    }`}
                  >
                    {lineNumber}
                  </span>
                )}
                {tokens.length === 0 ? (
                  <span>&nbsp;</span>
                ) : (
                  tokens.map((tok, i) => (
                    <span key={i} className={classFor(tok.t, variant)}>
                      {tok.v}
                    </span>
                  ))
                )}
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
