import { describe, it, expect } from 'vitest';
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

import { maxDistanceWithin, nearForDistance } from './room-bounds';
describe('límite de alejamiento y plano cercano', () => {
  it('zoom_out_limit_keeps_the_camera_inside_the_box', () => {
    const target = { x: 0, y: 0.7, z: 0 };
    for (const dir of [
      { x: 0.3, y: 0.7, z: 0.648 },
      { x: -0.9, y: 0.1, z: 0.42 },
      { x: 0, y: 1, z: 0 },
      { x: 0.2, y: 0.05, z: -0.98 },
    ]) {
      const len = Math.hypot(dir.x, dir.y, dir.z);
      const u = { x: dir.x / len, y: dir.y / len, z: dir.z / len };
      const t = maxDistanceWithin(target, u);
      const p = { x: target.x + u.x * t, y: target.y + u.y * t, z: target.z + u.z * t };
      expect(p.x).toBeLessThanOrEqual(CAMERA_LIMITS.x[1] + 1e-6);
      expect(p.x).toBeGreaterThanOrEqual(CAMERA_LIMITS.x[0] - 1e-6);
      expect(p.y).toBeLessThanOrEqual(CAMERA_LIMITS.y[1] + 1e-6);
      expect(p.z).toBeLessThanOrEqual(CAMERA_LIMITS.z[1] + 1e-6);
      expect(p.z).toBeGreaterThanOrEqual(CAMERA_LIMITS.z[0] - 1e-6);
    }
  });
  it('near_plane_grows_with_distance_and_stays_bounded', () => {
    expect(nearForDistance(1)).toBe(0.1);
    expect(nearForDistance(20)).toBeCloseTo(0.8);
    expect(nearForDistance(500)).toBe(1.2);
  });
});
