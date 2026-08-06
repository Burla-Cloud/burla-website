import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

type Props = {
  /** Page scroll in viewport heights; slides the view downward. */
  descent: { current: number };
  reducedMotion: boolean;
  baseY?: number;
};

// World units the camera drops per viewport of scroll.
export const DROP_PER_VIEWPORT = 16;

// The camera holds the wide framing of the galaxy, with cursor parallax and a
// slow drift. Scrolling translates camera and look target straight down
// together (while the galaxy itself lifts away), so the page descends through
// open space.
export function ZoomRig({ descent, reducedMotion, baseY = 30 }: Props) {
  const { camera, pointer } = useThree();

  const basePos = useMemo(() => new THREE.Vector3(0, baseY, 66), [baseY]);
  const desiredRef = useRef(new THREE.Vector3());
  const lookRef = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.position.copy(basePos);
    camera.lookAt(0, 0, 0);
  }, [camera, basePos]);

  useFrame((state, delta) => {
    const drop = descent.current * DROP_PER_VIEWPORT;
    const desired = desiredRef.current;

    desired.copy(basePos);
    desired.y -= drop;

    if (!reducedMotion) {
      const time = state.clock.elapsedTime;
      desired.x += pointer.x * 3.2 + Math.sin(time * 0.14) * 1.5;
      desired.y += pointer.y * 1.7 + Math.cos(time * 0.11) * 0.8;
    }

    const damp = 1 - Math.pow(0.001, delta);
    camera.position.lerp(desired, damp);
    lookRef.current.set(0, -drop, 0);
    camera.lookAt(lookRef.current);
  });

  return null;
}
