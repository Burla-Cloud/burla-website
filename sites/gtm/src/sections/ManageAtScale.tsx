import { Reveal } from "../components/Reveal";
import { BurlaDashboard } from "../components/BurlaDashboard";

export function ManageAtScale() {
  return (
    <section id="manage" className="section bg-surface relative overflow-hidden border-t border-line">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none mask-fade-y" />
      <div className="container-x relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
          <div className="lg:col-span-6">
            <Reveal>
              <div className="eyebrow mb-3">The dashboard</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                Everything you need to manage Python{" "}
                <span className="underline-accent">at scale</span>.
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-6 lg:pt-2">
            <Reveal delay={140}>
              <p className="lead text-pretty max-w-[520px]">
                Monitor your analysis, pipeline, or background job from your
                phone. Burla has all the features you need to closely manage
                logs, output files, and available compute.
              </p>
            </Reveal>
          </div>
        </div>

        <Reveal delay={180} y={18}>
          <div className="mt-12 md:mt-16 mx-auto max-w-[980px]">
            <div
              className="relative rounded-[26px] p-4 sm:p-5 md:p-7 shadow-[0_50px_110px_-30px_rgba(15,20,25,0.4)]"
              style={{
                background: `
                  radial-gradient(78% 110% at 5% 0%, #34D399 0%, rgba(52,211,153,0) 55%),
                  radial-gradient(72% 110% at 100% 3%, #FB923C 0%, rgba(251,146,60,0) 55%),
                  radial-gradient(88% 120% at 100% 100%, #EC4899 0%, rgba(236,72,153,0) 58%),
                  radial-gradient(82% 120% at 0% 92%, #FB7185 0%, rgba(251,113,133,0) 55%),
                  radial-gradient(58% 80% at 32% 48%, #FCD34D 0%, rgba(252,211,77,0) 60%),
                  linear-gradient(135deg, #2DD4BF 0%, #F472B6 100%)
                `,
              }}
            >
              <BurlaDashboard />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
