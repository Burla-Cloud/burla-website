import { motion, useScroll } from "framer-motion";
import { NAV } from "../content";
import { PipInstall } from "./PipInstall";

export function Nav() {
  const { scrollYProgress } = useScroll();

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      {/* Page scroll progress hairline */}
      <motion.div
        className="h-[2px] origin-left bg-accent"
        style={{ scaleX: scrollYProgress }}
      />
      <div className="bg-gradient-to-b from-void via-void/60 to-transparent">
        <div className="flex items-center justify-between px-6 py-4 sm:px-10">
          <a
            href="#top"
            className="text-shadow-soft font-display text-xl font-extrabold lowercase tracking-tight text-ink"
          >
            {NAV.wordmark}
          </a>
          <div className="flex items-center gap-6">
            <nav className="hidden items-center gap-6 sm:flex">
              {NAV.links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[13px] text-inkDim transition-colors hover:text-ink"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <PipInstall size="chip" className="hidden sm:inline-flex" />
          </div>
        </div>
      </div>
    </header>
  );
}
