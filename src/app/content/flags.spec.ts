import { describe, expect, it } from 'vitest';
import { explainFlag, FLAG_INFO } from './flags';

describe('flags con motivo', () => {
  it('every_flag_explains_its_last_value', () => {
    for (const f of FLAG_INFO) {
      for (const value of [true, false]) {
        const text = explainFlag(f.name, { value, result: value ? 0 : 0x8001, op: 'ADD', operands: [1, 2] });
        expect(text, f.name).toContain(f.name + ' = ' + (value ? '1' : '0'));
        expect(text.length).toBeGreaterThan(20);
      }
    }
  });
  it('says_so_before_any_step', () => {
    expect(explainFlag('ZF', { value: false })).toContain('aún no');
  });
  it('mov_keeps_flags', () => {
    expect(explainFlag('CF', { value: true, op: 'MOV' })).toContain('conserva');
  });
});
