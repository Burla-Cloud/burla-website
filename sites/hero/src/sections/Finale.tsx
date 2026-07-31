import { Reveal } from "../components/Reveal";
import { PipInstall } from "../components/PipInstall";
import { FINALE, FOOTER, LINKS } from "../content";

export function Finale() {
  return (
    <section className="relative bg-void pt-36 sm:pt-48">
      <div className="container-x flex flex-col items-center text-center">
        <Reveal>
          <h2 className="h-mega">
            <span className="block text-outline">{FINALE.headline[0]}</span>
            <span className="block text-accent">{FINALE.headline[1]}</span>
          </h2>
          <p className="mt-6 font-mono text-[13px] uppercase tracking-eyebrow text-inkDim">
            {FINALE.sub}
          </p>
        </Reveal>

        <Reveal className="mt-12" y={20}>
          <PipInstall size="mega" />
        </Reveal>

        <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a href={LINKS.github} target="_blank" rel="noreferrer" className="btn-primary">
            {FINALE.ctaGithub}
          </a>
          <a href={LINKS.docs} target="_blank" rel="noreferrer" className="btn-ghost">
            {FINALE.ctaDocs}
          </a>
        </Reveal>
      </div>

      <footer className="mt-32 border-t border-hairline">
        <div className="container-x flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <span className="font-mono text-[12px] text-inkFaint">{FOOTER.line}</span>
          <div className="flex items-center gap-6">
            {FOOTER.links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[12px] text-inkDim transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </section>
  );
}
