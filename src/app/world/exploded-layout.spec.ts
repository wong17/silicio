import { describe, expect, it } from 'vitest';
import { explodedOffset } from './exploded-layout';

describe('despiece graduable', () => {
  it('exploded_layers_never_interpenetrate', () => {
    for (const section of ['8086', 'apple']) {
      for (const amount of [0.25, 0.5, 1]) {
        const lid = explodedOffset('lid', section, amount);
        const tile = explodedOffset('alu', section, amount);
        expect(lid.y, `${section} ${amount}`).toBeGreaterThanOrEqual(tile.y);
      }
    }
  });
  it('closed_is_the_rest_pose', () => {
    expect(explodedOffset('lid', '8086', 0)).toEqual({ x: 0, y: 0, z: 0 });
    expect(explodedOffset('alu', '8086', 0)).toEqual({ x: 0, y: 0, z: 0 });
  });
  it('fully_open_matches_the_previous_layout', () => {
    expect(explodedOffset('lid', '8086', 1)).toEqual({ x: 1.2, y: 2.1, z: -2.5 });
    expect(explodedOffset('alu', '8086', 1).y).toBeCloseTo(0.6, 6);
  });
  it('layers_are_staggered', () => {
    expect(explodedOffset('alu', '8086', 0.3).y).toBe(0);
    expect(explodedOffset('lid', '8086', 0.3).y).toBeGreaterThan(0);
  });
});
