import { useEffect, useMemo, useState } from "react";
import { docHeadings, getDocContent, selectCloud } from "./loader";
import { useCloudChoice } from "./cloudChoice";

// The right-hand rail, built like Modal's: the page title on top, then its
// headings, all sharing one continuous hairline down the left edge. The
// heading in view gets an accent bar and a chip background.
export function Toc({ route, title }: { route: string; title: string }) {
  // Getting Started renders only the chosen cloud's sections, and its step 2
  // is named after that cloud, so the rail has to read the same filtered copy.
  const [cloud] = useCloudChoice();
  const headings = useMemo(() => {
    let md = getDocContent(route)?.markdown ?? "";
    if (cloud) md = selectCloud(md, cloud);
    const found = docHeadings(md);
    const minLevel = found.length ? Math.min(...found.map((h) => h.level)) : 2;
    return found.map((h) => ({ ...h, nested: h.level > minLevel }));
  }, [route, cloud]);

  // "" means the page title (top of the document) is active.
  const [active, setActive] = useState("");

  useEffect(() => {
    if (!headings.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      let current = "";
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top <= 140) current = h.id;
        else break;
      }
      setActive(current);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [headings]);

  if (!headings.length) return null;

  const rowClass = (isActive: boolean, nested: boolean) =>
    `-ml-px block border-l-2 py-2 pr-3 text-[13.5px] leading-5 transition-colors ${
      nested ? "pl-7" : "pl-4"
    } ${
      isActive
        ? "border-accent bg-white/[0.06] text-accent"
        : "border-transparent text-inkFaint hover:text-ink"
    }`;

  const jump = (id: string) => {
    if (!id) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", window.location.pathname);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav aria-label="On this page" className="border-l border-white/[0.09]">
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          jump("");
        }}
        className={rowClass(active === "", false)}
      >
        {title}
      </a>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          onClick={(e) => {
            e.preventDefault();
            jump(h.id);
          }}
          className={rowClass(active === h.id, h.nested)}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}
