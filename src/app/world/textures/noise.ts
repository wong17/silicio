/**
 * Deterministic, tileable noise for surface authoring. Every value depends only on the seed and
 * the lattice coordinates, so a material looks the same on every load and repeats without seams.
 */
export function hash2(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Value noise on a torus of `px × py` lattice cells; coordinates are in lattice units. */
export function tileNoise(x: number, y: number, px: number, py: number, seed: number): number {
  const x0 = Math.floor(x),
    y0 = Math.floor(y);
  const fx = smooth(x - x0),
    fy = smooth(y - y0);
  const ax = ((x0 % px) + px) % px,
    bx = (ax + 1) % px,
    ay = ((y0 % py) + py) % py,
    by = (ay + 1) % py;
  const top = hash2(ax, ay, seed) + (hash2(bx, ay, seed) - hash2(ax, ay, seed)) * fx;
  const bottom = hash2(ax, by, seed) + (hash2(bx, by, seed) - hash2(ax, by, seed)) * fx;
  return top + (bottom - top) * fy;
}

/** Fractal sum in [0,1). `u`,`v` are normalised texture coordinates; periods double per octave. */
export function fractal(
  u: number,
  v: number,
  px: number,
  py: number,
  octaves: number,
  seed: number,
): number {
  let sum = 0,
    total = 0,
    amp = 0.5,
    fx = px,
    fy = py;
  for (let i = 0; i < octaves; i++) {
    sum += amp * tileNoise(u * fx, v * fy, fx, fy, seed + i * 131);
    total += amp;
    amp *= 0.5;
    fx *= 2;
    fy *= 2;
  }
  return sum / total;
}

/** Small deterministic generator for scratches and other discrete marks. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
