import { Link } from "react-router-dom";
import { Reveal } from "../components/Reveal";
import { FEATURES } from "../content";

// Rows carry no separator lines; spacing groups each label with its bar and
// the slim track supplies the only horizontal geometry.
function CompareBar({
  name,
  amount,
  pct,
  highlight,
}: {
  name: string;
  amount: string;
  pct: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-x-6">
        <p
          className={`min-w-0 text-[15px] font-medium leading-6 ${
            highlight ? "text-accent" : "text-inkDim"
          }`}
        >
          {name}
        </p>
        <span
          className={`tnum shrink-0 font-display text-lg font-medium tracking-[-0.015em] ${
            highlight ? "text-accent" : "text-ink"
          }`}
        >
          {amount}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.09]">
        <div
          className={`h-full rounded-full ${highlight ? "bg-accent" : "bg-white/35"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Features() {
  const { compare } = FEATURES;
  const maxValue = Math.max(...compare.bars.map((bar) => bar.value));

  return (
    <section id="efficiency" className="relative pb-24 pt-24 sm:pb-28 sm:pt-32">
      <div className="container-x">
        {/* Same h-big scale as the neighbouring sections. */}
        <Reveal>
          <h2 className="h-big max-w-4xl text-ink">
            <span className="block text-accent">{FEATURES.headline[0]}</span>
            <span className="block">{FEATURES.headline[1]}</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-y-12 sm:mt-14 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-x-16 xl:gap-x-20">
          <Reveal delay={60} y={14}>
            <p className="max-w-[40ch] text-pretty text-[17px] leading-[1.65] text-inkDim sm:text-lg">
              {FEATURES.lede}
            </p>
            <Link
              to={FEATURES.blog.href}
              className="group mt-6 inline-flex min-h-11 items-center gap-2 border-b border-accent/45 text-[15px] font-medium text-accent transition-colors duration-200 hover:border-accent hover:text-ink"
            >
              {FEATURES.blog.label}
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          </Reveal>

          <Reveal y={20} delay={80}>
            <figure>
              <figcaption className="pb-7">
                <h3 className="font-display text-xl font-medium tracking-[-0.02em] text-ink">
                  {compare.title}
                </h3>
              </figcaption>
              <div className="space-y-7">
                {compare.bars.map((bar, i) => (
                  <CompareBar
                    key={bar.name}
                    name={bar.name}
                    amount={bar.amount}
                    pct={(bar.value / maxValue) * 100}
                    highlight={i === compare.bars.length - 1}
                  />
                ))}
              </div>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
