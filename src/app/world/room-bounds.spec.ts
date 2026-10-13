import { it, expect } from 'vitest';
import { keepInsideRoom, CAMERA_LIMITS } from './room-bounds';
import { BENCH } from './models/bench-layout';

it('keeps the lens under the ceiling, however far the camera zooms out', () => {
  const p = { x: 2, y: 30, z: 4 };
  expect(keepInsideRoom(p)).toBe(true);
  expect(p.y).toBeCloseTo(BENCH.ceiling - 0.8, 9);
});

it('keeps the lens in front of the back wall when the camera orbits behind the bench', () => {
  const p = { x: 0, y: 5, z: -20 };
  expect(keepInsideRoom(p)).toBe(true);
  expect(p.z).toBe(CAMERA_LIMITS.z[0]);
});

it('leaves a position inside the room alone', () => {
  const p = { x: 5.8, y: 9.2, z: 10.8 };
  expect(keepInsideRoom(p)).toBe(false);
  expect(p).toEqual({ x: 5.8, y: 9.2, z: 10.8 });
});
