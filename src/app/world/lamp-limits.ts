import { BENCH } from './models/bench-layout';

/** Where the lamp may aim and how high its head may sit. Kept free of renderer imports so the console can use it. */
export interface LampTarget {
  x: number;
  z: number;
  height: number;
}

/**
 * Bounding box of the aim area, used by the light pad. The arm's reach is a circle around the
 * column (see LAMP_REACH), so a point inside the box can still be out of reach.
 */
export const LAMP_LIMITS = { x: [-14, 4], z: [-7, 9.5], height: [1.6, 6] } as const;

/**
 * Horizontal radius the arm can cover from its column. Slightly under the solver's maximum
 * (upper + fore), so the head never has to stretch to reach the aim point.
 */
export const LAMP_REACH = 10.2;

/** Distance on the bench from the column to a point, the quantity the reach circle limits. */
export function lampDistance(x: number, z: number): number {
  return Math.hypot(x - BENCH.lamp.x, z - BENCH.lamp.z);
}

/** Clamps the aim into the light-pad box and then into the reach circle around the column. */
export function clampLampTarget(t: LampTarget): LampTarget {
  const [x0, x1] = LAMP_LIMITS.x,
    [z0, z1] = LAMP_LIMITS.z,
    [h0, h1] = LAMP_LIMITS.height;
  let x = Math.min(x1, Math.max(x0, t.x));
  let z = Math.min(z1, Math.max(z0, t.z));
  const d = lampDistance(x, z);
  if (d > LAMP_REACH) {
    const k = LAMP_REACH / d;
    x = BENCH.lamp.x + (x - BENCH.lamp.x) * k;
    z = BENCH.lamp.z + (z - BENCH.lamp.z) * k;
  }
  return { x, z, height: Math.min(h1, Math.max(h0, t.height)) };
}
