import { describe, expect, it } from 'vitest';
import { Cpu8086 } from '../cpu8086';
import { digitOf, isConfigured, readPort, segmentsOn, setSwitches, writePort, PPI_CONTROL, PPI_PORT_A, PPI_PORT_B, PPI_PORT_C } from './ppi8255';

const run = (source: string, switches?: number) => {
  const cpu = new Cpu8086();
  cpu.load(source);
  if (switches !== undefined) cpu.setSwitches(switches);
  let n = 0;
  while (!cpu.halted && n++ < 200) cpu.step();
  return cpu;
};
const setup = 'MOV AL, 82h\nOUT 0A3h, AL\n';

describe('8255 didáctico', () => {
  it('OUT al puerto A enciende los LEDs del patrón', () => {
    const cpu = run(setup + 'MOV AL, 0A5h\nOUT 0A0h, AL\nHLT');
    expect(cpu.io.ports![PPI_PORT_A]).toBe(0xa5);
    expect(cpu.io.ports![PPI_CONTROL]).toBe(0x82);
  });

  it('IN desde B lee los interruptores', () => {
    const cpu = run(setup + 'IN AL, 0A1h\nHLT', 0x3c);
    expect(cpu.registers.AX & 255).toBe(0x3c);
  });

  it('copiar los interruptores a los LEDs, con DX', () => {
    const cpu = run(setup + 'MOV DX, 0A1h\nIN AL, DX\nMOV DX, 0A0h\nOUT DX, AL\nHLT', 0x81);
    expect(cpu.io.ports![PPI_PORT_A]).toBe(0x81);
  });

  it('el puerto C maneja el display de siete segmentos', () => {
    const cpu = run(setup + 'MOV AL, 5Bh\nOUT 0A2h, AL\nHLT');
    expect(cpu.io.ports![PPI_PORT_C]).toBe(0x5b);
    expect(digitOf(0x5b)).toBe('2');
    expect(segmentsOn(0x5b)).toEqual(['a', 'b', 'd', 'e', 'g']);
  });

  it('sin configurar o en un puerto inexistente, el error lo explica y no cambia el estado', () => {
    const cpu = new Cpu8086();
    cpu.load('MOV AL, 1\nOUT 0A0h, AL\nHLT');
    cpu.step();
    const before = cpu.snapshot();
    expect(() => cpu.step()).toThrow(/no está configurado.*82h.*A3h/);
    expect(cpu.snapshot()).toEqual(before);
    const stray = new Cpu8086();
    stray.load('OUT 10h, AL\nHLT');
    expect(() => stray.step()).toThrow(/Ningún dispositivo responde en el puerto 10h/);
    const input = new Cpu8086();
    input.load(setup + 'MOV AL, 3\nOUT 0A1h, AL\nHLT');
    input.step(); input.step();
    input.step();
    expect(() => input.step()).toThrow(/puerto B está configurado como entrada/);
  });

  it('solo admite la palabra de control 82h y escribirla es obligatorio antes de leer', () => {
    expect(() => writePort({}, PPI_CONTROL, 0x90)).toThrow('82h');
    expect(() => readPort({}, PPI_PORT_B)).toThrow('no está configurado');
    expect(isConfigured(writePort({}, PPI_CONTROL, 0x82))).toBe(true);
    expect(readPort(setSwitches(writePort({}, PPI_CONTROL, 0x82), 7), PPI_PORT_B)).toBe(7);
    expect(() => readPort(writePort({}, PPI_CONTROL, 0x82), PPI_CONTROL)).toThrow('solo se escribe');
  });

  it('IN y OUT con puerto inmediato > 255 o registro distinto de AL piden otra forma', () => {
    const cpu = new Cpu8086();
    expect(() => cpu.load('OUT 300h, AL')).toThrow(/0 a 255/);
    expect(() => cpu.load('OUT DX, AX')).toThrow(/AL/);
    expect(() => cpu.load('IN BL, DX')).toThrow(/AL/);
    expect(cpu.load.bind(cpu, 'IN AL, DX\nOUT DX, AL\nHLT')).not.toThrow();
  });

  it('se codifica como el 8086 real y restaura con Atrás', () => {
    const cpu = new Cpu8086();
    cpu.load('IN AL, 0A1h\nIN AL, DX\nOUT 0A0h, AL\nOUT DX, AL\nHLT');
    expect(cpu.instructions.map((i) => i.bytes)).toEqual([[0xe4, 0xa1], [0xec], [0xe6, 0xa0], [0xee], [0xf4]]);
    const run2 = new Cpu8086();
    run2.load(setup + 'MOV AL, 9\nOUT 0A0h, AL\nHLT');
    for (let n = 0; n < 4; n++) run2.step();
    expect(run2.io.ports![PPI_PORT_A]).toBe(9);
    run2.restore(run2.trace[3].before);
    expect(run2.io.ports![PPI_PORT_A]).toBeUndefined();
  });
});
