import { Canvas } from "@react-three/fiber";
import { Galaxy } from "../three/Galaxy";
import { DeepSpace } from "../three/DeepSpace";
import { ZoomRig } from "../three/ZoomRig";

const BACKGROUND = "#03080D";

type Props = {
  descent: { current: number };
  reducedMotion: boolean;
};

export function Scene({ descent, reducedMotion }: Props) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.75]}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        stencil: true,
      }}
      camera={{ position: [0, 30, 66], fov: 42, near: 0.1, far: 320 }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <Galaxy descent={descent} reducedMotion={reducedMotion} />
      <DeepSpace reducedMotion={reducedMotion} />
      <ZoomRig descent={descent} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
