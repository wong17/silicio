import { it, expect } from 'vitest';
import { clampLampTarget, lampDistance, LAMP_LIMITS, LAMP_REACH } from './lamp-limits';
import { BENCH } from './models/bench-layout';

it('pulls an aim point beyond the arm’s reach onto the reach circle', () => {
  const far = clampLampTarget({ x: 3.5, z: -6.5, height: 3 });
  expect(lampDistance(far.x, far.z)).toBeCloseTo(LAMP_REACH, 6);
  expect(far.x).toBeLessThanOrEqual(LAMP_LIMITS.x[1]);
  expect(far.z).toBeGreaterThanOrEqual(LAMP_LIMITS.z[0]);
});

it('keeps a reachable aim point where it was asked for', () => {
  const near = clampLampTarget({ x: -3, z: 1, height: 2.5 });
  expect(near.x).toBeCloseTo(-3, 9);
  expect(near.z).toBeCloseTo(1, 9);
  expect(near.height).toBeCloseTo(2.5, 9);
});

it('clamps the head height to its range', () => {
  expect(clampLampTarget({ x: BENCH.lamp.x, z: BENCH.lamp.z, height: 9 }).height).toBe(LAMP_LIMITS.height[1]);
  expect(clampLampTarget({ x: BENCH.lamp.x, z: BENCH.lamp.z, height: 0 }).height).toBe(LAMP_LIMITS.height[0]);
});

it('stands the column beside the work mat, not on it', () => {
  // The mat's left edge is at x = -7.75; the foot of the column has a radius of 0.76 (articulated-lamp.model.ts).
  const matEdge = BENCH.mat.x - BENCH.mat.width / 2;
  expect(BENCH.lamp.x + 0.76).toBeLessThan(matEdge);
});

it('reaches the boards and the notebook, which the first arm could not', () => {
  // Centre of the 8086 board and the notebook, measured from the column.
  expect(lampDistance(0.2, 1.1)).toBeLessThan(LAMP_REACH);
  expect(lampDistance(0.2, 7.5)).toBeLessThan(LAMP_REACH);
});
