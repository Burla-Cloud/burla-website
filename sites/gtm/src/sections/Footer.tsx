import { Logo } from "../components/Logo";
import { LINKS } from "../lib/links";

const COLS = [
  {
    heading: "Product",
    links: [
      { label: "Docs", href: LINKS.docs, external: true },
      { label: "GitHub", href: LINKS.github, external: true },
      { label: "Blog", href: LINKS.blog, external: true },
      { label: "burla.dev", href: LINKS.site, external: true },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: LINKS.about, external: true },
      { label: "Book a call", href: LINKS.bookCall, external: true },
      { label: "Email us", href: LINKS.email, external: true },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Dynamic Hardware", href: LINKS.dynamicHardware, external: true },
      { label: "Issues", href: LINKS.github + "/issues", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-surface border-t border-line">
      <div className="container-x py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <Logo size={32} />
            <p className="lead mt-6 max-w-[360px] text-pretty">
              Dynamic hardware utilization software for large data pipelines.
              Make every VM in your cluster work, on the cloud you already have.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={LINKS.github}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                GitHub
              </a>
              <a
                href={LINKS.bookCall}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                Book a call
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {COLS.map((col) => (
              <div key={col.heading}>
                <div className="eyebrow mb-4">{col.heading}</div>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[14px] text-inkMuted hover:text-ink transition-colors"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-7 border-t border-line flex flex-wrap items-center justify-between gap-3 text-[12px] text-inkSubtle">
          <div className="mono">© 2026 Burla · Open source · No tracking on this page</div>
        </div>
      </div>
    </footer>
  );
}
