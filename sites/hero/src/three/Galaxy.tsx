import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { galaxyVertex, galaxyFragment } from "./shaders";
import { clamp01, smoothstep } from "../lib/easing";

const RADIUS = 42;
const ARMS = 3;
const COUNT_ARM = 15000;
const COUNT_CORE = 3000;
const COUNT_DUST = 7000;
const COUNT_FAR = 2600;
const COUNT = COUNT_ARM + COUNT_CORE + COUNT_DUST + COUNT_FAR;

const NEBULA_COUNT = 14;
const COMET_COUNT = 26;
const SHOCKWAVE_COUNT = 3;

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
  /** Scroll progress of the hero act, 0..1, read every frame. */
  progress: { current: number };
  reducedMotion: boolean;
};

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

export function Galaxy({ progress, reducedMotion }: Props) {
  const groupRef = useRef<THREE.Group>(null!);
  const cometsRef = useRef<THREE.Group>(null!);
  const coreRef = useRef<THREE.Sprite>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const cometMatRef = useRef<THREE.LineBasicMaterial>(null!);
  const nebulaRefs = useRef<(THREE.Sprite | null)[]>([]);
  const shockwaveRefs = useRef<(THREE.Mesh | null)[]>([]);
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
      uIgnite: { value: 0 },
      uSize: { value: 2.3 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.75) },
      uCoreColor: { value: col("#EAF6FA") },
      uArmColor: { value: col("#7ECBDD") },
      uDustColor: { value: col("#2A7F96") },
      uEmberColor: { value: col("#183847") },
      uFlashColor: { value: col("#DDF8FF") },
    };

    return { geometry, uniforms };
  }, []);

  // Soft radial blob, tinted per-sprite. Shared by core flare + nebulae.
  const blobTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.4)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

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
    const t = state.clock.elapsedTime;
    const p = reducedMotion ? 1 : progress.current;
    const ignite = smoothstep(0.14, 0.56, p);

    materialRef.current.uniforms.uTime.value = t;
    materialRef.current.uniforms.uIgnite.value = ignite;

    // Spin speeds up as the cluster comes alive.
    spin.current += delta * (0.015 + ignite * 0.05);
    groupRef.current.rotation.y = spin.current + p * 0.85;
    cometSpin.current += delta * (0.05 + ignite * 0.14);
    cometsRef.current.rotation.y = cometSpin.current;

    if (cometMatRef.current) {
      cometMatRef.current.opacity = ignite * 0.62;
    }

    // Three concentric shockwaves tear from the core through the arms.
    shockwaveRefs.current.forEach((mesh, n) => {
      if (!mesh) return;
      const wave = clamp01((p - (0.16 + n * 0.035)) / 0.38);
      const size = 2 + wave * 52;
      mesh.scale.setScalar(size);
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        Math.sin(wave * Math.PI) * (0.34 - n * 0.065);
    });

    nebulaRefs.current.forEach((sprite, n) => {
      if (!sprite) return;
      const base = nebulae[n].baseOpacity;
      (sprite.material as THREE.SpriteMaterial).opacity =
        base * ignite * (0.85 + 0.15 * Math.sin(t * 0.5 + n));
    });

    // Core flare: hands off from the shrinking code line, then settles.
    const rise = smoothstep(0.1, 0.3, p);
    const settle = 1 - 0.3 * smoothstep(0.55, 0.85, p);
    const pulse = 0.92 + 0.08 * Math.sin(t * 2.1);
    const core = coreRef.current;
    (core.material as THREE.SpriteMaterial).opacity =
      (reducedMotion ? 0.6 : rise * settle) * pulse * 0.55;
    const s = 5.5 + rise * 3.2 * pulse;
    core.scale.set(s, s, 1);
  });

  return (
    <group ref={groupRef} rotation={[0, 0, -0.05]}>
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
            map={blobTexture}
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
            ref={cometMatRef}
            color="#7ECBDD"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      </group>

      {Array.from({ length: SHOCKWAVE_COUNT }, (_, idx) => (
        <mesh
          key={`shockwave-${idx}`}
          rotation={[-Math.PI / 2, 0, 0]}
          ref={(el) => {
            shockwaveRefs.current[idx] = el;
          }}
        >
          <ringGeometry args={[0.975, 1, 160]} />
          <meshBasicMaterial
            color={idx === 0 ? "#7ECBDD" : "#2A7F96"}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      <sprite ref={coreRef}>
        <spriteMaterial
          map={blobTexture}
          color="#7ECBDD"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
}
