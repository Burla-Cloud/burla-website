import { TryCommands } from "../components/TryCommands";
import { HERO } from "../content";

// Act I. One screen: the brand statement in front of the fully-lit galaxy.
// Scrolling on lifts the galaxy up and out of frame (driven by the descent ref
// in App) so the content sections below sit over quiet deep space, not the disc.
export function HeroAct() {
  return (
    <section id="top" className="relative h-svh">
      {/* Nav legibility only; ends transparent so there is no seam where the
          hero hands off to the sections below. */}
      <div className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-b from-void/60 via-transparent to-transparent" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
        {/* Local scrim so copy stays readable over the dense galaxy core */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_54%_at_50%_50%,rgba(3,8,13,0.8),rgba(3,8,13,0.42)_58%,rgba(3,8,13,0)_80%)]"
        />
        <div className="relative">
          <h1 className="h-mega text-shadow-soft">
            <span className="block text-[0.42em] leading-[1.05] text-ink">
              {HERO.statement[0]}
            </span>
            <span className="block uppercase text-accent">{HERO.statement[1]}</span>
            <span className="block text-[0.42em] leading-[1.05] text-ink">
              {HERO.statement[2]}
            </span>
          </h1>
          <p
            className="mx-auto mt-7 max-w-2xl whitespace-pre-line text-pretty text-base leading-relaxed text-ink/90 sm:text-lg"
            style={{ textShadow: "0 2px 3px rgba(0,0,0,0.95), 0 0 22px rgba(3,8,13,0.98)" }}
          >
            {HERO.sub}
          </p>
          <div className="mt-9 flex justify-center">
            <TryCommands />
          </div>
        </div>
      </div>

    </section>
  );
}
