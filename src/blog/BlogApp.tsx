import { useEffect } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Nav } from "../components/Nav";
import { StarfieldBackground } from "../components/StarfieldBackground";
import { DocMarkdown } from "../docs/markdown";
import { Finale } from "../sections/Finale";
import { GrowCluster, TaskDistribution, WorkerAdjustment } from "./diagrams";
import rawPost from "./dynamic-hardware.md?raw";
import "../docs/docs.css";

const DIAGRAMS: Record<string, () => ReactNode> = {
  "task-distribution": TaskDistribution,
  "worker-adjustment": WorkerAdjustment,
  "grow-cluster": GrowCluster,
};

// <div data-diagram="name"> placeholders in the markdown render as floating
// inline-SVG diagrams; every other div passes through untouched.
function DiagramDiv(props: ComponentProps<"div"> & { node?: unknown }) {
  const name = (props as Record<string, unknown>)["data-diagram"];
  const Diagram = typeof name === "string" ? DIAGRAMS[name] : undefined;
  if (Diagram) {
    return (
      <div className="doc-diagram">
        <Diagram />
      </div>
    );
  }
  const rest = { ...props };
  delete rest.node;
  return <div {...rest} />;
}

const MARKDOWN_COMPONENTS = { div: DiagramDiv };

function preparePost(raw: string): string {
  const frontmatter = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const description = frontmatter?.[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  let markdown = frontmatter ? raw.slice(frontmatter[0].length) : raw;

  if (description) {
    markdown = markdown.replace(
      /^# .+$/m,
      (heading) => `${heading}\n\n<p class="doc-desc">${description}</p>`,
    );
  }

  const base = import.meta.env.BASE_URL;
  if (base !== "/") {
    markdown = markdown.replaceAll('="/docs-assets/', `="${base}docs-assets/`);
  }
  return markdown;
}

const POST = preparePost(rawPost);

export default function BlogApp() {
  useEffect(() => {
    document.title = "You should not need to estimate CPU or RAM · Burla";
  }, []);

  return (
    <div className="grain relative min-h-screen bg-void text-ink">
      <StarfieldBackground />

      <Nav />

      <main className="relative z-10 px-4 pt-32 sm:pt-40">
        <div className="mx-auto max-w-[800px]">
          <p className="mb-4 font-mono text-[12px] text-accent/80">
            This is our only blog post so far :)
          </p>
          <article className="blog-post doc-prose text-shadow-soft">
            <DocMarkdown markdown={POST} components={MARKDOWN_COMPONENTS} />
          </article>
        </div>
      </main>

      {/* Doubles the finale's own top padding so the post ends well before the
          call to action starts. */}
      <div className="relative z-10 pt-24 sm:pt-32">
        <Finale />
      </div>
    </div>
  );
}
