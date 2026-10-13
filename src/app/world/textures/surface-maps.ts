import { fractal, seededRandom } from './noise';

/** Surface families decide which causes shape the material: grain, dot grid, enamel or plastic. */
export type SurfaceFinish =
  | 'steel'
  | 'paint'
  | 'wood'
  | 'mat'
  | 'pegboard'
  | 'pcb'
  | 'plastic'
  | 'ceramic'
  | 'rubber'
  | 'tile'
  | 'panel'
  | 'acoustic';

export interface SurfaceSpec {
  seed: number;
  finish: SurfaceFinish;
  /** Base colour of the intact layer (sRGB hex). */
  albedo: string;
  /** Colour of the layer revealed by wear: bare metal, copper or raw substrate. */
  exposed: string;
  /** Colour of accumulated dust, flux and fingerprints. */
  grime: string;
  /** 0..1 amount of grime settled in low areas and crevices. */
  dirt: number;
  /** 0..1 amount of the base layer removed by use. */
  wear: number;
  /** Roughness of clean and grimy regions: [smooth, rough]. */
  roughness: [number, number];
  /** Relief strength of the normal map. */
  bump: number;
  /** Directional scratches drawn across the surface. */
  scratches?: number;
  /** Whether exposed areas are metal; drives the metalness map. */
  metal?: boolean;
  /** Square resolution in texels. */
  size?: number;
}

/** Channel data shared by albedo, roughness, metalness and normal maps. */
export interface SurfaceBuffers {
  size: number;
  albedo: Uint8ClampedArray<ArrayBuffer>;
  roughness: Uint8ClampedArray<ArrayBuffer>;
  metalness: Uint8ClampedArray<ArrayBuffer>;
  normal: Uint8ClampedArray<ArrayBuffer>;
}

export function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** A hash in 0..1 for an integer, so each panel of a wall gets its own tone and the same tone every build. */
function hashUnit(n: number): number {
  const s = Math.sin(n * 91.3458 + 17.17) * 47453.5453;
  return s - Math.floor(s);
}

/** One directional scratch rasterised with wrap-around so the texture stays seamless. */
function drawScratches(size: number, count: number, finish: SurfaceFinish, seed: number): Float32Array {
  const mask = new Float32Array(size * size);
  if (!count) return mask;
  const random = seededRandom(seed + 977);
  for (let s = 0; s < count; s++) {
    const x0 = random() * size,
      y0 = random() * size;
    const angle =
      finish === 'steel' || finish === 'paint' || finish === 'wood'
        ? (random() - 0.5) * 0.12
        : random() * Math.PI;
    const length = size * (0.12 + random() * 0.4);
    const steps = Math.ceil(length);
    for (let k = 0; k <= steps; k++) {
      const x = Math.floor(x0 + Math.cos(angle) * k) & (size - 1),
        y = Math.floor(y0 + Math.sin(angle) * k) & (size - 1);
      mask[y * size + x] = 1;
      mask[y * size + ((x + 1) & (size - 1))] = Math.max(mask[y * size + ((x + 1) & (size - 1))], 0.6);
    }
  }
  return mask;
}

/**
 * Computes one coherent surface from its causes. Dust, wear and relief are read from the same
 * fields, so a worn edge is lighter, smoother and metallic at once instead of three unrelated noises.
 */
export function computeSurface(spec: SurfaceSpec): SurfaceBuffers {
  const N = spec.size ?? 128,
    count = N * N,
    seed = spec.seed;
  const base = hexRgb(spec.albedo),
    exposed = hexRgb(spec.exposed),
    grime = hexRgb(spec.grime);
  const scratch = drawScratches(N, spec.scratches ?? 0, spec.finish, seed);
  const height = new Float32Array(count),
    wear = new Float32Array(count),
    dirt = new Float32Array(count),
    rough = new Float32Array(count),
    tint = new Float32Array(count);
  const albedo = new Uint8ClampedArray(count * 4),
    roughness = new Uint8ClampedArray(count * 4),
    metalness = new Uint8ClampedArray(count * 4),
    normal = new Uint8ClampedArray(count * 4);
  const [smoothR, roughR] = spec.roughness;

  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x,
        u = x / N,
        v = y / N;
      const L = fractal(u, v, 6, 6, 3, seed + 1); // grime fields: finer than before, so they read as dust, not puddles
      const M = fractal(u, v, 8, 8, 4, seed + 7); // use patterns
      const F = fractal(u, v, 32, 32, 3, seed + 13); // micro grain
      const S = fractal(u, v, 2, 48, 3, seed + 21); // streaks, elongated along x
      let h = 0,
        t = 1;
      switch (spec.finish) {
        case 'steel':
          h = 0.4 * S + 0.2 * F + 0.25 * M;
          t = 0.95 + 0.1 * S;
          break;
        case 'paint':
          h = 0.5 * M + 0.15 * F + 0.25 * L;
          t = 0.97 + 0.05 * M;
          break;
        case 'wood': {
          const rings = 0.5 + 0.5 * Math.sin(2 * Math.PI * (v * 14 + 1.6 * L));
          h = 0.5 * rings + 0.3 * S + 0.2 * F;
          t = 0.84 + 0.2 * rings;
          break;
        }
        case 'mat': {
          const gx = 0.5 + 0.5 * Math.cos(2 * Math.PI * u * 8),
            gy = 0.5 + 0.5 * Math.cos(2 * Math.PI * v * 8);
          const dot = Math.pow(gx * gy, 4);
          h = 0.15 + 0.55 * dot + 0.15 * F;
          t = 0.9 + 0.12 * dot;
          break;
        }
        case 'pegboard': {
          // Eighteen holes per tile; the hole interior is dark and recessed.
          const cu = ((u * 18) % 1) - 0.5,
            cv = ((v * 18) % 1) - 0.5;
          const hole = 1 - smoothstep(0.1, 0.13, Math.hypot(cu, cv));
          h = 0.45 + 0.1 * F - 0.4 * hole;
          t = 1 - 0.5 * hole + 0.04 * F;
          break;
        }
        case 'pcb':
          h = 0.25 * F + 0.35 * M + 0.15 * S;
          t = 0.95 + 0.07 * F;
          break;
        case 'plastic':
          h = 0.3 * F + 0.4 * M;
          t = 0.97 + 0.04 * F;
          break;
        case 'ceramic': {
          const pit = smoothstep(0.8, 0.86, F);
          h = 0.4 * M + 0.15 * F - 0.3 * pit;
          t = 1 - 0.08 * pit;
          break;
        }
        case 'tile': {
          // Square floor tiles, two per texture side, with darker grout along the joints.
          const tu = (u * 2) % 1,
            tv = (v * 2) % 1;
          const edge = Math.min(tu, 1 - tu, tv, 1 - tv);
          const grout = 1 - smoothstep(0.02, 0.05, edge);
          h = 0.5 + 0.12 * F - 0.3 * grout;
          t = (0.96 + 0.07 * L) * (1 - 0.35 * grout);
          break;
        }
        case 'panel': {
          // Painted wall panels: two per tile across, a hairline groove at each joint, a tone of its own for every
          // panel, and a deeper band near the floor. Rows run from the ceiling (v = 0) to the floor (v = 1).
          const across = (u * 2) % 1;
          const joint = 1 - smoothstep(0.01, 0.025, Math.min(across, 1 - across));
          const panelTone = 0.97 + 0.05 * hashUnit(Math.floor(u * 2) + (seed & 255) * 7);
          const lowBand = smoothstep(0.64, 0.66, v);
          h = 0.4 * F + 0.15 * M - 0.3 * joint;
          t = panelTone * (1 - 0.1 * joint) * (1 - 0.12 * lowBand);
          break;
        }
        case 'acoustic': {
          // Suspended ceiling tiles: a square grid of hairline joints and a field of tiny perforations.
          const tu = (u * 4) % 1,
            tv = (v * 4) % 1;
          const joint = 1 - smoothstep(0.012, 0.024, Math.min(tu, 1 - tu, tv, 1 - tv));
          const hole = 1 - smoothstep(0.1, 0.14, Math.hypot(((u * 64) % 1) - 0.5, ((v * 64) % 1) - 0.5));
          h = 0.3 + 0.12 * F - 0.2 * joint - 0.25 * hole;
          t = (1 - 0.12 * joint) * (1 - 0.15 * hole);
          break;
        }
        case 'rubber':
          h = 0.35 * F + 0.4 * M;
          t = 0.93 + 0.06 * F;
          break;
      }
      // Worn patches sit where the piece is handled and break into grain-sized speckles at their edges.
      // Contour lines of one field read as liquid, so the wear comes from patches, not from ridges.
      const use = smoothstep(0.5, 0.8, M);
      const speckle = smoothstep(0.42, 0.72, fractal(u, v, 24, 24, 3, seed + 31));
      const exposure = clamp01(use * (0.2 + 0.8 * speckle) * spec.wear * 2.4);
      const scratched = scratch[i];
      const w = clamp01(Math.max(exposure, scratched * 0.9));
      // Dust settles in low areas and crevices, and wear removes it from exposed areas.
      const crevice = smoothstep(0.46, 0.2, h);
      const d = clamp01(smoothstep(0.42, 0.7, L) * spec.dirt + crevice * spec.dirt * 0.7) * (1 - w * 0.85);
      height[i] = h - 0.12 * scratched;
      wear[i] = w;
      dirt[i] = d;
      tint[i] = t;
      rough[i] = smoothR + (roughR - smoothR) * (0.5 * M + 0.5 * F);
    }

  for (let i = 0; i < count; i++) {
    const w = wear[i],
      d = dirt[i],
      k = i * 4;
    // Albedo: intact colour, exposed layer, then grime on top.
    let r = base[0] + (exposed[0] - base[0]) * w * 0.9,
      g = base[1] + (exposed[1] - base[1]) * w * 0.9,
      b = base[2] + (exposed[2] - base[2]) * w * 0.9;
    r += (grime[0] - r) * d * 0.7;
    g += (grime[1] - g) * d * 0.7;
    b += (grime[2] - b) * d * 0.7;
    const shade = tint[i];
    albedo[k] = r * shade;
    albedo[k + 1] = g * shade;
    albedo[k + 2] = b * shade;
    albedo[k + 3] = 255;
    // Roughness: grime is matte, worn metal is polished; the value stays inside a physical range.
    let rr = rough[i];
    rr += (0.92 - rr) * d;
    rr += (w * (spec.metal ? 0.3 : 0.6) - rr) * w * 0.8;
    rr = Math.min(1, Math.max(0.04, rr));
    roughness[k] = roughness[k + 1] = roughness[k + 2] = rr * 255;
    roughness[k + 3] = 255;
    const m = spec.metal ? clamp01(w * 1.1) * 255 : 0;
    metalness[k] = metalness[k + 1] = metalness[k + 2] = m;
    metalness[k + 3] = 255;
  }

  // Normal from the height field: central differences with wrap-around, Y pointing up in UV space.
  const strength = spec.bump * 2.2;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x,
        xp = y * N + ((x + 1) & (N - 1)),
        xm = y * N + ((x - 1 + N) & (N - 1)),
        yp = ((y + 1) & (N - 1)) * N + x,
        ym = ((y - 1 + N) & (N - 1)) * N + x;
      const dx = (height[xp] - height[xm]) * 0.5 * strength,
        dy = (height[yp] - height[ym]) * 0.5 * strength;
      const nx = -dx,
        ny = dy,
        nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const k = i * 4;
      normal[k] = ((nx / len) * 0.5 + 0.5) * 255;
      normal[k + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      normal[k + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      normal[k + 3] = 255;
    }

  return { size: N, albedo, roughness, metalness, normal };
}

/** Browser-only conversion; the pure buffers above are what the tests inspect. */
export function surfaceCanvases(buffers: SurfaceBuffers): {
  map: HTMLCanvasElement;
  roughnessMap: HTMLCanvasElement;
  metalnessMap: HTMLCanvasElement;
  normalMap: HTMLCanvasElement;
} {
  const toCanvas = (data: Uint8ClampedArray<ArrayBuffer>): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = buffers.size;
    canvas.getContext('2d')!.putImageData(new ImageData(data, buffers.size, buffers.size), 0, 0);
    return canvas;
  };
  return {
    map: toCanvas(buffers.albedo),
    roughnessMap: toCanvas(buffers.roughness),
    metalnessMap: toCanvas(buffers.metalness),
    normalMap: toCanvas(buffers.normal),
  };
}
