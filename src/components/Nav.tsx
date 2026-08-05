import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { NAV } from "../content";
import { BrandLockup } from "./BrandLockup";
import { formatStars, useStars } from "../lib/useRepoStats";

/**
 * The site navbar. `sections` is an optional slot rendered beside the brand,
 * used by the docs to put their section tabs inside this same bar.
 */
export function Nav({ sections }: { sections?: ReactNode }) {
  const stars = useStars();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // The Docs link is redundant while reading the docs.
  const links = NAV.links.filter(
    (l) => !(l.href.startsWith("/docs") && pathname.startsWith("/docs")),
  );

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-500 ease-out ${
        scrolled
          ? "border-white/[0.09] bg-[#03080d] shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
          : "border-transparent bg-[#03080d]/0"
      }`}
    >
      <div className="relative flex items-center justify-between gap-8 px-6 py-4 sm:px-10">
        <div className="flex min-w-0 items-center">
          <BrandLockup />
          {sections && <div className="docs-sections-slot">{sections}</div>}
        </div>
        <div className="flex items-center gap-7">
          <nav className="hidden items-center gap-7 sm:flex">
            {links.map((l) => {
              const linkClass =
                "group flex items-center gap-3 font-mono text-[15px] font-medium text-ice transition-colors hover:text-accent";
              if (l.href.startsWith("/")) {
                return (
                  <Link key={l.label} to={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                );
              }
              return (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className={linkClass}
                >
                  {l.label}
                  {/* Star count as quiet metadata: hairline divider, one type
                      size down, tabular numerals. The whole link is one hover
                      target and lifts together. */}
                  {l.label === "GitHub" && (
                    <>
                      <span
                        aria-hidden
                        className="h-3.5 w-px bg-white/20 transition-colors group-hover:bg-accent/40"
                      />
                      <span className="tnum text-[12px] font-normal text-ice/60 transition-colors group-hover:text-accent/85">
                        {formatStars(stars)} stars
                      </span>
                    </>
                  )}
                </a>
              );
            })}
          </nav>
          <a
            href={NAV.login.href}
            className="hidden rounded-full border border-white/30 px-5 py-2 font-mono text-[15px] font-medium text-ice transition-colors hover:border-accent hover:text-accent sm:inline-flex"
          >
            {NAV.login.label}
          </a>
        </div>
      </div>
    </header>
  );
}
