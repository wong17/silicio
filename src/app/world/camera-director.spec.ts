import { it, expect } from 'vitest';
import * as T from 'three';
import { frameBounds } from './camera-director';
it('expanded_panel_keeps_selected_bounds_in_free_region', () => {
  const c = new T.PerspectiveCamera(38, 600 / 700, 0.01, 100),
    b = new T.Box3(new T.Vector3(-4, 0, -2), new T.Vector3(4, 3, 2)),
    r = { x: 16, y: 160, width: 568, height: 440 };
  frameBounds(c, b, r, { width: 600, height: 700 });
  for (let x of [-4, 4])
    for (let y of [0, 3])
      for (let z of [-2, 2]) {
        const p = new T.Vector3(x, y, z).project(c);
        const sx = (p.x + 1) * 300,
          sy = (1 - p.y) * 350;
        expect(sx).toBeGreaterThanOrEqual(r.x);
        expect(sx).toBeLessThanOrEqual(r.x + r.width);
        expect(sy).toBeGreaterThanOrEqual(r.y);
        expect(sy).toBeLessThanOrEqual(r.y + r.height);
      }
});
it('camera_distance_scales_with_subject', () => {
  const c = new T.PerspectiveCamera(38, 1, 0.01, 100),
    r = { x: 0, y: 0, width: 500, height: 500 };
  const small = frameBounds(c, new T.Box3(new T.Vector3(-1, -1, -1), new T.Vector3(1, 1, 1)), r, {
    width: 500,
    height: 500,
  });
  const big = frameBounds(c, new T.Box3(new T.Vector3(-3, -3, -3), new T.Vector3(3, 3, 3)), r, {
    width: 500,
    height: 500,
  });
  expect(big.length()).toBeCloseTo(small.length() * 3, 4);
});
