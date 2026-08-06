import { Reveal } from "../components/Reveal";
import { Footer } from "../components/Footer";
import { SparseGalaxy } from "../components/SparseGalaxy";
import { TryCommands } from "../components/TryCommands";
import { FINALE } from "../content";

export function Finale() {
  return (
    <section className="relative pt-24 sm:pt-32">
      <div className="container-x grid items-center gap-8 md:grid-cols-[5fr_7fr] md:gap-10 lg:gap-16">
        <Reveal className="w-full">
          <div
            className="pointer-events-none relative mx-auto aspect-square w-full max-w-[24rem]"
            aria-hidden
          >
            <SparseGalaxy />
          </div>
        </Reveal>

        <div className="w-full text-left">
          <Reveal>
            <h2 className="text-[clamp(1.9rem,4.2vw,3.4rem)] font-[830] leading-[1.02] tracking-[-0.02em] text-ink">
              <span className="text-accent">{FINALE.headline[0]} </span>
              {FINALE.headline[1]}
            </h2>
            <p className="mt-6 max-w-[44ch] text-base leading-relaxed text-inkDim sm:text-lg">
              <span className="sm:block">{FINALE.sub[0]} </span>
              <span className="sm:block">{FINALE.sub[1]}</span>
            </p>
          </Reveal>

          <Reveal className="mt-8" y={20}>
            <TryCommands />
          </Reveal>
        </div>
      </div>

      <Footer />
    </section>
  );
}
