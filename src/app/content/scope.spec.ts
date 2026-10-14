import { describe, expect, it } from 'vitest';
import { readScope, scopeLevels, scopePath } from './scope';

describe('osciloscopio didáctico', () => {
  it('scope_cursor_reads_the_selected_step', () => {
    expect(readScope('ALE', false, false, 0)).toMatchObject({ state: 'T1', level: 1 });
    expect(readScope('ALE', false, false, 2)).toMatchObject({ state: 'T3', level: 0 });
    expect(readScope('RD', true, false, 1).text).toContain('RD bajo');
    expect(readScope('RD', false, false, 1).text).toContain('no lee');
    expect(readScope('WR', false, true, 3).level).toBe(1);
  });
  it('rd_and_wr_are_active_low_only_when_used', () => {
    expect(scopeLevels('RD', true, false)).toEqual([1, 0, 0, 1]);
    expect(scopeLevels('WR', true, false)).toEqual([1, 1, 1, 1]);
  });
  it('path_has_one_segment_per_state', () => {
    expect(scopePath('ALE', false, false).match(/h70/g)).toHaveLength(4);
  });
  it('cursor_is_clamped', () => {
    expect(readScope('ALE', false, false, 9).step).toBe(3);
    expect(readScope('ALE', false, false, -2).step).toBe(0);
  });
});
