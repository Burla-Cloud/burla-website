import { Canvas } from "@react-three/fiber";
import { Galaxy } from "../three/Galaxy";
import { ZoomRig } from "../three/ZoomRig";

const BACKGROUND = "#03080D";

type Props = {
  progress: { current: number };
  reducedMotion: boolean;
  active: boolean;
};

export function Scene({ progress, reducedMotion, active }: Props) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 1.3, 7], fov: 42, near: 0.1, far: 320 }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <Galaxy progress={progress} reducedMotion={reducedMotion} />
      <ZoomRig progress={progress} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
