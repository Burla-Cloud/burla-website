import { Link } from "react-router-dom";
import { Reveal } from "../components/Reveal";
import { Footer } from "../components/Footer";
import { PipInstall } from "../components/PipInstall";
import { FINALE, LINKS } from "../content";

export function Finale() {
  return (
    <section className="relative pt-24 sm:pt-32">
      <div className="container-x flex flex-col items-center text-center">
        <Reveal>
          <h2 className="h-mega text-accent">{FINALE.headline}</h2>
          <p className="mx-auto mt-7 text-lg leading-relaxed text-inkDim sm:text-xl">
            <span className="block">{FINALE.subLine1}</span>
            <span className="mt-1.5 block">
              {FINALE.subLine2.map((seg) =>
                seg.code ? (
                  <code
                    key={seg.text}
                    className="rounded-md border border-cyan/25 bg-panel/80 px-2 py-0.5 font-mono text-[0.82em] text-ice"
                  >
                    {seg.text}
                  </code>
                ) : (
                  <span key={seg.text}>{seg.text}</span>
                ),
              )}
            </span>
          </p>
        </Reveal>

        <Reveal className="mt-12" y={20}>
          <PipInstall size="mega" />
        </Reveal>

        <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a href={LINKS.github} target="_blank" rel="noreferrer" className="btn-primary">
            {FINALE.ctaGithub}
          </a>
          <Link to={LINKS.getStarted} className="btn-ghost">
            {FINALE.ctaDocs}
          </Link>
        </Reveal>
      </div>

      <div className="mt-40 sm:mt-52">
        <Footer />
      </div>
    </section>
  );
}
