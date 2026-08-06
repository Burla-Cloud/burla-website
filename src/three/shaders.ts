// Galaxy of "machines" rendered as gl.POINTS in blue light over deep space.
// Each point saturates when the global uIgnite value passes its per-point
// aOrder (a radius-out wave with noise). Points sitting on the wavefront
// flash ice-bright and oversized for a beat, so ignition reads as a detonation
// ripping outward rather than a fade-in.

export const galaxyVertex = /* glsl */ `
  uniform float uTime;
  uniform float uIgnite;
  uniform float uSize;
  uniform float uPixelRatio;
  // 0 during the hero (big foreground motes are the point), 1 once the page is
  // descending past the disc, where those same motes would smear into bokeh.
  uniform float uPass;

  attribute float aSeed;
  attribute float aScale;
  attribute float aType;
  attribute float aOrder;

  varying float vAct;
  varying float vFront;
  varying float vType;
  varying float vSeed;
  varying float vNear;

  void main() {
    float edge = 0.16;
    float act = smoothstep(aOrder - edge, aOrder + edge, uIgnite);
    // Gaussian bump centered on the ignition wavefront.
    float front = exp(-pow((uIgnite - aOrder) * 16.0, 2.0)) * step(0.001, uIgnite);
    float twinkle = 0.8 + 0.2 * sin(uTime * (1.1 + aSeed * 1.7) + aSeed * 6.2831853);

    // The wavefront physically kicks each machine outward for one beat.
    vec3 displaced = position;
    vec2 radial = normalize(position.xz + vec2(0.0001));
    displaced.xz += radial * front * 2.2;
    displaced.y += sin(aSeed * 18.0) * front * 0.6;
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);

    vAct = act * twinkle;
    vFront = front;
    vType = aType;
    vSeed = aSeed;
    vNear = mix(1.0, smoothstep(8.0, 34.0, length(mv.xyz)), uPass);

    float size = uSize * uPixelRatio * aScale * mix(0.3, 1.0, act) * (150.0 / -mv.z);
    size *= 1.0 + front * 1.6;
    gl_PointSize = clamp(size, 1.0, mix(40.0, 6.0, uPass) * uPixelRatio);
    gl_Position = projectionMatrix * mv;
  }
`;

export const galaxyFragment = /* glsl */ `
  uniform vec3 uCoreColor;
  uniform vec3 uArmColor;
  uniform vec3 uDustColor;
  uniform vec3 uEmberColor;
  uniform vec3 uFlashColor;

  varying float vAct;
  varying float vFront;
  varying float vType;
  varying float vSeed;
  varying float vNear;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float disc = smoothstep(0.5, 0.06, d);
    disc *= disc;

    vec3 lit;
    float density;
    if (vType < 0.5) {
      lit = uCoreColor;
      density = 1.0;
    } else if (vType < 1.5) {
      lit = mix(uArmColor, uCoreColor, vSeed * 0.5);
      density = 1.0;
    } else if (vType < 2.5) {
      lit = mix(uDustColor, uArmColor, vSeed * 0.3);
      density = 0.7;
    } else {
      // far starfield
      lit = mix(uDustColor, uArmColor, 0.3);
      density = 0.58;
    }

    float act = clamp(vAct, 0.0, 1.0);
    vec3 color = mix(uEmberColor, lit, act);
    // Wavefront: snap to ice-bright blue and force full presence.
    color = mix(color, uFlashColor, clamp(vFront, 0.0, 1.0) * 0.85);
    float alpha = disc * mix(0.09, 1.0, act) * density;
    alpha = min(1.0, alpha + vFront * 0.6 * disc) * vNear;

    gl_FragColor = vec4(color, alpha);
  }
`;
