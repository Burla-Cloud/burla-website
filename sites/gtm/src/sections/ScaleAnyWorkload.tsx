import { Reveal } from "../components/Reveal";
import { CodeBlock } from "../components/CodeBlock";
import { PipelineDiagram } from "../components/PipelineDiagram";

const PIPELINE_CODE = `remote_parallel_map(process,   [...], image="rocker/geospatial:latest")
remote_parallel_map(aggregate, [...], func_cpu=64)
remote_parallel_map(predict,   [...], func_gpu="A100")`;

export function ScaleAnyWorkload() {
  return (
    <section id="scale" className="section bg-band relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none mask-fade-y" />
      <div className="container-x relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-5">
            <Reveal>
              <div className="eyebrow mb-3">One function, any shape</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                Burla can scale any workload with a{" "}
                <span className="underline-accent">single function</span>.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="lead mt-5 text-pretty max-w-[440px]">
                Easily fan Python in and out across thousands of machines with
                varying sizes, types, and environments. Quickly develop
                pipelines that handle 100+ TB datasets, using simple code anyone
                can understand.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={180} y={16}>
              <p className="kicker mb-2.5 flex items-center gap-2">
                <span className="inline-grid h-5 w-5 place-items-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">
                  1
                </span>
                Write one function for each step
              </p>
              <CodeBlock code={PIPELINE_CODE} language="python" copy />
            </Reveal>

            {/* connector: code produces the pipeline below */}
            <Reveal delay={220}>
              <div aria-hidden className="flex justify-center py-3">
                <span className="inline-grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-inkSubtle shadow-card">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 4v15m0 0l-6-6m6 6l6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </Reveal>

            <Reveal delay={260} y={18}>
              <p className="kicker mb-2.5 flex items-center gap-2">
                <span className="inline-grid h-5 w-5 place-items-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent">
                  2
                </span>
                Burla fans it out into a pipeline
              </p>
              <PipelineDiagram />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
