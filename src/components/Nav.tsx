import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LINKS, NAV } from "../content";
import { BrandLockup } from "./BrandLockup";
import { formatStars, useStars } from "../lib/useRepoStats";
import { prefetchDocsApp, prefetchDocsHero } from "../lib/prefetchDocs";

/**
 * The site navbar. `sections` is an optional slot rendered beside the brand,
 * used by the docs to put their section tabs inside this same bar.
 */
export function Nav({ sections }: { sections?: ReactNode }) {
  const stars = useStars();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  // Warm the docs hero chunk once this page is idle so the galaxy is already
  // compiled when someone clicks through.
  useEffect(() => {
    const idle = window.requestIdleCallback;
    if (idle) {
      const handle = idle(() => prefetchDocsHero(), { timeout: 3000 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(prefetchDocsHero, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-500 ease-out ${
        menuOpen
          ? "border-white/[0.09] bg-[#03080d] shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
          : scrolled
            ? "border-white/[0.09] bg-[#03080d]/55 shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            : "border-transparent bg-[#03080d]/0"
      }`}
    >
      <div className="relative flex min-h-16 items-center justify-between gap-8 px-6 sm:px-10">
        <div className="flex min-w-0 items-center">
          <BrandLockup />
          {sections && <div className="docs-sections-slot">{sections}</div>}
        </div>
        <div className="flex items-center gap-7">
          <nav className="hidden items-center gap-7 sm:flex">
            {NAV.links.map((l) => {
              const linkClass =
                "group flex min-h-11 items-center gap-3 font-mono text-[15px] font-medium text-ice transition-colors hover:text-accent";
              if (l.href.startsWith("/")) {
                const warm =
                  l.href === LINKS.docs
                    ? () => {
                        prefetchDocsHero();
                        prefetchDocsApp();
                      }
                    : undefined;
                return (
                  <Link
                    key={l.label}
                    to={l.href}
                    className={linkClass}
                    onPointerEnter={warm}
                    onFocus={warm}
                  >
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
            className="hidden min-h-11 items-center rounded-full border border-white/30 px-5 py-2 font-mono text-[15px] font-medium text-ice transition-colors hover:border-accent hover:text-accent sm:inline-flex"
          >
            {NAV.login.label}
          </a>
          <button
            type="button"
            aria-label={menuOpen ? "Close site menu" : "Open site menu"}
            aria-controls="site-mobile-menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-11 items-center justify-center rounded-md border border-white/15 text-ice transition-colors hover:border-accent/60 hover:text-accent sm:hidden"
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
            >
              {menuOpen ? (
                <path d="m4 4 12 12m0-12L4 16" />
              ) : (
                <path d="M3 5.5h14M3 10h14M3 14.5h14" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {menuOpen && (
        <div
          id="site-mobile-menu"
          className="h-[calc(100dvh-64px)] overflow-y-auto border-t border-white/[0.08] bg-[#03080d] px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 sm:hidden"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col">
            {NAV.links.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-12 items-center border-b border-white/[0.07] font-mono text-[15px] font-medium text-ice"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-12 items-center justify-between gap-4 border-b border-white/[0.07] font-mono text-[15px] font-medium text-ice"
                >
                  {link.label}
                  {link.label === "GitHub" && (
                    <span className="tnum text-[12px] font-normal text-ice/60">
                      {formatStars(stars)} stars
                    </span>
                  )}
                </a>
              ),
            )}
            <a
              href={NAV.login.href}
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full border border-accent/60 font-mono text-[15px] font-medium text-accent"
            >
              {NAV.login.label}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
