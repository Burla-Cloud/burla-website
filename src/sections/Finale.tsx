import { Reveal } from "../components/Reveal";
import { Footer } from "../components/Footer";
import { FinaleGalaxy } from "../components/FinaleGalaxy";
import { TryCommands } from "../components/TryCommands";
import { FINALE } from "../content";

export function Finale() {
  return (
    <section className="relative pt-24 sm:pt-32">
      <div className="container-x grid items-center gap-8 md:grid-cols-[5fr_7fr] md:gap-10 lg:gap-16">
        <Reveal className="w-full">
          <div className="relative mx-auto aspect-square w-full max-w-[24rem]">
            <FinaleGalaxy />
          </div>
        </Reveal>

        <div className="w-full text-left">
          <Reveal>
            <h2 className="text-[clamp(1.75rem,8.4vw,2.35rem)] font-[830] leading-[0.96] tracking-[-0.02em] text-ink md:text-[clamp(1.9rem,4.2vw,3.4rem)]">
              <span className="block whitespace-nowrap text-accent">{FINALE.headline[0]} </span>
              <span className="block whitespace-nowrap">{FINALE.headline[1]}</span>
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
