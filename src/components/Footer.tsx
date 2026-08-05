import { Link } from "react-router-dom";
import { BrandLockup } from "./BrandLockup";
import { FOOTER } from "../content";

// The site-wide footer, shared by the landing page finale and the docs pages.
export function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="container-x pb-8 pt-14">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <BrandLockup />
            <p className="mt-4 max-w-[30ch] text-[13px] leading-relaxed text-inkFaint">
              The simplest way to scale Python
            </p>
            <p className="mt-8 font-mono text-[11px] uppercase tracking-eyebrow text-inkFaint">
              {FOOTER.backedBy.label}
            </p>
            <div className="mt-4 flex items-center gap-7">
              {FOOTER.backedBy.logos.map((logo) => (
                <a
                  key={logo.alt}
                  href={logo.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center opacity-50 transition-opacity hover:opacity-90"
                >
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    className={`${logo.h} w-auto`}
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>
          {FOOTER.columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-mono text-[11px] uppercase tracking-eyebrow text-inkFaint">
                {col.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {/* Docs links are SPA routes; /privacy/ and /terms/ are
                        static HTML in public/ and need a real navigation. */}
                    {l.href.startsWith("/docs") ? (
                      <Link
                        to={l.href}
                        className="inline-flex min-h-11 items-center text-[13px] text-inkDim transition-colors hover:text-ink"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        target={l.href.startsWith("http") ? "_blank" : undefined}
                        rel={l.href.startsWith("http") ? "noreferrer" : undefined}
                        className="inline-flex min-h-11 items-center text-[13px] text-inkDim transition-colors hover:text-ink"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 border-t border-hairline pt-6">
          <span className="font-mono text-[11px] text-inkFaint">{FOOTER.copyright}</span>
        </div>
      </div>
    </footer>
  );
}
