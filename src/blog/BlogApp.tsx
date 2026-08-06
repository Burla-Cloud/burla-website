import { useEffect } from "react";
import { Nav } from "../components/Nav";
import { StarfieldBackground } from "../components/StarfieldBackground";
import { DocMarkdown } from "../docs/markdown";
import { Finale } from "../sections/Finale";
import rawPost from "./dynamic-hardware.md?raw";
import "../docs/docs.css";

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

      <main className="relative z-10 px-6 pt-32 sm:px-10 sm:pt-40">
        <div className="mx-auto max-w-[980px]">
          <p className="mb-4 font-mono text-[12px] text-accent/80">
            This is our only blog post so far :)
          </p>
          <article className="blog-post doc-prose text-shadow-soft">
            <DocMarkdown markdown={POST} />
          </article>
        </div>
      </main>

      <div className="relative z-10">
        <Finale />
      </div>
    </div>
  );
}
