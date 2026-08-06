import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { Galaxy } from "../three/Galaxy";

export function FinaleGalaxy() {
  const descent = useRef(0);
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        frameloop={reducedMotion ? "demand" : "always"}
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: "high-performance",
          stencil: true,
        }}
        camera={{ position: [0, 50, 190], fov: 40, near: 0.1, far: 320 }}
      >
        {/* Sparser than the hero, with stronger radial falloff so the rim
            fades out; full brightness is kept in the core. */}
        <Galaxy descent={descent} reducedMotion={reducedMotion} density={0.55} edgeFade={0.8} />
      </Canvas>
    </div>
  );
}
