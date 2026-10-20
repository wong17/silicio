import { describe, expect, it } from 'vitest';
import { COURSE_PROGRAMS } from '../../content/course-programs';
import { Cpu8086 } from '../cpu8086';

describe('programas del curso (§4.4) sin interfaz', () => {
  it.each(COURSE_PROGRAMS.map((p) => [p.mission + ' ' + p.title, p] as const))('%s', (_name, program) => {
    const cpu = new Cpu8086();
    cpu.load(program.source);
    if (program.keys) cpu.type(program.keys);
    let steps = 0;
    while (!cpu.halted && steps++ < 20000) {
      const r = cpu.execute();
      expect(['executed', 'halted'], 'resultado en el paso ' + steps + ': ' + JSON.stringify(r)).toContain(r.kind);
    }
    expect(cpu.halted).toBe(true);
    const { expect: want } = program;
    if (want.screen !== undefined) expect(cpu.io.screen).toBe(want.screen);
    if (want.screenEndsWith !== undefined) expect(cpu.io.screen.endsWith(want.screenEndsWith)).toBe(true);
    for (const [name, value] of Object.entries(want.registers ?? {}))
      expect(cpu.registers[name as 'AX'], name).toBe(value);
    if (want.variable) {
      const symbol = cpu.program!.data.find((d) => d.name.toLowerCase() === want.variable!.name.toLowerCase())!;
      const read = symbol.type === 'word' ? cpu.readWord(cpu.registers.DS, symbol.address) : (cpu.memory[cpu.registers.DS * 16 + symbol.address] ?? 0);
      expect(read).toBe(want.variable.value);
    }
  });

  it('el programa de la misión 11 espera el teclado y se reanuda al escribir', () => {
    const program = COURSE_PROGRAMS.find((p) => p.mission === 11)!;
    const cpu = new Cpu8086();
    cpu.load(program.source);
    for (let n = 0; n < 2; n++) cpu.execute();
    expect(cpu.execute().kind).toBe('waiting-input');
    expect(cpu.execute().kind).toBe('waiting-input');
    cpu.type('3');
    expect(cpu.execute().kind).toBe('executed');
  });
});
