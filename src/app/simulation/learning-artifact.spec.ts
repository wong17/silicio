import { describe, expect, it } from 'vitest';
import { createArtifact, transfer, validate } from './learning-artifact';

const pixels = Array.from({ length: 64 }, (_, n) => n * 4);

describe('artefactos de aprendizaje', () => {
  it('un mosaico válido viaja del PC al SoC como copia', () => {
    const a = createArtifact('tile-image', 'machine', { width: 8, height: 8, pixels });
    const copy = transfer(a, 'soc');
    expect(copy.pixels).toEqual(pixels);
    expect(copy.pixels).not.toBe(a.payload.pixels);
    expect(a.schemaVersion).toBe(1);
    expect(a.origin).toBe('machine');
  });

  it('la tarea de la misión 01 viaja del 8086 al SoC', () => {
    const a = createArtifact('word-task', '8086', { accumulator: 7, word: 5 });
    expect(transfer(a, 'soc')).toEqual({ accumulator: 7, word: 5 });
  });

  it('rechaza un destino incompatible sin tocar nada', () => {
    const a = createArtifact('tile-image', 'machine', { width: 8, height: 8, pixels });
    expect(() => transfer(a, '8086')).toThrow('no se puede llevar');
    const t = createArtifact('word-task', '8086', { accumulator: 1, word: 2 });
    expect(() => transfer(t, 'machine')).toThrow('no se puede llevar');
  });

  it('rechaza datos mal formados', () => {
    const base = { id: 'x', schemaVersion: 1, kind: 'tile-image', origin: 'machine' };
    for (const payload of [
      { width: 8, height: 8, pixels: pixels.slice(1) },
      { width: 8, height: 8, pixels: [...pixels.slice(1), 256] },
      { width: 8, height: 8, pixels: [...pixels.slice(1), 1.5] },
      { width: 4, height: 8, pixels },
      { width: 8, height: 8, pixels, result: [1] },
    ])
      expect(() => validate({ ...base, payload })).toThrow();
    expect(() => validate({ ...base, kind: 'otro', payload: {} })).toThrow('desconocido');
    expect(() => validate({ ...base, schemaVersion: 2, payload: { width: 8, height: 8, pixels } })).toThrow('Versión');
    expect(() => validate({ ...base, origin: 'gpu', payload: { width: 8, height: 8, pixels } })).toThrow('Procedencia');
    expect(() => validate({ ...base, id: '', payload: { width: 8, height: 8, pixels } })).toThrow('identificador');
    expect(() => validate(null)).toThrow();
  });

  it('nunca acepta un snapshot de otra arquitectura', () => {
    const base = { id: 'x', schemaVersion: 1, origin: '8086' };
    expect(() => validate({ ...base, kind: 'word-task', payload: { accumulator: 7, word: 5, registers: { AX: 7 } } })).toThrow('otra arquitectura');
    expect(() => validate({ ...base, kind: 'tile-image', payload: { width: 8, height: 8, pixels, memory: {} } })).toThrow('otra arquitectura');
    expect(() => validate({ ...base, kind: 'word-task', payload: { accumulator: 70000, word: 5 } })).toThrow('16 bits');
  });
});
