import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { Galaxy } from "../three/Galaxy";

// The docs hero disc: same soft rim as the landing finale, but denser, since it
// renders much larger here and carries the page on its own. Default export so
// the docs landing can lazy-load three.js on its own chunk.
export default function DocsGalaxy() {
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
      <Galaxy descent={descent} reducedMotion={reducedMotion} density={0.72} edgeFade={0.8} />
    </Canvas>
  );
}
