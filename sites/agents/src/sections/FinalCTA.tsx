import { Reveal } from "../components/Reveal";

export function FinalCTA() {
  return (
    <section
      id="final-cta"
      className="bg-onyx border-t border-line"
    >
      <div className="container-x py-14 md:py-16">
        <Reveal>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            <a href="#system-prompt" className="btn-primary">
              Copy the agent skill
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path
                  d="M3 8h10m0 0L9 4m4 4l-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            <a
              href="https://github.com/Burla-Cloud/burla"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              Star on GitHub
            </a>
            <a
              href="https://docs.burla.dev"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              Read the docs
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
