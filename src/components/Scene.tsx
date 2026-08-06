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

// Half-height of the frustum at the corridor's far plane, plus room for the
// camera's cursor parallax and drift. Without the galaxy overhead, the star
// field has to reach at least this high or the top of the first screen is bare.
const STARS_ABOVE_CAMERA = 84;

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
      <DeepSpace
        reducedMotion={reducedMotion}
        showNebulae={galaxy}
        topY={galaxy ? undefined : STARS_ABOVE_CAMERA}
      />
      <ZoomRig
        descent={descent}
        reducedMotion={reducedMotion}
        baseY={cameraY}
      />
    </Canvas>
  );
}
