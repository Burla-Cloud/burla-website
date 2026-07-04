import { Logo } from "../components/Logo";

const COLS = [
  {
    heading: "Product",
    links: [
      { label: "Docs", href: "https://docs.burla.dev" },
      { label: "GitHub", href: "https://github.com/Burla-Cloud/burla" },
      { label: "Blog", href: "https://burla.dev/blog" },
      { label: "Examples", href: "https://github.com/Burla-Cloud/examples" },
    ],
  },
  {
    heading: "For agents",
    links: [
      { label: "Agent skill", href: "#system-prompt" },
      { label: "llms-full.txt", href: "https://docs.burla.dev/llms-full.txt" },
      { label: "sitemap.md", href: "https://docs.burla.dev/sitemap.md" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Dynamic Hardware", href: "https://burla.dev/blog/dynamic-hardware" },
      { label: "FAQ", href: "#faq" },
      {
        label: "Issues",
        href: "https://github.com/Burla-Cloud/burla/issues",
      },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-onyxDeep border-t border-line">
      <div className="container-x py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <Logo size={32} />
            <p className="lead mt-6 max-w-[360px] text-pretty">
              The open-source compute platform you give to your AI agent so
              it can do real work at real scale.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="https://github.com/Burla-Cloud/burla"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                GitHub
              </a>
              <a href="#system-prompt" className="btn-primary">
                Get the agent skill
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
                        target={
                          l.href.startsWith("http") ? "_blank" : undefined
                        }
                        rel={
                          l.href.startsWith("http")
                            ? "noreferrer"
                            : undefined
                        }
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
          <div className="mono">
            © 2026 Burla · Open source · No tracking on this page
          </div>
        </div>
      </div>
    </footer>
  );
}
