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
