import { Reveal } from "../components/Reveal";
import { EXAMPLES } from "../content";

export function Examples() {
  return (
    <section className="relative bg-void py-32 sm:py-40">
      <div className="container-x">
        <Reveal>
          <p className="eyebrow mb-5">{EXAMPLES.eyebrow}</p>
          <h2 className="h-mega">
            <span className="block text-ink">{EXAMPLES.headline[0]}</span>
            <span className="block text-outline">{EXAMPLES.headline[1]}</span>
          </h2>
          <p className="lead mt-6 max-w-2xl">{EXAMPLES.sub}</p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.items.map((item, i) => (
            <Reveal key={item.href} delay={(i % 3) * 60} y={18}>
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="group flex aspect-[4/3] flex-col justify-between rounded-2xl border border-hairline bg-panel/50 p-6 transition-colors duration-200 hover:border-accent/70 hover:bg-panel sm:aspect-square"
                style={{ boxShadow: "0 18px 50px -28px rgba(0,0,0,0.7)" }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-eyebrow text-inkFaint">
                    {item.tag}
                  </span>
                  <span
                    aria-hidden
                    className="font-mono text-[15px] text-inkFaint transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                  >
                    ↗
                  </span>
                </div>

                <div>
                  <div className="tnum font-display text-[clamp(2.5rem,4.6vw,3.5rem)] font-extrabold leading-none tracking-tight text-accent">
                    {item.stat}
                  </div>
                  <div className="mt-3 max-w-[24ch] font-display text-lg font-bold leading-snug tracking-tight text-ink sm:text-xl">
                    {item.title}
                  </div>
                </div>

                <div className="font-mono text-[11px] uppercase tracking-eyebrow text-inkFaint transition-colors group-hover:text-ink/80">
                  read the code
                </div>
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 flex justify-center">
          <a
            href={EXAMPLES.moreHref}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            {EXAMPLES.moreLabel}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
