import { Reveal } from "../components/Reveal";
import {
  AgentTerminal,
  ApiDemo,
  DashboardDemo,
  SpeedTerminal,
} from "../components/ProductDemos";
import { WHAT } from "../content";
import type { ReactNode } from "react";

type Feature = (typeof WHAT.features)[keyof typeof WHAT.features];

// Backtick-wrapped tokens in copy strings render as inline code, same chip
// styling as the finale's pip-install line.
function renderCopy(copy: string) {
  return copy.split("`").map((part, i) =>
    i % 2 === 1 ? (
      <code
        key={i}
        className="rounded-md border border-cyan/25 bg-panel/80 px-1.5 py-0.5 font-mono text-[0.82em] text-ice"
      >
        {part}
      </code>
    ) : (
      part
    ),
  );
}

function FeatureCard({ feature, demo }: { feature: Feature; demo: ReactNode }) {
  return (
    <article>
      <Reveal y={16}>{demo}</Reveal>
      <Reveal className="mt-6" delay={50} y={12}>
        <h2 className="font-display text-[clamp(1.65rem,2.4vw,2rem)] font-medium leading-[1.15] tracking-[-0.02em] text-ink">
          {feature.title}
        </h2>
        <p className="mt-3 max-w-[54ch] text-[15px] leading-6 text-inkDim sm:text-base">
          {renderCopy(feature.copy)}
        </p>
      </Reveal>
    </article>
  );
}

export function What() {
  const { api, speed, agents, observability } = WHAT.features;

  // Top padding tunes the hero handoff; the slightly shorter desktop bottom
  // padding tightens only the handoff to the Laptop section.
  return (
    <section id="what" className="relative pb-24 pt-24 sm:pb-28 sm:pt-28">
      <div className="container-x">
        <Reveal className="mb-14 sm:mb-20">
          <h2 className="h-big max-w-4xl text-ink">
            {WHAT.heading[0]} <span className="text-accent">{WHAT.heading[1]}</span>
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-x-5 gap-y-20 lg:grid-cols-2 lg:gap-y-24">
          <FeatureCard feature={api} demo={<ApiDemo />} />
          <FeatureCard feature={speed} demo={<SpeedTerminal />} />
          <FeatureCard feature={agents} demo={<AgentTerminal />} />
          <FeatureCard feature={observability} demo={<DashboardDemo />} />
        </div>
      </div>
    </section>
  );
}
