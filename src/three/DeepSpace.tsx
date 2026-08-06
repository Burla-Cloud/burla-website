import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { blobTexture } from "./textures";

// Stars per world unit of corridor height, so extending the corridor upward
// (see topY) adds stars instead of thinning the ones already there.
const FIELD_DENSITY = 18000 / 438;

// The corridor the camera descends through after the hero. It starts just above
// the galaxy plane so there is no empty gap on the way out, and runs deep enough
// in y to outlast a narrow phone viewport, where the page is ~12 screens tall.
const X_SPREAD = 110;
const Y_TOP = 8;
const Y_BOTTOM = -430;
const Z_NEAR = 30;
const Z_FAR = -110;

const AMBIENT_COUNT = 4;

const hash = (seed: number) => {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
};

// Points are sized in CSS pixels and capped tight: stars that drift close to the
// camera stay crisp specks instead of blooming into out-of-focus blobs.
const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uContentHalfNdc;

  attribute float aSize;
  attribute float aSeed;
  attribute float aDepth;

  varying float vSeed;
  varying float vTwinkle;
  varying float vBright;
  varying float vContentFade;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = max(24.0, -mv.z);

    float twinkle = 0.78 + 0.22 * sin(uTime * (0.3 + aSeed * 0.7) + aSeed * 43.0);
    float px = clamp(aSize * (78.0 / dist), 1.5, 3.6);

    vSeed = aSeed;
    vTwinkle = twinkle;
    vBright = mix(0.84, 1.32, aDepth) * (1.0 - 0.3 * smoothstep(90.0, 190.0, dist));
    gl_PointSize = px * uPixelRatio;
    gl_Position = projectionMatrix * mv;

    vec2 ndc = gl_Position.xy / max(gl_Position.w, 0.0001);
    vContentFade = mix(
      0.68,
      1.0,
      smoothstep(uContentHalfNdc * 0.75, uContentHalfNdc * 1.12, abs(ndc.x))
    );
  }
`;

const fragment = /* glsl */ `
  precision highp float;

  varying float vSeed;
  varying float vTwinkle;
  varying float vBright;
  varying float vContentFade;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    // Hard little core with a faint halo, so a one-pixel star still lands.
    float core = pow(1.0 - smoothstep(0.0, 0.5, d), 0.85);

    vec3 teal = vec3(0.227, 0.616, 0.714);
    vec3 cyan = vec3(0.588, 0.867, 0.941);
    vec3 ice = vec3(0.957, 0.984, 1.0);
    vec3 color = mix(teal, cyan, smoothstep(0.18, 0.82, vSeed));
    color = mix(color, ice, step(0.78, vSeed) * 0.85);

    float alpha = core * vBright * vTwinkle * vContentFade;
    gl_FragColor = vec4(color, alpha);
  }
`;

type Props = {
  reducedMotion: boolean;
  showNebulae?: boolean;
  /**
   * Top of the star corridor, in world units. The default sits just above the
   * galaxy plane, which is all the hero needs: its camera starts high and looks
   * down. Pages without the galaxy point a camera at y=0 straight ahead, so
   * they have to raise this above the top of the frustum or the upper half of
   * the first screen renders starless.
   */
  topY?: number;
};

// Everything below the galaxy: a deep field of stars and a few faint ambient
// nebula washes near the hero handoff. The content sections sit on the bare
// starfield; their surfaces carry the contrast, not scene lighting.
export function DeepSpace({
  reducedMotion,
  showNebulae = true,
  topY = Y_TOP,
}: Props) {
  const nebulaRefs = useRef<(THREE.Sprite | null)[]>([]);
  const texture = blobTexture();

  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uContentHalfNdc: { value: 0.6 },
    }),
    [],
  );

  const fieldGeometry = useMemo(() => {
    const count = Math.round(FIELD_DENSITY * (topY - Y_BOTTOM));
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const depths = new Float32Array(count);

    for (let n = 0; n < count; n++) {
      // Keep the content corridor slightly quieter by distributing more stars
      // toward the margins instead of concentrating them on the centre line.
      const lateral = (hash(n * 29 + 7) - 0.5) * 2;
      positions[n * 3] =
        Math.sign(lateral) * Math.pow(Math.abs(lateral), 0.9) * X_SPREAD;
      positions[n * 3 + 1] = topY + hash(n * 31 + 11) * (Y_BOTTOM - topY);
      positions[n * 3 + 2] = Z_FAR + hash(n * 41 + 3) * (Z_NEAR - Z_FAR);
      sizes[n] = 0.85 + Math.pow(hash(n * 37 + 13), 2.4) * 3.0;
      seeds[n] = hash(n * 17 + 5);
      depths[n] = hash(n * 23 + 19);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1));
    return geometry;
  }, [topY]);
  useEffect(() => () => fieldGeometry.dispose(), [fieldGeometry]);

  // Ambient ink washes, weighted to the top of the corridor so the galaxy's
  // light seems to bleed down into the dark instead of cutting out. Positions
  // keep the divisor of the original seven-wash layout, so the washes near the
  // hero sit exactly where they always did.
  const nebulae = useMemo(
    () =>
      Array.from({ length: AMBIENT_COUNT }, (_, n) => {
        const seed = n * 53 + 400_000;
        const t = n / 6;
        return {
          position: [
            (hash(seed) - 0.5) * 80,
            -12 - Math.pow(t, 1.4) * 340 + (hash(seed + 4) - 0.5) * 20,
            -80 + hash(seed + 8) * 80,
          ] as [number, number, number],
          scale: 80 + hash(seed + 12) * 90,
          opacity: (0.05 + hash(seed + 16) * 0.035) * (1 - t * 0.45),
          color: n % 3 === 0 ? "#7ECBDD" : "#2A7F96",
        };
      }),
    [],
  );

  useFrame((state) => {
    const mat = materialRef.current;
    if (!mat) return;
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    mat.uniforms.uContentHalfNdc.value = Math.min(
      0.92,
      1200 / state.size.width,
    );

    nebulaRefs.current.forEach((sprite, n) => {
      if (!sprite) return;
      const base = nebulae[n].opacity;
      (sprite.material as THREE.SpriteMaterial).opacity =
        base * (0.85 + 0.15 * Math.sin(t * 0.35 + n));
    });
  });

  return (
    <group>
      <points geometry={fieldGeometry} frustumCulled={false} renderOrder={-50}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          stencilWrite
          stencilWriteMask={0}
          stencilRef={1}
          stencilFunc={THREE.NotEqualStencilFunc}
          stencilFail={THREE.KeepStencilOp}
          stencilZFail={THREE.KeepStencilOp}
          stencilZPass={THREE.KeepStencilOp}
        />
      </points>

      {showNebulae &&
        nebulae.map((n, idx) => (
          <sprite
            key={`nebula-${idx}`}
            position={n.position}
            scale={[n.scale, n.scale * 0.62, 1]}
            renderOrder={-50}
            ref={(el) => {
              nebulaRefs.current[idx] = el;
            }}
          >
            <spriteMaterial
              map={texture}
              color={n.color}
              transparent
              opacity={n.opacity}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              stencilWrite
              stencilWriteMask={0}
              stencilRef={1}
              stencilFunc={THREE.NotEqualStencilFunc}
              stencilFail={THREE.KeepStencilOp}
              stencilZFail={THREE.KeepStencilOp}
              stencilZPass={THREE.KeepStencilOp}
            />
          </sprite>
        ))}
    </group>
  );
}
