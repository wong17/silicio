import { describe, expect, it } from 'vitest';
import { failingTube } from './failing-light';

describe('failingTube', () => {
  it('burns steady when time is frozen, as under reduced motion', () => {
    expect(failingTube(0)).toBe(1);
    expect(failingTube(-1)).toBe(1);
  });

  it('stays steady most of the time and dips now and then', () => {
    // One sample per 80 ms slot for two minutes.
    const samples = Array.from({ length: 1440 }, (_, i) => failingTube(i / 12 + 0.01));
    const dark = samples.filter((v) => v < 0.5).length / samples.length;
    expect(dark).toBeGreaterThan(0.01);
    expect(dark).toBeLessThan(0.1);
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0.1);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
  });
});

import { failingLightState } from './failing-light';
describe('failing tube: lens and light', () => {
  it('failing_tube_lens_and_light_change_together', () => {
    for (let i = 0; i < 600; i++) {
      const t = i / 12 + 0.01;
      const { light, lens } = failingLightState(t, 260);
      const k = failingTube(t);
      expect(light).toBeCloseTo(260 * k, 9);
      // The lens dims in the same frame and never below a quarter of its glow.
      expect(lens).toBeCloseTo(1.2 * (0.25 + 0.75 * k), 9);
      expect(lens).toBeGreaterThanOrEqual(0.3);
    }
  });
  it('under_reduced_motion_the_pair_is_steady', () => {
    expect(failingLightState(0, 260)).toEqual({ light: 260, lens: 1.2 });
  });
});
