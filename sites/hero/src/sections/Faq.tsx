import { Reveal } from "../components/Reveal";
import { FAQ } from "../content";

export function Faq() {
  return (
    <section className="relative py-32 sm:py-36">
      <div className="container-x mx-auto max-w-3xl">
        <Reveal>
          <p className="eyebrow mb-5">{FAQ.eyebrow}</p>
          <h2 className="h-big text-ink">{FAQ.headline}</h2>
        </Reveal>

        <div className="mt-12">
          {FAQ.items.map((item, i) => (
            <Reveal key={item.q} delay={i * 50}>
              <details className="group border-t border-hairline">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-lg font-bold tracking-tight text-ink transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="select-none font-mono text-xl font-medium text-accent transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-6 pr-10 text-[15px] leading-relaxed text-inkDim">{item.a}</p>
              </details>
            </Reveal>
          ))}
          <div className="border-t border-hairline" />
        </div>
      </div>
    </section>
  );
}
