import { Reveal } from "../components/Reveal";
import { HeroDemo } from "../components/HeroDemo";
import { LINKS } from "../lib/links";

export function Hero() {
  return (
    <section id="top" className="relative bg-onyxGrad overflow-hidden flex items-center min-h-screen pt-28 pb-20 md:pt-24 md:pb-16 [@media(min-height:1180px)]:min-h-[820px] [@media(min-width:2200px)]:min-h-[820px]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,20,25,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(15,20,25,0.13) 1px, transparent 1px)",
            backgroundSize: "54px 54px",
            backgroundPosition: "-1px -1px",
            WebkitMaskImage:
              "radial-gradient(98% 132% at 100% 44%, #000 0%, #000 50%, rgba(0,0,0,0.34) 74%, transparent 93%)",
            maskImage:
              "radial-gradient(98% 132% at 100% 44%, #000 0%, #000 50%, rgba(0,0,0,0.34) 74%, transparent 93%)",
          }}
        />
      </div>
      <div className="container-x relative w-full">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 xl:gap-14 items-center">
          <div>
            <Reveal delay={60}>
              <h1 className="h-display text-balance">
                Scale Python to 1,000 VMs in your cloud in{" "}
                <span className="underline-accent">1 second</span>.
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="lead mt-6 max-w-[540px] text-pretty">
                Burla is an open-source compute platform for scaling Python
                applications. Run AI inference, vector embeddings, ML pipelines
                and more on thousands of VMs at once.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={LINKS.bookCall}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-[15px] px-6 py-3.5"
                >
                  Schedule a Pilot
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
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
                  href={LINKS.docs}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-[15px] px-6 py-3.5"
                >
                  Read the docs
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={180} y={18}>
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-4 rounded-[40px] opacity-95 blur-2xl"
                style={{
                  background: `
                    radial-gradient(40% 50% at 16% 6%, rgba(34,211,238,0.72), transparent 62%),
                    radial-gradient(44% 54% at 90% 12%, rgba(45,212,191,0.66), transparent 62%),
                    radial-gradient(50% 60% at 78% 98%, rgba(129,140,248,0.6), transparent 64%),
                    radial-gradient(40% 50% at 6% 94%, rgba(56,189,248,0.6), transparent 62%)
                  `,
                }}
              />
              <div className="relative z-10">
                <HeroDemo />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
