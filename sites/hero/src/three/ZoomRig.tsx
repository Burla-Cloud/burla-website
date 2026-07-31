import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { clamp01, easeInOutCubic } from "../lib/easing";

type Props = {
  progress: { current: number };
  reducedMotion: boolean;
};

// Scroll-driven dolly: opens tight on the code line's point of light, pulls
// back and up until the whole galaxy is in frame. Mid-flight the camera gets
// an FOV punch and a slight roll so the pull-back feels like acceleration,
// then it settles into cursor parallax and a slow drift.
export function ZoomRig({ progress, reducedMotion }: Props) {
  const { camera, pointer } = useThree();

  const startPos = useMemo(() => new THREE.Vector3(0, 1.3, 7), []);
  const endPos = useMemo(() => new THREE.Vector3(0, 30, 66), []);
  const lookTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const desiredRef = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.position.copy(reducedMotion ? endPos : startPos);
    camera.lookAt(lookTarget);
  }, [camera, reducedMotion, startPos, endPos, lookTarget]);

  useFrame((state, delta) => {
    const p = reducedMotion ? 1 : progress.current;
    const t = easeInOutCubic(clamp01((p - 0.04) / 0.6));
    const desired = desiredRef.current;

    desired.lerpVectors(startPos, endPos, t);

    const settle = t * t;
    const time = state.clock.elapsedTime;
    desired.x += pointer.x * 3.2 * settle + Math.sin(time * 0.14) * 1.5 * settle;
    desired.y += pointer.y * 1.7 * settle + Math.cos(time * 0.11) * 0.8 * settle;

    const damp = 1 - Math.pow(0.001, delta);
    camera.position.lerp(desired, damp);
    camera.lookAt(lookTarget);

    // Mid-dolly kick: bump peaks at t=0.5 and vanishes at both ends.
    const bump = 4 * t * (1 - t);
    if (!reducedMotion) {
      camera.rotateZ(-0.06 * bump);
    }
    const cam = camera as THREE.PerspectiveCamera;
    const fov = 42 + 7 * bump * (reducedMotion ? 0 : 1);
    if (Math.abs(cam.fov - fov) > 0.01) {
      const focalLength =
        0.5 * cam.getFilmHeight() / Math.tan(THREE.MathUtils.degToRad(fov * 0.5));
      cam.setFocalLength(focalLength);
    }
  });

  return null;
}
