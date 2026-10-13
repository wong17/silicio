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
