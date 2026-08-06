import { Canvas } from "@react-three/fiber";
import { Galaxy } from "../three/Galaxy";
import { DeepSpace } from "../three/DeepSpace";
import { ZoomRig } from "../three/ZoomRig";

const BACKGROUND = "#03080D";

type Props = {
  descent: { current: number };
  reducedMotion: boolean;
  galaxy?: boolean;
};

export function Scene({ descent, reducedMotion, galaxy = true }: Props) {
  const cameraY = galaxy ? 30 : 0;

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.75]}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        stencil: true,
      }}
      camera={{ position: [0, cameraY, 66], fov: 42, near: 0.1, far: 320 }}
    >
      <color attach="background" args={[BACKGROUND]} />
      {galaxy && <Galaxy descent={descent} reducedMotion={reducedMotion} />}
      <DeepSpace reducedMotion={reducedMotion} showNebulae={galaxy} />
      <ZoomRig
        descent={descent}
        reducedMotion={reducedMotion}
        baseY={cameraY}
      />
    </Canvas>
  );
}
