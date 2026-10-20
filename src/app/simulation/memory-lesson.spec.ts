import { describe, expect, it } from 'vitest';
import { Cpu8086 } from './cpu8086';
import {
  ADDRESSING_MODES,
  ExerciseMemory,
  aliasOf,
  bankOf,
  buildAddress,
  formatWord,
  joinWord,
  sameAddress,
  splitWord,
  windowOf,
  wordCycles,
} from './memory-lesson';

describe('guardar y leer una palabra', () => {
  it('1234h queda como 34h en la dirección menor y 12h en la siguiente', () => {
    expect(splitWord(0x1234)).toEqual({ low: 0x34, high: 0x12 });
    expect(joinWord(0x34, 0x12)).toBe(0x1234);
    const m = new ExerciseMemory();
    m.writeWord(0x10020, 0x1234);
    expect([m.byte(0x10020), m.byte(0x10021)]).toEqual([0x34, 0x12]);
    expect(m.readWord(0x10020)).toBe(0x1234);
  });

  it('la palabra del último byte da la vuelta a 20 bits', () => {
    const m = new ExerciseMemory();
    m.writeWord(0xfffff, 0xabcd);
    expect([m.byte(0xfffff), m.byte(0)]).toEqual([0xcd, 0xab]);
  });

  it('formatos alternativos con etiqueta', () => {
    expect(formatWord(0x1234, 'hex')).toBe('1234h');
    expect(formatWord(0x1234, 'dec')).toBe('4660 (decimal)');
    expect(formatWord(0x1234, 'bin')).toBe('0001 0010 0011 0100 (binario)');
    expect(formatWord(0x4241, 'ascii')).toContain('«AB»');
    expect(formatWord(0x0001, 'ascii')).toContain('«·');
  });

  it('el ejercicio no toca la memoria del 8086', () => {
    const cpu = new Cpu8086();
    cpu.load('ADD AX, [10]\nHLT');
    const before = JSON.stringify(cpu.snapshot());
    const m = new ExerciseMemory();
    m.writeWord(0x2000a, 0x9999);
    expect(JSON.stringify(cpu.snapshot())).toBe(before);
    expect(cpu.readWord(0x2000, 10)).toBe(5);
  });

  it('par/impar: un ciclo del modelo en dirección par, dos en impar', () => {
    expect([wordCycles(0x10020), wordCycles(0x10021)]).toEqual([1, 2]);
    expect([bankOf(0x10020), bankOf(0x10021)]).toEqual(['par', 'impar']);
  });
});

describe('construir una dirección por pasos', () => {
  const input = { mode: 'bx+si', registers: { BX: 0x10, BP: 0, SI: 2, DI: 0 }, displacement: 4, segments: { DS: 0x1000, SS: 0x3000 } };

  it('[BX+SI+4] con BX=0010h y SI=0002h: EA 0016h y física 10016h con DS=1000h', () => {
    const a = buildAddress(input);
    expect(a.ea).toBe(0x16);
    expect(a.physical).toBe(0x10016);
    expect(a.segmentName).toBe('DS');
    expect(a.steps.map((s) => s.title)).toEqual(['Modo de direccionamiento', 'Dirección efectiva', 'Segmento', 'Dirección física']);
    expect(a.steps[0].text).toContain('[BX+SI+0004h]');
    expect(a.steps[1].text).toContain('0010h + 0002h + 0004h = 0016h');
    expect(a.steps[3].text).toBe('física = 1000h × 16 + 0016h = 10016h.');
  });

  it('con BP el segmento es SS', () => {
    const a = buildAddress({ ...input, mode: 'bp+di', registers: { BX: 0, BP: 8, SI: 0, DI: 1 }, displacement: 0 });
    expect(a.segmentName).toBe('SS');
    expect(a.physical).toBe(0x30009);
    expect(a.steps[2].text).toContain('SS = 3000h');
  });

  it('la dirección efectiva da la vuelta a 16 bits y la física a 20', () => {
    const a = buildAddress({ ...input, mode: 'bx', registers: { BX: 0xffff, BP: 0, SI: 0, DI: 0 }, displacement: 2 });
    expect(a.ea).toBe(1);
    const b = buildAddress({ ...input, mode: 'direct', displacement: 0xffff, segments: { DS: 0xffff, SS: 0 } });
    expect(b.physical).toBe(0x0ffef);
  });

  it('todos los modos del subconjunto se construyen y un modo desconocido se rechaza', () => {
    for (const mode of ADDRESSING_MODES) expect(() => buildAddress({ ...input, mode: mode.id })).not.toThrow();
    expect(() => buildAddress({ ...input, mode: 'sp' })).toThrow('desconocido');
  });

  it('el 8086 de la sesión calcula la misma dirección que la lección', () => {
    const cpu = new Cpu8086();
    cpu.load('MOV BX, 10h\nMOV SI, 2\nMOV AX, [BX+SI+4]\nHLT');
    cpu.registers.DS = 0x1000;
    cpu.writeWord(0x1000, 0x16, 0xbeef);
    for (let n = 0; n < 3; n++) cpu.step();
    expect(cpu.registers.AX).toBe(0xbeef);
    expect(cpu.trace[2].reads).toEqual([buildAddress(input).physical]);
  });
});

describe('alias y ventanas', () => {
  it('1000:0020 y 1001:0010 son el mismo byte, 10020h', () => {
    expect(sameAddress({ segment: 0x1000, offset: 0x20 }, { segment: 0x1001, offset: 0x10 })).toBe(true);
    expect(aliasOf({ segment: 0x1000, offset: 0x20 })).toEqual({ segment: 0x1001, offset: 0x10 });
    expect(sameAddress({ segment: 0x1000, offset: 0x20 }, { segment: 0x1000, offset: 0x21 })).toBe(false);
  });

  it('un alias existe solo si cabe', () => {
    expect(aliasOf({ segment: 0x1000, offset: 3 })?.segment).toBe(0x0fff);
    expect(aliasOf({ segment: 0xffff, offset: 3 })?.segment).toBe(0xfffe);
    expect(aliasOf({ segment: 0, offset: 3 })).toBeUndefined();
  });

  it('10020h y 30020h caen en ventanas distintas de 128 KiB y no se confunden', () => {
    const a = windowOf(0x10020);
    const b = windowOf(0x30020);
    expect(a).toEqual({ index: 0, base: 0, offset: 0x10020 });
    expect(b).toEqual({ index: 1, base: 0x20000, offset: 0x10020 });
    expect(a.index).not.toBe(b.index);
    expect(windowOf(0xfffff).index).toBe(7);
    expect(windowOf(0x100000 + 5).index).toBe(0);
  });
});
