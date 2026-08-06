import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { Galaxy } from "../three/Galaxy";

// A quieter disc than the hero's: fewer stars with a stronger radial falloff,
// so the rim fades out instead of ending abruptly, at full brightness. Shared
// by the finale call to action and the docs landing hero.
export function SparseGalaxy() {
  const descent = useRef(0);
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <Canvas
      className="!absolute inset-0"
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
      <Galaxy descent={descent} reducedMotion={reducedMotion} density={0.55} edgeFade={0.8} />
    </Canvas>
  );
}
