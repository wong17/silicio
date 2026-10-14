import * as T from 'three';
import { RENDER_ORDER } from '../render-order';

export interface DustBeam {
  origin: T.Vector3;
  /** Unit vector the light points along. */
  direction: T.Vector3;
  /** Cosine of the half angle of the cone. */
  cosAngle: number;
  strength: number;
}

/** Furthest a mote drifts from its home position on any axis, in world units. */
export const DUST_DRIFT = 0.45;
const MAX_BEAMS = 3;

/** Offset of a mote at time `t`; the vertex shader repeats this formula, so the CPU can bound it in tests. */
export function dustOffset(seed: number, t: number, out = new T.Vector3()): T.Vector3 {
  return out.set(
    Math.sin(t * 0.11 + seed * 6.2831) * DUST_DRIFT,
    Math.sin(t * 0.07 + seed * 12.566) * DUST_DRIFT * 0.7,
    Math.cos(t * 0.09 + seed * 9.4247) * DUST_DRIFT,
  );
}

const VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  uniform vec4 uOrigin[${MAX_BEAMS}];
  uniform vec4 uDirection[${MAX_BEAMS}];
  varying float vLight;
  void main() {
    vec3 drift = vec3(
      sin(uTime * 0.11 + aSeed * 6.2831) * ${DUST_DRIFT.toFixed(2)},
      sin(uTime * 0.07 + aSeed * 12.566) * ${(DUST_DRIFT * 0.7).toFixed(3)},
      cos(uTime * 0.09 + aSeed * 9.4247) * ${DUST_DRIFT.toFixed(2)}
    );
    vec3 p = position + drift;
    float lit = 0.0;
    for (int i = 0; i < ${MAX_BEAMS}; i++) {
      vec3 v = p - uOrigin[i].xyz;
      float len = max(length(v), 0.001);
      float c = dot(v / len, uDirection[i].xyz);
      float inside = smoothstep(uOrigin[i].w, uOrigin[i].w + 0.06, c);
      lit += inside * uDirection[i].w / (1.0 + len * len * 0.012);
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // Motes close to the lens fade out instead of popping into big discs.
    float near = smoothstep(0.8, 3.5, length(mv.xyz));
    vLight = clamp(lit, 0.0, 1.0) * near;
    gl_PointSize = uSize * (0.6 + aSeed * 0.8) * (24.0 / max(-mv.z, 0.5));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vLight;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25 || vLight < 0.01) discard;
    float edge = smoothstep(0.25, 0.0, d);
    gl_FragColor = vec4(1.0, 0.92, 0.78, edge * vLight * 0.55);
  }
`;

/**
 * One draw call of floating motes. Drift is computed in the vertex shader, so there is no per-frame CPU
 * work, and a mote shines only while it is inside a light cone, as real dust does.
 */
export class AmbientDust {
  readonly points: T.Points;
  private readonly material: T.ShaderMaterial;
  private readonly origin: T.Vector4[] = [];
  private readonly direction: T.Vector4[] = [];

  constructor(
    count: number,
    readonly volume: T.Box3,
    track: <G extends T.Material | T.BufferGeometry | T.Texture>(r: G) => G,
  ) {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const size = volume.getSize(new T.Vector3());
    // A deterministic scatter keeps captures reproducible.
    let state = 1234567;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      // Homes keep a margin of one drift radius, so a drifting mote never leaves the volume.
      positions[i * 3] = volume.min.x + DUST_DRIFT + random() * Math.max(0, size.x - 2 * DUST_DRIFT);
      positions[i * 3 + 1] = volume.min.y + DUST_DRIFT + random() * Math.max(0, size.y - 2 * DUST_DRIFT);
      positions[i * 3 + 2] = volume.min.z + DUST_DRIFT + random() * Math.max(0, size.z - 2 * DUST_DRIFT);
      seeds[i] = random();
    }
    const geometry = track(new T.BufferGeometry());
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new T.BufferAttribute(seeds, 1));
    for (let i = 0; i < MAX_BEAMS; i++) {
      this.origin.push(new T.Vector4(0, 0, 0, 2));
      this.direction.push(new T.Vector4(0, -1, 0, 0));
    }
    this.material = track(
      new T.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: 5 },
          uOrigin: { value: this.origin },
          uDirection: { value: this.direction },
        },
      }),
    );
    this.points = new T.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = RENDER_ORDER.dust;
    this.points.userData['noBounds'] = true;
    this.points.name = 'ambient-dust';
    this.points.visible = count > 0;
  }

  get count(): number {
    return (this.points.geometry.getAttribute('position') as T.BufferAttribute).count;
  }

  /** Lights up to three cones; motes outside every cone stay dark. */
  setBeams(beams: DustBeam[]): void {
    for (let i = 0; i < MAX_BEAMS; i++) {
      const b = beams[i];
      if (!b) {
        this.direction[i].set(0, -1, 0, 0);
        continue;
      }
      this.origin[i].set(b.origin.x, b.origin.y, b.origin.z, b.cosAngle);
      this.direction[i].set(b.direction.x, b.direction.y, b.direction.z, b.strength);
    }
  }

  /** `seconds` is the scene clock, which stays at zero under reduced motion, so the dust is frozen there. */
  update(seconds: number): void {
    this.material.uniforms['uTime'].value = seconds;
  }

  /** Draws only the first `n` motes: the quality tiers use 600, 250 and none. */
  setActive(n: number): void {
    const active = Math.max(0, Math.min(n, this.count));
    this.points.geometry.setDrawRange(0, active);
    this.points.visible = active > 0;
  }

  get time(): number {
    return this.material.uniforms['uTime'].value as number;
  }
}
