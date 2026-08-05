import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { galaxyVertex, galaxyFragment } from "./shaders";
import { blobTexture } from "./textures";
import { clamp01 } from "../lib/easing";

export const GALAXY_RADIUS = 42;

const RADIUS = GALAXY_RADIUS;
const GALAXY_SCALE = 1.12;
const GALAXY_TILT_X = 0.1;
const GALAXY_ROLL_Z = 0.12;
const GALAXY_START_SPIN = 0.85;
const GALAXY_MASK_RADIUS = GALAXY_RADIUS * 1.15;
const ARMS = 3;
const COUNT_ARM = 15000;
const COUNT_CORE = 3000;
const COUNT_DUST = 7000;
const COUNT_FAR = 2600;
const COUNT = COUNT_ARM + COUNT_CORE + COUNT_DUST + COUNT_FAR;

const NEBULA_COUNT = 14;
const COMET_COUNT = 26;
// No postprocessing pass, so raw shader output is written straight to the
// sRGB framebuffer: author colors as plain hex.
const col = (hex: string) => new THREE.Color(hex);

const hash01 = (seed: number) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

const normal = (seed: number) =>
  hash01(seed) + hash01(seed + 1) + hash01(seed + 2) - 1.5;

type Props = {
  /** Page scroll in viewport heights; drives the galaxy's exit upward. */
  descent: { current: number };
  reducedMotion: boolean;
};

// Resting height of the disc: lifts the core to sit just above the viewport
// centre, roughly behind the middle of the hero headline.
export const GALAXY_BASE_Y = 5;

// World units the disc lifts per viewport of scroll. Combined with the camera
// dropping below it, the galaxy fully clears the frame within one screen.
export const GALAXY_LIFT_PER_VIEWPORT = 23;

// Extra disc rotation (radians) per viewport of scroll, so the exit reads as
// spin-and-lift rather than a straight upward slide.
const SCROLL_SPIN = 0.45;

/** Position on a spiral arm, shared by points and nebula blobs. */
function armPoint(r: number, arm: number, seed: number) {
  const spread = 0.42 / (0.35 + r * 0.045);
  const angle =
    arm * ((Math.PI * 2) / ARMS) + r * 0.145 + normal(seed) * spread;
  return {
    x: Math.cos(angle) * r + normal(seed + 4) * 1.1,
    y: normal(seed + 8) * (1.5 * Math.exp(-r / 16) + 0.32),
    z: Math.sin(angle) * r + normal(seed + 12) * 1.1,
  };
}

export function Galaxy({ descent, reducedMotion }: Props) {
  const groupRef = useRef<THREE.Group>(null!);
  const discRef = useRef<THREE.Group>(null!);
  const cometsRef = useRef<THREE.Group>(null!);
  const coreRef = useRef<THREE.Sprite>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const nebulaRefs = useRef<(THREE.Sprite | null)[]>([]);
  const spin = useRef(0);
  const cometSpin = useRef(0);

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const scales = new Float32Array(COUNT);
    const types = new Float32Array(COUNT);
    const orders = new Float32Array(COUNT);

    let i = 0;
    const push = (
      x: number,
      y: number,
      z: number,
      type: number,
      scale: number,
      order?: number,
    ) => {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      seeds[i] = hash01(i * 17 + 1);
      scales[i] = scale;
      types[i] = type;
      const r = Math.hypot(x, z);
      orders[i] =
        order ?? clamp01((r / RADIUS) * 0.72 + hash01(i * 17 + 5) * 0.3);
      i++;
    };

    // Core bulge: dense center, ignites first.
    for (let n = 0; n < COUNT_CORE; n++) {
      const seed = n * 23 + 100;
      const r = Math.abs(normal(seed)) * 3.6;
      const theta = hash01(seed + 4) * Math.PI * 2;
      push(
        Math.cos(theta) * r,
        normal(seed + 8) * 1.5 * Math.exp(-r / 4),
        Math.sin(theta) * r,
        0,
        0.8 + hash01(seed + 12) * 1.6,
      );
    }

    // Spiral arms: the "machines".
    for (let n = 0; n < COUNT_ARM; n++) {
      const seed = n * 29 + 80_000;
      const r = Math.pow(hash01(seed), 0.65) * RADIUS;
      const p = armPoint(r, n % ARMS, seed + 4);
      const hero = hash01(seed + 20) < 0.02;
      push(
        p.x,
        p.y,
        p.z,
        1,
        hero
          ? 2.4 + hash01(seed + 24) * 1.2
          : 0.6 + hash01(seed + 24) * hash01(seed + 28) * 1.4,
      );
    }

    // Dust halo for body.
    for (let n = 0; n < COUNT_DUST; n++) {
      const seed = n * 19 + 600_000;
      const r = Math.sqrt(hash01(seed)) * RADIUS * 1.3;
      const theta = hash01(seed + 4) * Math.PI * 2;
      push(
        Math.cos(theta) * r,
        normal(seed + 8) * (2.2 * Math.exp(-r / 20) + 0.5),
        Math.sin(theta) * r,
        2,
        0.5 + hash01(seed + 12) * 1.1,
      );
    }

    // Far starfield: faint specks way beyond the disc, for scale.
    for (let n = 0; n < COUNT_FAR; n++) {
      const seed = n * 31 + 800_000;
      const r = RADIUS * (1.1 + hash01(seed) * 3.0);
      const theta = hash01(seed + 4) * Math.PI * 2;
      push(
        Math.cos(theta) * r,
        normal(seed + 8) * 8,
        Math.sin(theta) * r,
        3,
        0.4 + hash01(seed + 12) * 0.5,
        hash01(seed + 16) * 0.35, // ignite early
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute("aType", new THREE.BufferAttribute(types, 1));
    geometry.setAttribute("aOrder", new THREE.BufferAttribute(orders, 1));

    const uniforms = {
      uTime: { value: 0 },
      // The disc is always fully lit; the ignition wave only ran in the old
      // scroll-zoom hero.
      uIgnite: { value: 1 },
      uPass: { value: 0 },
      uSize: { value: 2.7 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.75) },
      uCoreColor: { value: col("#EAF6FA") },
      uArmColor: { value: col("#7ECBDD") },
      uDustColor: { value: col("#2A7F96") },
      uEmberColor: { value: col("#183847") },
      uFlashColor: { value: col("#DDF8FF") },
    };

    return { geometry, uniforms };
  }, []);

  const texture = blobTexture();

  // Nebula ink washes scattered along the arms.
  const nebulae = useMemo(
    () =>
      Array.from({ length: NEBULA_COUNT }, (_, n) => {
        const seed = n * 37 + 900_000;
        const r = 8 + hash01(seed) * 26;
        const p = armPoint(r, n % ARMS, seed + 4);
        return {
          position: [p.x, p.y - 0.5, p.z] as const,
          scale: 10 + hash01(seed + 20) * 14,
          baseOpacity: 0.05 + hash01(seed + 24) * 0.07,
          color: n % 2 === 0 ? "#7ECBDD" : "#2A7F96",
        };
      }),
    [],
  );

  // Comet streaks: short orbital arcs in a faster-spinning group.
  const cometGeometry = useMemo(() => {
    const pts: number[] = [];
    for (let n = 0; n < COMET_COUNT; n++) {
      const seed = n * 41 + 950_000;
      const r = 12 + hash01(seed) * 26;
      const a0 = hash01(seed + 4) * Math.PI * 2;
      const span = 0.09 + hash01(seed + 8) * 0.09;
      const y = normal(seed + 12) * 1.2;
      pts.push(
        Math.cos(a0) * r, y, Math.sin(a0) * r,
        Math.cos(a0 - span) * r, y, Math.sin(a0 - span) * r,
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
    return geo;
  }, []);

  useFrame((state, delta) => {
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    // 0 while the galaxy owns the frame, 1 once the page has scrolled past it.
    const pass = clamp01(descent.current / 0.4);

    materialRef.current.uniforms.uTime.value = t;
    materialRef.current.uniforms.uPass.value = pass;

    // Scrolling lifts the disc up and out while the camera drops below it.
    groupRef.current.position.y =
      GALAXY_BASE_Y + descent.current * GALAXY_LIFT_PER_VIEWPORT;

    if (!reducedMotion) {
      spin.current += delta * 0.065;
      cometSpin.current += delta * 0.19;
    }
    // Spin the contents around the disc normal without changing its projected
    // tilt. Keeping orientation and spin separate prevents the screen-space
    // slope from reversing as the galaxy turns.
    discRef.current.rotation.y =
      GALAXY_START_SPIN + spin.current + descent.current * SCROLL_SPIN;
    cometsRef.current.rotation.y = cometSpin.current;

    nebulaRefs.current.forEach((sprite, n) => {
      if (!sprite) return;
      const base = nebulae[n].baseOpacity;
      (sprite.material as THREE.SpriteMaterial).opacity =
        base * (1 - pass) * (0.85 + 0.15 * Math.sin(t * 0.5 + n));
    });

    // Core flare, breathing slowly; retired along with the disc.
    const pulse = 0.92 + 0.08 * Math.sin(t * 2.1);
    const core = coreRef.current;
    (core.material as THREE.SpriteMaterial).opacity = 0.7 * pulse * 0.55 * (1 - pass);
    const s = 5.5 + 3.2 * pulse;
    core.scale.set(s, s, 1);
  });

  return (
    <group
      ref={groupRef}
      position={[0, GALAXY_BASE_Y, 0]}
      rotation={[GALAXY_TILT_X, 0, GALAXY_ROLL_Z]}
      scale={[GALAXY_SCALE, GALAXY_SCALE, GALAXY_SCALE]}
    >
      {/* Write the disc's real projected silhouette into stencil before any
          background stars render. The mask follows this group's exact tilt,
          scale, and scroll position, including while the camera passes below. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-100}
        frustumCulled={false}
      >
        <circleGeometry args={[GALAXY_MASK_RADIUS, 192]} />
        <meshBasicMaterial
          colorWrite={false}
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
          stencilWrite
          stencilRef={1}
          stencilFunc={THREE.AlwaysStencilFunc}
          stencilZPass={THREE.ReplaceStencilOp}
        />
      </mesh>

      <group ref={discRef} rotation={[0, GALAXY_START_SPIN, 0]}>
        <points geometry={geometry} frustumCulled={false}>
          <shaderMaterial
            ref={materialRef}
            vertexShader={galaxyVertex}
            fragmentShader={galaxyFragment}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>

        {nebulae.map((n, idx) => (
          <sprite
            key={idx}
            position={[n.position[0], n.position[1], n.position[2]]}
            scale={[n.scale, n.scale, 1]}
            ref={(el) => {
              nebulaRefs.current[idx] = el;
            }}
          >
            <spriteMaterial
              map={texture}
              color={n.color}
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        ))}

        <group ref={cometsRef}>
          <lineSegments geometry={cometGeometry}>
            <lineBasicMaterial
              color="#7ECBDD"
              transparent
              opacity={0.62}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </lineSegments>
        </group>

        <sprite ref={coreRef}>
          <spriteMaterial
            map={texture}
            color="#7ECBDD"
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      </group>
    </group>
  );
}
