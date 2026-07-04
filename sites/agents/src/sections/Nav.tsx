import { useEffect, useState } from "react";
import { Logo } from "../components/Logo";
import { useRepoStats, formatStars } from "../lib/useRepoStats";

const LINKS = [
  { href: "#problem", label: "Why" },
  { href: "#system-prompt", label: "Agent skill" },
  { href: "#faq", label: "FAQ" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { stars } = useRepoStats();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || menuOpen
          ? "bg-onyx/85 backdrop-blur-md border-b border-line"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container-x flex items-center justify-between h-[68px]">
        <Logo />

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-full text-sm text-inkMuted hover:text-ink transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href="https://github.com/Burla-Cloud/burla"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-line bg-surface text-[13px] text-inkMuted hover:text-ink hover:border-lineBright transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 .5C5.7.5.7 5.5.7 11.8c0 5 3.3 9.3 7.8 10.8.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.6-.3-5.3-1.3-5.3-5.7 0-1.2.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.2 1.2.9-.3 1.9-.4 2.9-.4s2 .1 2.9.4c2.2-1.5 3.2-1.2 3.2-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6 4.5-1.5 7.8-5.8 7.8-10.8C23.3 5.5 18.3.5 12 .5z" />
            </svg>
            <span className="mono normal-case tracking-normal">
              github
            </span>
            <span className="mono text-inkSubtle tracking-normal">·</span>
            <span className="mono text-ink tracking-normal tnum">
              {formatStars(stars)}
            </span>
          </a>
          <a
            href="#system-prompt"
            className="hidden sm:inline-flex btn-primary text-[13px] py-2"
          >
            Get started
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-inkMuted hover:text-ink hover:border-lineBright transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden
            >
              {menuOpen ? (
                <>
                  <path d="M3.5 3.5l9 9" />
                  <path d="M12.5 3.5l-9 9" />
                </>
              ) : (
                <>
                  <path d="M2.5 4.5h11" />
                  <path d="M2.5 8h11" />
                  <path d="M2.5 11.5h11" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ${
          menuOpen
            ? "max-h-[440px] opacity-100"
            : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="container-x pb-6 pt-2 flex flex-col gap-1">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="py-3 text-[17px] font-medium text-ink border-b border-line"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#system-prompt"
            onClick={() => setMenuOpen(false)}
            className="btn-primary justify-center mt-4 text-[14px]"
          >
            Get started
          </a>
          <a
            href="https://github.com/Burla-Cloud/burla"
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenuOpen(false)}
            className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-line bg-surface text-[13px] text-inkMuted"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 .5C5.7.5.7 5.5.7 11.8c0 5 3.3 9.3 7.8 10.8.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.6-.3-5.3-1.3-5.3-5.7 0-1.2.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.2 1.2.9-.3 1.9-.4 2.9-.4s2 .1 2.9.4c2.2-1.5 3.2-1.2 3.2-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6 4.5-1.5 7.8-5.8 7.8-10.8C23.3 5.5 18.3.5 12 .5z" />
            </svg>
            <span className="mono normal-case tracking-normal">
              github · {formatStars(stars)}
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}
