import { describe, expect, it } from 'vitest';
import { bitWeight, halves, hasHalves, REGISTER_INFO } from './registers';

describe('registros', () => {
  it('every_register_has_name_and_role', () => {
    expect(REGISTER_INFO).toHaveLength(13);
    for (const r of REGISTER_INFO) {
      expect(r.title.length, r.name).toBeGreaterThan(3);
      expect(r.role.length, r.name).toBeGreaterThan(15);
    }
  });
  it('bit_selection_reports_weight', () => {
    expect(bitWeight(5, true)).toEqual({ weight: 32, text: 'peso 32 · suma 32' });
    expect(bitWeight(15, false).text).toBe('peso 32768 · sin aportación');
  });
  it('high_and_low_halves_match_the_word', () => {
    const { high, low } = halves(0x12ab);
    expect((high << 8) | low).toBe(0x12ab);
    expect(hasHalves('AX')).toBe(true);
    expect(hasHalves('SP')).toBe(false);
  });
});
