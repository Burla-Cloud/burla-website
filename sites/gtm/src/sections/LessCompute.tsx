import { Reveal } from "../components/Reveal";
import { UtilizationCharts } from "../components/UtilizationCharts";
import { LINKS } from "../lib/links";

export function LessCompute() {
  return (
    <section id="efficiency" className="section bg-surface relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none mask-fade-y" />
      <div className="container-x relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-5 lg:order-2 max-w-[460px]">
            <Reveal>
              <div className="eyebrow mb-4">Efficiency</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                With Burla, the same jobs use{" "}
                <span className="underline-accent">50% less compute</span>.
              </h2>
            </Reveal>
            <div className="mt-6 space-y-4">
              <Reveal delay={140}>
                <p className="lead text-pretty">
                  Compared to software like Ray, Dask, or AWS Batch, workloads
                  running on Burla require less total compute because they
                  automatically stay close to 90% CPU/RAM utilization for the
                  entire job.
                </p>
              </Reveal>
              <Reveal delay={180}>
                <p className="body-base text-pretty">
                  This is achieved with adaptive concurrency and horizontal
                  autoscaling. Burla rearranges work during runtime to fill
                  excess capacity.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <p className="body-base text-pretty">
                  This system frequently more than doubles compute efficiency,
                  and eliminates out of memory errors.{" "}
                  <a
                    href={LINKS.blog}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-accent text-ink hover:text-accent transition-colors"
                  >
                    Read our blog
                  </a>{" "}
                  to learn how it works.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="lg:col-span-7 lg:order-1">
            <Reveal delay={220} y={16}>
              <UtilizationCharts />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
