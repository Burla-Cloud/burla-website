import { Reveal } from "../components/Reveal";
import { CodeBlock } from "../components/CodeBlock";
import { useRepoStats } from "../lib/useRepoStats";

const INSTALL_CODE = `# Authenticate against your GCP project
gcloud auth login
gcloud auth application-default login

# Install the Burla control plane and a default node pool
pip install burla
burla install                       # idempotent; re-run to update
`;

const REPO_HTML = "https://github.com/Burla-Cloud/burla";

export function OpenSource() {
  return (
    <section id="self-host" className="section-tight bg-onyxDeep relative">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none mask-fade-y" />
      <div className="container-x relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-6">
            <Reveal>
              <div className="eyebrow mb-5">Open source · self-host</div>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h-section text-balance">
                Your cloud.
                <br />
                Your data.
                <br />
                <span className="text-accent">Your control.</span>
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="lead mt-7 max-w-[480px] text-pretty">
                One command drops the whole control plane inside your GCP
                project. Compliance teams love when data never leaves your
                own infrastructure.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a
                  href={REPO_HTML}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 .5C5.7.5.7 5.5.7 11.8c0 5 3.3 9.3 7.8 10.8.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.6-.3-5.3-1.3-5.3-5.7 0-1.2.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.2 1.2.9-.3 1.9-.4 2.9-.4s2 .1 2.9.4c2.2-1.5 3.2-1.2 3.2-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6 4.5-1.5 7.8-5.8 7.8-10.8C23.3 5.5 18.3.5 12 .5z" />
                  </svg>
                  Burla-Cloud/burla
                </a>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-6">
            <Reveal delay={120} y={20}>
              <div className="surface-elev overflow-hidden">
                <CodeBlock
                  code={INSTALL_CODE}
                  filename="install.sh"
                  language="bash"
                  variant="dark"
                  copy
                  className="rounded-none border-0 border-b border-line"
                />
                <RepoStats />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * RepoStats — uses the shared useRepoStats hook so the marketing page,
 * the nav, and any other consumer all see the same live numbers. Hardcoding
 * stars on a marketing page is exactly the kind of "fake numbers" trap
 * this section is meant to avoid.
 */
function RepoStats() {
  const { stars, forks } = useRepoStats();

  return (
    <div className="grid grid-cols-3 divide-x divide-line">
      <RepoStat
        label="stars"
        value={stars.toLocaleString()}
        href={`${REPO_HTML}/stargazers`}
      />
      <RepoStat
        label="license"
        value="open source"
        href={`${REPO_HTML}/blob/main/LICENSE`}
      />
      <RepoStat
        label="forks"
        value={forks.toLocaleString()}
        href={`${REPO_HTML}/network/members`}
      />
    </div>
  );
}

function RepoStat({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="stat-label">{label}</div>
      <div className="mono mt-2 text-ink text-[18px] tnum">{value}</div>
      {sub && (
        <div className="mono mt-1 text-[11px] text-inkSubtle">{sub}</div>
      )}
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="px-5 py-5 hover:bg-surfaceElev/60 transition-colors block"
      >
        {inner}
      </a>
    );
  }
  return <div className="px-5 py-5">{inner}</div>;
}
