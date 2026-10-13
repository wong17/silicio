import { describe, expect, it } from 'vitest';
import { describePiece } from './piece-descriptions';

describe('descripciones de piezas', () => {
  it('explica la lámpara como herramienta de iluminación sin efectos académicos', () => {
    const text = describePiece('lamp', [], []);
    expect(text).toContain('Lámpara articulada');
    expect(text).toContain('no modifica registros ni memoria');
  });

  it('describe una celda con su dirección física y su byte', () => {
    const text = describePiece(
      'cell-1',
      [
        { address: 0x2000a, value: 5 },
        { address: 0x2000b, value: 0x2a },
      ],
      [],
    );
    expect(text).toContain('Dirección física 2000Bh');
    expect(text).toContain('byte 2Ah');
  });

  it('usa el catálogo para piezas sin texto propio', () => {
    expect(describePiece('custom', [], [{ id: 'custom', name: 'Pieza', description: 'Texto propio' }])).toBe(
      'Texto propio',
    );
  });

  it('nombra el pin y su papel en el diagrama', () => {
    expect(describePiece('pin-25', [], [])).toContain('ALE');
  });
});
