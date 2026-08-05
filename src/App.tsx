import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { Nav } from "./components/Nav";
import { Scene } from "./components/Scene";
import { HeroAct } from "./sections/HeroAct";
import { What } from "./sections/What";
import { Workloads } from "./sections/Workloads";
import { Laptop } from "./sections/Laptop";
import { Features } from "./sections/Features";
import { Finale } from "./sections/Finale";

export default function App() {
  // Page scroll in viewport heights. The camera descends through the scene
  // with it: the galaxy lifts out of frame, stars continue below.
  const descentRef = useRef(0);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    const update = () => {
      descentRef.current = Math.max(0, window.scrollY / window.innerHeight);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="grain relative bg-void text-ink">
      {/* One continuous scene behind the entire page. */}
      <div className="fixed inset-0 z-0" aria-hidden>
        <Scene descent={descentRef} reducedMotion={reduced} />
      </div>
      <Nav />
      <main className="relative z-10">
        <HeroAct />
        <What />
        <Laptop />
        <Features />
        <Workloads />
        <Finale />
      </main>
    </div>
  );
}
