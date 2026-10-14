import { BENCH } from './models/bench-layout';

/**
 * Where the camera may be. The room is closed: the lens stays inside the walls, in front of the back wall
 * and under the ceiling, so zooming out never crosses a surface and never shows the outside of a wall.
 */
export const CAMERA_LIMITS = {
  x: [-34, 34],
  y: [BENCH.floor + 1, BENCH.ceiling - 0.8],
  z: [-9, 34],
} as const;

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

function clamp(value: number, [low, high]: readonly [number, number]): number {
  return Math.min(high, Math.max(low, value));
}

/** Moves a camera position back inside the room, in place. Returns true when it had to move. */
export function keepInsideRoom(p: Point3): boolean {
  const x = clamp(p.x, CAMERA_LIMITS.x),
    y = clamp(p.y, CAMERA_LIMITS.y),
    z = clamp(p.z, CAMERA_LIMITS.z);
  const moved = x !== p.x || y !== p.y || z !== p.z;
  p.x = x;
  p.y = y;
  p.z = z;
  return moved;
}

/**
 * Largest distance from `target` along the unit vector `direction` that still lies inside the camera box.
 * The orbit controls use it as their zoom-out limit, so the room box and the zoom limit never disagree.
 */
export function maxDistanceWithin(target: Point3, direction: Point3): number {
  let t = Number.POSITIVE_INFINITY;
  const axes: [keyof Point3, readonly [number, number]][] = [
    ['x', CAMERA_LIMITS.x],
    ['y', CAMERA_LIMITS.y],
    ['z', CAMERA_LIMITS.z],
  ];
  for (const [axis, [lo, hi]] of axes) {
    const d = direction[axis];
    if (d > 1e-9) t = Math.min(t, (hi - target[axis]) / d);
    else if (d < -1e-9) t = Math.min(t, (lo - target[axis]) / d);
  }
  return Math.max(0, t);
}

/** Near plane that grows with distance, so depth precision stays high when the whole room is in view. */
export function nearForDistance(distance: number): number {
  return Math.min(1.2, Math.max(0.1, distance * 0.04));
}
