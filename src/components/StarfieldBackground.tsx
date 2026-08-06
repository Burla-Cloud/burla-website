import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { Scene } from "./Scene";

export function StarfieldBackground({ galaxy = false }: { galaxy?: boolean }) {
  const descentRef = useRef(0);
  const reducedMotion = useReducedMotion() ?? false;

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
    <div className="fixed inset-0 z-0" aria-hidden>
      <Scene
        descent={descentRef}
        reducedMotion={reducedMotion}
        galaxy={galaxy}
      />
    </div>
  );
}
