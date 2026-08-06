import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { Nav } from "../components/Nav";
import { Footer } from "../components/Footer";
import { Scene } from "../components/Scene";
import { DocMarkdown } from "../docs/markdown";
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
  const descentRef = useRef(0);
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    document.title = "You should not need to estimate CPU or RAM · Burla";
  }, []);

  useEffect(() => {
    const update = () => {
      descentRef.current = Math.max(0, window.scrollY / window.innerHeight);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="grain relative min-h-screen bg-void text-ink">
      <div className="fixed inset-0 z-0" aria-hidden>
        <Scene
          descent={descentRef}
          reducedMotion={reducedMotion}
          galaxy={false}
        />
      </div>

      <Nav />

      <main className="relative z-10 px-6 pb-28 pt-32 sm:px-10 sm:pb-36 sm:pt-40">
        <div className="mx-auto max-w-[760px]">
          <p className="mb-4 font-mono text-[12px] text-accent/80">
            This is our only blog post so far :)
          </p>
          <article className="doc-prose text-shadow-soft">
            <DocMarkdown markdown={POST} />
          </article>
        </div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
