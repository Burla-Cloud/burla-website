import { Reveal } from "../components/Reveal";
import { PipInstall } from "../components/PipInstall";
import { WHAT } from "../content";

export function What() {
  return (
    <section className="relative bg-void pt-32 pb-28 sm:pt-40">
      <div className="container-x">
        <Reveal>
          <p className="eyebrow mb-5">{WHAT.eyebrow}</p>
          <h2 className="h-mega">
            <span className="block text-ink">{WHAT.headline[0]}</span>
            <span className="block text-accent">{WHAT.headline[1]}</span>
          </h2>
          <p className="lead mt-7 max-w-2xl text-pretty">{WHAT.lead}</p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-20">
          {/* The product, literally: the setup and the API */}
          <div>
            <Reveal>
              <p className="mb-4 font-mono text-[13px] uppercase tracking-eyebrow text-inkFaint">
                {WHAT.setupLabel}
              </p>
              <PipInstall size="big" />
            </Reveal>

            <Reveal className="mt-10">
              <p className="mb-4 font-mono text-[13px] uppercase tracking-eyebrow text-inkFaint">
                {WHAT.apiLabel}
              </p>
              <div
                className="rounded-2xl border border-hairline bg-panel px-6 py-6 sm:px-8"
                style={{ boxShadow: "0 22px 60px -24px rgba(0,0,0,0.78)" }}
              >
                <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed text-ice">
                  <code>
                    <span className="text-cyan/75">from</span> burla{" "}
                    <span className="text-cyan/75">import</span> remote_parallel_map
                    {"\n\n"}
                    results = <span className="text-cyan">remote_parallel_map</span>
                    (my_function, my_inputs)
                  </code>
                </pre>
              </div>
            </Reveal>

            <Reveal className="mt-8 flex flex-wrap gap-3">
              {WHAT.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-hairline px-4 py-1.5 font-mono text-[12px] text-inkDim"
                >
                  {chip}
                </span>
              ))}
            </Reveal>
          </div>

          {/* How it works, in four steps */}
          <div>
            <Reveal>
              <p className="mb-4 font-mono text-[13px] uppercase tracking-eyebrow text-inkFaint">
                {WHAT.stepsLabel}
              </p>
            </Reveal>
            {WHAT.steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 70}>
                <div className="grid grid-cols-[auto_1fr] gap-x-6 border-t border-hairline py-6 sm:gap-x-8">
                  <span className="pt-1 font-mono text-sm text-accent">
                    0{i + 1}
                  </span>
                  <div>
                    <div className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
                      {step.title}
                    </div>
                    <p className="mt-2 text-[15px] leading-relaxed text-inkDim">
                      {step.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
            <div className="border-t border-hairline" />
          </div>
        </div>
      </div>
    </section>
  );
}
