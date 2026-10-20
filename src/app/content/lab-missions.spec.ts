import { describe, expect, it } from 'vitest';
import { Cpu8086 } from '../simulation/cpu8086';
import { LAB_MISSIONS, MISSION_LEVELS, meetsExpectation } from './missions';

describe('misiones 01–18', () => {
  it('cada misión está exactamente en un nivel y la numeración es continua', () => {
    expect(LAB_MISSIONS.map((m) => m.number)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    const listed = MISSION_LEVELS.flatMap((l) => [...l.numbers]).sort((a, b) => a - b);
    expect(listed).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    for (const m of LAB_MISSIONS) expect(MISSION_LEVELS.find((l) => l.level === m.level)!.numbers).toContain(m.number);
  });

  it('las cuatro agrupaciones del plan', () => {
    const by = (level: string) => MISSION_LEVELS.find((l) => l.level === level)!.numbers;
    expect(by('Fundamentos')).toEqual([1, 2, 3, 6, 8]);
    expect(by('Control de flujo')).toEqual([4, 5, 12, 14, 15]);
    expect(by('Entrada y salida')).toEqual([10, 11, 13, 16, 18]);
    expect(by('Pila, procedimientos y macros')).toEqual([7, 9, 17]);
  });

  it.each(LAB_MISSIONS.filter((m) => m.expect).map((m) => [m.title, m] as const))('%s se comprueba sola', (_t, mission) => {
    const cpu = new Cpu8086();
    cpu.load(mission.source);
    if (mission.keys) cpu.type(mission.keys);
    if (mission.switches !== undefined) cpu.setSwitches(mission.switches);
    let n = 0;
    while (!cpu.halted && n++ < 20000) cpu.execute();
    expect(meetsExpectation(mission.expect!, cpu.snapshot(), cpu.program!.data)).toBe(true);
    // The check is not trivially true: a program that stopped at the start does not meet it.
    const fresh = new Cpu8086();
    fresh.load(mission.source);
    expect(meetsExpectation(mission.expect!, fresh.snapshot(), fresh.program!.data)).toBe(false);
    expect(mission.predict?.question).toBeTruthy();
    expect(mission.observe).toBeTruthy();
  });

  it('la macro de la misión 17 aparece expandida en el listado', () => {
    const cpu = new Cpu8086();
    cpu.load(LAB_MISSIONS[16].source);
    expect(cpu.program!.macroExpansions).toHaveLength(2);
    expect(cpu.program!.macroExpansions[0].expanded[0]).toContain('MOV DX, OFFSET saludo');
  });
});
