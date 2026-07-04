import { Reveal } from "../components/Reveal";

interface Row {
  topic: string;
  without: string;
  with: string;
  withAccent?: string;
}

const ROWS: Row[] = [
  {
    topic: "Cluster setup",
    without: "Write YAML. Configure IAM. Manage K8s.",
    with: "One pip install.",
    withAccent: "pip install",
  },
  {
    topic: "API surface",
    without: "Dozens of primitives and decorators.",
    with: "One function.",
    withAccent: "remote_parallel_map",
  },
  {
    topic: "Resource sizing",
    without: "Guess CPU, RAM, worker count up front.",
    with: 'func_ram="dynamic". Burla sizes itself.',
    withAccent: 'func_ram="dynamic"',
  },
  {
    topic: "When something fails",
    without: "Read logs across a hundred pods.",
    with: "Python traceback, locally, with the input.",
    withAccent: "locally",
  },
];

export function MentalModel() {
  return (
    <section id="mental-model" className="section-tight bg-cream text-creamInk">
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 md:mb-16 items-start">
          <div className="lg:col-span-7">
            <Reveal>
              <div className="eyebrow-on-cream mb-5">What gets simpler</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section-cream text-balance">
                What your agent stops{" "}
                <em className="not-italic underline-accent">thinking about</em>.
              </h2>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={140}>
              <p className="lead-cream text-pretty max-w-[460px]">
                Adaptive infrastructure means fewer tokens and less compute
                for the same output. Burla handles the infrastructure
                decisions, so the agent writes the function, ships it, and
                moves on.
              </p>
            </Reveal>
          </div>
        </div>

        <Reveal delay={100} y={20}>
          <div className="surface-cream-deep overflow-hidden">
            <table className="w-full text-left table-fixed">
              <thead>
                <tr>
                  <th className="w-[26%] eyebrow-on-cream pl-6 pr-3 py-5 border-b border-creamLine">
                    The thing
                  </th>
                  <th className="w-[34%] eyebrow-on-cream px-3 py-5 border-b border-creamLine">
                    Without Burla
                  </th>
                  <th className="w-[40%] eyebrow-on-cream pl-3 pr-6 py-5 border-b border-creamLine">
                    With Burla
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr
                    key={r.topic}
                    className={
                      i === ROWS.length - 1
                        ? ""
                        : "border-b border-creamLine/70"
                    }
                  >
                    <td className="align-middle pl-6 pr-3 py-6 md:py-7">
                      <span className="font-display font-medium text-[17px] md:text-[19px] tracking-tighter2 text-creamInk leading-tight">
                        {r.topic}
                      </span>
                    </td>
                    <td className="align-middle px-3 py-6 md:py-7">
                      <span className="text-creamMuted text-[14.5px] md:text-[15.5px] leading-snug">
                        {r.without}
                      </span>
                    </td>
                    <td className="align-middle pl-3 pr-6 py-6 md:py-7">
                      <WithCell text={r.with} accent={r.withAccent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

      </div>
    </section>
  );
}

function WithCell({ text, accent }: { text: string; accent?: string }) {
  const baseCls =
    "text-creamInk text-[14.5px] md:text-[15.5px] leading-snug";
  if (!accent) {
    return <span className={baseCls}>{text}</span>;
  }
  const idx = text.indexOf(accent);
  if (idx === -1) {
    return <span className={baseCls}>{text}</span>;
  }
  return (
    <span className={baseCls}>
      {text.slice(0, idx)}
      <span className="mono text-creamInk font-semibold underline decoration-2 decoration-accent underline-offset-[6px]">
        {accent}
      </span>
      {text.slice(idx + accent.length)}
    </span>
  );
}
