import { describe, expect, it } from 'vitest';
import { compare, riscText, runRisc } from './load-store-model';
import { BufferExperiment, TILE_SIZE, defaultTile, validTile } from '../buffer-experiment';

describe('CISC frente a RISC con la misma tarea', () => {
  it('sumar memoria a un registro: 1 frente a 2 instrucciones, 4 frente a 8 bytes, una lectura y resultado 12', () => {
    const c = compare('sum');
    expect(c.cisc).toMatchObject({ instructions: 1, bytes: 4, dataReads: 1, dataWrites: 0, result: 12 });
    expect(c.cisc.encoding).toEqual(['03', '06', '0A', '00']);
    expect(c.risc).toMatchObject({ instructions: 2, bytes: 8, dataReads: 1, dataWrites: 0, result: 12 });
    expect(c.risc.text).toEqual(['LDR R1,[R0,#10]', 'ADD R2,R2,R1']);
    expect(c.same).toBe(true);
    expect(c.sameDataTraffic).toBe(true);
  });

  it('sumar y guardar en memoria: 1 frente a 3 instrucciones, 4 frente a 12 bytes, una lectura y una escritura', () => {
    const c = compare('store');
    expect(c.cisc).toMatchObject({ instructions: 1, bytes: 4, dataReads: 1, dataWrites: 1, result: 12 });
    expect(c.cisc.encoding).toEqual(['01', '06', '0A', '00']);
    expect(c.risc).toMatchObject({ instructions: 3, bytes: 12, dataReads: 1, dataWrites: 1, result: 12 });
    expect(c.same).toBe(true);
    expect(c.sameDataTraffic).toBe(true);
  });

  it('otros datos dan el mismo resultado en ambos estilos', () => {
    for (const [acc, word] of [[0, 0], [100, 250], [0xffff, 1]] as const) {
      const sum = compare('sum', acc, word);
      expect(sum.cisc.result).toBe((acc + word) & 0xffff);
      expect(sum.same).toBe(true);
    }
  });

  it('el RISC solo toca la memoria con LDR y STR', () => {
    const r = runRisc([{ op: 'LDR', rd: 1, base: 0, offset: 2 }, { op: 'ADD', rd: 1, rn: 1, rm: 1 }, { op: 'STR', rs: 1, base: 0, offset: 4 }], [100, 0, 0, 0], { 102: 21 });
    expect(r.memory[104]).toBe(42);
    expect([r.reads, r.writes]).toEqual([1, 1]);
    expect(riscText({ op: 'STR', rs: 1, base: 0, offset: 4 })).toBe('STR R1,[R0,#4]');
  });
});

describe('memoria unificada con salida tangible', () => {
  it('invierte los 64 valores: 0→255, 255→0, 128→127; ambas configuraciones dan la misma imagen', () => {
    const tile = Array.from({ length: TILE_SIZE }, (_, i) => (i === 0 ? 0 : i === 1 ? 255 : i === 2 ? 128 : i * 3));
    const results = (['shared', 'separate'] as const).map((mode) => {
      const b = new BufferExperiment();
      b.setInput(tile);
      b.setMode(mode);
      b.advance();
      b.advance();
      return b.view.output.values;
    });
    expect(results[0]).toEqual(results[1]);
    expect(results[0].slice(0, 3)).toEqual([255, 0, 127]);
    expect(results[0]).toHaveLength(64);
  });

  it('separada: 64 bytes al dispositivo y 64 de vuelta; compartida: ninguna copia explícita', () => {
    const shared = new BufferExperiment();
    shared.advance();
    shared.advance();
    expect(shared.explicitCopyBytes).toBe(0);
    const separate = new BufferExperiment();
    separate.setMode('separate');
    separate.advance();
    expect(separate.copies).toEqual({ toDevice: 64, fromDevice: 0 });
    separate.advance();
    expect(separate.copies).toEqual({ toDevice: 64, fromDevice: 64 });
    expect(separate.explicitCopyBytes).toBe(128);
  });

  it('una lectura prematura muestra espera, no un resultado válido', () => {
    const b = new BufferExperiment();
    expect(b.readOutput().kind).toBe('waiting');
    b.advance();
    const early = b.readOutput();
    expect(early.kind).toBe('waiting');
    if (early.kind === 'waiting') expect(early.reason).toContain('B1 no es válido');
    b.advance();
    expect(b.readOutput()).toMatchObject({ kind: 'ready' });
  });

  it('cambiar la entrada cambia la salida, conserva la identidad de B0 y B1 y exige un mosaico válido', () => {
    const b = new BufferExperiment();
    b.advance();
    b.advance();
    const first = b.view.output.values[1];
    const tile = defaultTile().map((v) => Math.min(255, v + 1));
    b.setInput(tile);
    expect(b.view.completed).toBe(false);
    b.advance();
    b.advance();
    expect(b.view.output.values[1]).not.toBe(first);
    expect([b.view.input.id, b.view.output.id]).toEqual(['B0', 'B1']);
    expect(() => b.setInput([1, 2, 3])).toThrow('64 valores');
    expect(() => b.setInput(Array(64).fill(256))).toThrow();
    expect(validTile(Array(64).fill(0))).toBe(true);
  });

  it('el tercer avance reinicia el recorrido con la misma entrada', () => {
    const b = new BufferExperiment();
    b.advance();
    b.advance();
    b.advance();
    expect(b.view).toMatchObject({ stage: 0, completed: false });
    expect(b.view.output.values).toEqual([]);
  });
});
