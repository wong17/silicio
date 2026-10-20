import { describe, expect, it } from 'vitest';
import { asText, importFile, importText, parseCsv, utf8Encode } from './pc-files';
import { decode, format } from './pc-isa';
import {
  FRAMEBUFFER_BASE, INPUT_BASE, KEYBOARD_VECTOR, PROGRAM_BASE, ROM_WORDS, WORK_BASE,
  boot, offState, powerOff, powerOn, pressKey, readWord, replay, run, stepPc, typeText,
  type PcState,
} from './pc-model';
import { PC_PROGRAMS, freshPc, programWords } from './pc-programs';

const started = (id: Parameters<typeof freshPc>[0]) => boot(freshPc(id)).state;
const done = (s: PcState) => {
  const r = run(s);
  expect(['halted']).toContain(r.outcome);
  return r.state;
};

describe('arranque', () => {
  it('encender deja la RAM vacía, el PC en la ROM y la ROM intacta; el cargador copia el programa y salta', () => {
    const fresh = freshPc('hola-sondeo');
    const on = powerOn(fresh);
    expect(on.state.pc).toBe(0);
    expect(on.state.ram.program.every((w) => w === 0)).toBe(true);
    expect(on.events).toHaveLength(1);
    expect(on.events[0].text).toContain('ROM');
    const booted = boot(fresh);
    expect(booted.events).toHaveLength(3);
    expect(booted.state.pc).toBe(PROGRAM_BASE);
    expect([...booted.state.ram.program.slice(0, programWords(PC_PROGRAMS[0]).length)]).toEqual(programWords(PC_PROGRAMS[0]));
    expect(ROM_WORDS.map((w) => format(decode(w)))).toEqual(['READ_FILE R3, program, programa.bin', 'BRANCH ALWAYS, 4096']);
    for (let a = 0; a < 2; a++) expect(readWord(booted.state, a)).toBe(ROM_WORDS[a]);
    expect(() => stepPc(offState())).not.toThrow();
    expect(stepPc(offState()).kind).toBe('fault');
  });

  it('la ROM no se puede escribir', () => {
    const s = started('hola-sondeo');
    const bad: PcState = { ...s, regs: [0, 0, 0, 0] };
    const words = [...bad.ram.program];
    words[0] = ROM_WORDS[0];
    // STORE [R0+0], R1 with R0 = 0 writes to the ROM.
    const storeWord = programWords({ ...PC_PROGRAMS[0], source: 'STORE [R0], R1\nHALT' })[0];
    words[0] = storeWord;
    const out = stepPc({ ...bad, ram: { ...bad.ram, program: words }, pc: PROGRAM_BASE });
    expect(out.kind).toBe('fault');
    if (out.kind === 'fault') expect(out.message).toContain('ROM');
  });
});

describe('ciclo de instrucción', () => {
  it('en cada operación MAR toma el PC antes de leer, IR recibe lo de MDR y el PC avanza; todos los eventos tienen función', () => {
    let s = started('suma-archivo');
    for (let n = 0; n < 12; n++) {
      const before = s;
      const out = stepPc(s);
      if (out.kind !== 'executed') break;
      const [toMar, fromMemory, toIr, increment] = out.events;
      expect(toMar.source).toBe('cpu-pc');
      expect(toMar.target).toBe('cpu-mar');
      expect(toMar.address).toBe(before.pc);
      expect(toMar.bus.address).toBe(before.pc);
      expect(fromMemory.target).toBe('cpu-mdr');
      expect(fromMemory.value).toBe(readWord(before, before.pc));
      expect(toIr.source).toBe('cpu-mdr');
      expect(toIr.target).toBe('cpu-ir');
      expect(out.state.ir).toBe(fromMemory.value);
      expect(increment.changes[0].after).toBe((before.pc + 1).toString(16).toUpperCase().padStart(4, '0') + 'h');
      expect(out.events.every((e) => ['processing', 'storage', 'transfer', 'control'].includes(e.role))).toBe(true);
      expect(out.events.map((e) => e.phase)).toEqual([...out.events.map((e) => e.phase)].sort());
      expect(out.events.at(-1)!.phase).toBe(7);
      s = out.state;
    }
  });

  it('un paso no modifica el estado anterior: el historial conserva cada instante', () => {
    const s = started('suma-archivo');
    const before = JSON.stringify(s);
    const out = stepPc(s);
    expect(out.kind).toBe('executed');
    expect(JSON.stringify(s)).toBe(before);
    expect(out.kind === 'executed' && out.state.counters.instructions).toBe(s.counters.instructions + 1);
  });
});

describe('programas', () => {
  it('Escribir y ver: «Hola» del teclado al monitor, por sondeo', () => {
    const s = typeText(started('hola-sondeo'), 'Hola\n');
    const end = done(s);
    expect(end.monitor.mode).toBe('text');
    expect(end.monitor.text.trim()).toBe('Hola');
    expect(end.counters.polls).toBe(0);
  });

  it('Sumar archivo: 1,2,3,4 da 10 en pantalla y en resultado.txt', () => {
    const end = done(started('suma-archivo'));
    expect(end.monitor.mode).toBe('number');
    expect(end.monitor.text).toBe('10');
    expect(asText(end.ssd, 'resultado.txt')).toBe('10');
  });

  it('cambiar el CSV cambia la suma', () => {
    const s = started('suma-archivo');
    const changed: PcState = { ...s, ssd: importText(s.ssd, 'datos.csv', '10, 20\n30\n-5') };
    expect(asText(done(changed).ssd, 'resultado.txt')).toBe('55');
  });

  it('un desbordamiento se informa y no publica una suma engañosa', () => {
    const s = started('suma-archivo');
    const big: PcState = { ...s, ssd: importText(s.ssd, 'datos.csv', '2147483647,1') };
    const end = done(big);
    expect(end.monitor.mode).toBe('error');
    expect(end.monitor.message).toContain('Desbordamiento');
    expect(end.ssd['resultado.txt']).toBeUndefined();
  });

  it('Editar y guardar: «Hola» pasa a «HOLA», se guarda, y apagar y encender lo recupera', () => {
    const end = done(started('editar-guardar'));
    expect(end.monitor.text).toBe('HOLA');
    expect(asText(end.ssd, 'nota.txt')).toBe('HOLA');
    const off = powerOff(end);
    expect(off.power).toBe('off');
    expect(off.ram.input.every((w) => w === 0)).toBe(true);
    expect(off.monitor.mode).toBe('off');
    expect(off.regs).toEqual([0, 0, 0, 0]);
    expect(asText(off.ssd, 'nota.txt')).toBe('HOLA');
    const again = boot(off).state;
    expect(asText(again.ssd, 'nota.txt')).toBe('HOLA');
    expect(again.ram.input.every((w) => w === 0)).toBe(true);
  });

  it('el texto con acentos y minúsculas se procesa palabra a palabra', () => {
    const s = started('editar-guardar');
    const text: PcState = { ...s, ssd: importText(s.ssd, 'nota.txt', 'añb Zz1') };
    expect(asText(done(text).ssd, 'nota.txt')).toBe('AñB ZZ1');
  });

  it('Procesar una imagen: invierte los 64 valores del mosaico', () => {
    const s = started('imagen-inversa');
    const values = Array.from({ length: 64 }, (_, i) => (i === 0 ? 0 : i === 1 ? 255 : i === 2 ? 128 : i * 3));
    const mosaic: PcState = { ...s, ssd: importText(s.ssd, 'imagen.csv', values.join(',')) };
    const end = done(mosaic);
    expect(end.monitor.mode).toBe('image');
    expect(end.monitor.pixels).toEqual(values.map((v) => 255 - v));
    expect(end.monitor.pixels.slice(0, 3)).toEqual([255, 0, 127]);
    expect(end.ram.framebuffer.slice(0, 64)).toEqual(end.monitor.pixels);
  });

  it('la imagen por defecto es un degradado que invierte a otro degradado', () => {
    const end = done(started('imagen-inversa'));
    expect(end.monitor.pixels).toHaveLength(64);
    expect(end.monitor.pixels[0]).toBe(255);
    expect(end.monitor.pixels[63]).toBe(0);
  });
});

describe('interrupción frente a sondeo', () => {
  const typed = (id: Parameters<typeof freshPc>[0], text: string) => {
    let s = started(id);
    // The keys arrive while the program is already running its first instructions.
    for (let n = 0; n < 8; n++) s = (stepPc(s) as { state: PcState }).state;
    return typeText(s, text);
  };

  it('con tres teclas, la variante por interrupción avanza el contador de fondo y la de sondeo no; ambas muestran lo mismo', () => {
    const poll = run(typed('hola-sondeo', 'Hol\n'));
    const irq = run(typed('hola-interrupcion', 'Hol\n'));
    expect(poll.outcome).toBe('halted');
    expect(irq.outcome).toBe('halted');
    expect(poll.state.monitor.text).toBe(irq.state.monitor.text);
    expect(poll.state.monitor.text.trim()).toBe('Hol');
    expect(poll.state.ram.work[0]).toBe(0);
    expect(irq.state.ram.work[0]).toBeGreaterThan(0);
    expect(irq.state.counters.interrupts).toBe(4);
    expect(poll.state.counters.interrupts).toBe(0);
  });

  it('el sondeo cuenta consultas en vano mientras espera', () => {
    let s = started('hola-sondeo');
    for (let n = 0; n < 30; n++) s = (stepPc(s) as { state: PcState }).state;
    expect(s.counters.polls).toBeGreaterThan(5);
  });

  it('la interrupción se atiende al final de la instrucción en curso, guarda PC y flags y RETI los restaura', () => {
    let s = started('hola-interrupcion');
    // Run until the main loop is going and interrupts are enabled.
    for (let n = 0; n < 12; n++) s = (stepPc(s) as { state: PcState }).state;
    expect(s.interrupt.enabled).toBe(true);
    s = pressKey(s, 'x'.charCodeAt(0));
    const before = s;
    const out = stepPc(s);
    expect(out.kind).toBe('executed');
    if (out.kind !== 'executed') return;
    const irqEvents = out.events.filter((e) => e.bus.control === 'interrupt');
    expect(irqEvents).toHaveLength(2);
    expect(irqEvents.every((e) => e.phase === 7)).toBe(true);
    // The instruction in course completed first (its own events are there) and only then did the PC jump.
    expect(out.state.pc).toBe(KEYBOARD_VECTOR);
    expect(out.state.interrupt.saved!.pc).toBeGreaterThan(PROGRAM_BASE);
    expect(before.interrupt.inService).toBe(false);
    expect(out.state.interrupt.inService).toBe(true);
    const savedFlags = out.state.interrupt.saved!.flags;
    let t = out.state;
    for (let n = 0; n < 40 && t.interrupt.inService; n++) t = (stepPc(t) as { state: PcState }).state;
    expect(t.interrupt.inService).toBe(false);
    expect(t.flags).toEqual(savedFlags);
    expect(t.pc).toBe(out.state.interrupt.saved!.pc);
    expect(t.ram.work[1]).toBe(1);
    expect(t.ram.work[2]).toBe('x'.charCodeAt(0));
  });

  it('sin interrupciones habilitadas, una tecla no interrumpe', () => {
    let s = started('hola-interrupcion');
    s = pressKey(s, 65);
    const out = stepPc(s);
    expect(out.kind === 'executed' && out.state.counters.interrupts).toBe(0);
  });
});

describe('entradas, límites y errores', () => {
  it('esperar el teclado detiene sin consumir nada y se reanuda al llegar la tecla', () => {
    let s = started('hola-sondeo');
    // Force an INPUT on an empty queue.
    const inputWord = programWords({ ...PC_PROGRAMS[0], source: 'INPUT R1\nHALT' })[0];
    const words = [...s.ram.program];
    words[0] = inputWord;
    s = { ...s, ram: { ...s.ram, program: words }, pc: PROGRAM_BASE };
    const out = stepPc(s);
    expect(out.kind).toBe('waiting');
    if (out.kind === 'waiting') {
      expect(out.reason).toBe('keyboard');
      expect(out.state).toBe(s);
    }
    const resumed = stepPc(pressKey(s, 66));
    expect(resumed.kind).toBe('executed');
    expect(resumed.kind === 'executed' && resumed.state.regs[1]).toBe(66);
  });

  it('el texto tiene un máximo de 256 caracteres por envío', () => {
    const s = freshPc('editar-guardar');
    expect(() => importText(s.ssd, 'nota.txt', 'a'.repeat(257))).toThrow('256');
    expect(() => importText(s.ssd, 'nota.txt', 'a'.repeat(256))).not.toThrow();
    const on = boot(s).state;
    expect(() => typeText(on, 'b'.repeat(257))).toThrow('256');
  });

  it('un archivo no puede pasar de 64 KiB, ni ser UTF-8 inválido, ni un CSV mal formado', () => {
    const files = freshPc('suma-archivo').ssd;
    expect(() => importFile(files, 'nota.txt', new Array(64 * 1024 + 1).fill(97))).toThrow('64 KiB');
    expect(() => importFile(files, 'nota.txt', [0xff, 0xfe, 0x41])).toThrow('UTF-8');
    expect(() => importFile(files, 'datos.csv', utf8Encode('1,2,x'))).toThrow('Valor inválido «x»');
    expect(() => importFile(files, 'datos.csv', utf8Encode('1,,2'))).toThrow('campo vacío');
    expect(() => importFile(files, 'datos.csv', utf8Encode('2147483648'))).toThrow('32 bits');
    expect(() => importFile(files, 'datos.csv', utf8Encode(Array(1025).fill(1).join(',')))).toThrow('1024');
    expect(() => importFile(files, 'imagen.csv', utf8Encode('1,2,3'))).toThrow('64 valores');
    expect(() => importFile(files, 'programa.bin', [1, 2, 3, 4])).toThrow('no se puede importar');
    expect(parseCsv('1, -2\n+3,4\n')).toEqual([1, -2, 3, 4]);
    expect(parseCsv(Array(1024).fill(7).join(','))).toHaveLength(1024);
  });

  it('un CSV de 1024 enteros cabe en la RAM de entrada y los datos pueden ser negativos', () => {
    const s = started('suma-archivo');
    const many: PcState = { ...s, ssd: importText({ ...s.ssd }, 'datos.csv', '1') };
    const files = importFile(s.ssd, 'datos.csv', utf8Encode(Array(1024).fill(2).join(',')));
    expect(asText(done({ ...many, ssd: files }).ssd, 'resultado.txt')).toBe('2048');
  });

  it('un archivo inexistente o corrupto se explica y no cambia el estado', () => {
    const s = started('suma-archivo');
    const missing: PcState = { ...s, ssd: { ...s.ssd, 'datos.csv': undefined as never } };
    const broken = { ...s.ssd, 'datos.csv': [0xc3, 0x28] };
    const r = run({ ...missing, ssd: Object.fromEntries(Object.entries(missing.ssd).filter(([k]) => k !== 'datos.csv')) });
    expect(r.outcome).toBe('fault');
    expect(r.message).toContain('datos.csv no existe');
    const r2 = run({ ...s, ssd: broken });
    expect(r2.outcome).toBe('fault');
    expect(r2.message).toContain('UTF-8');
  });

  it('las teclas se registran y repetirlas da exactamente la misma ejecución', () => {
    let s = started('hola-interrupcion');
    for (let n = 0; n < 10; n++) s = (stepPc(s) as { state: PcState }).state;
    s = pressKey(s, 72);
    for (let n = 0; n < 5; n++) s = (stepPc(s) as { state: PcState }).state;
    s = typeText(s, 'ola\n');
    const end = run(s).state;
    expect(end.inputs.map((i) => i.code)).toEqual([72, 111, 108, 97, 10]);
    const base = started('hola-interrupcion');
    const again = replay(base, end.inputs, end.counters.instructions);
    expect(JSON.stringify(again)).toBe(JSON.stringify(end));
  });

  it('reiniciar el ejercicio restaura el SSD de fábrica; apagar conserva lo guardado', () => {
    const end = done(started('editar-guardar'));
    expect(asText(powerOff(end).ssd, 'nota.txt')).toBe('HOLA');
    expect(asText(freshPc('editar-guardar').ssd, 'nota.txt')).toBe('Hola');
  });

  it('la memoria fuera del mapa da un error explicado', () => {
    const s = started('hola-sondeo');
    expect(() => readWord(s, 0x0fff)).toThrow('no existe');
    expect(() => readWord(s, FRAMEBUFFER_BASE + 0x800)).toThrow('no existe');
    expect(INPUT_BASE + 0x400).toBeLessThan(WORK_BASE + 1);
  });
});
