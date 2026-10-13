import { it, expect } from 'vitest';
import { MISSIONS } from './missions';
import { Cpu8086 } from '../simulation/cpu8086';
for (const [index, mission] of MISSIONS.entries())
  it('academic_mission_' + (index + 1) + '_reaches_reference_state', () => {
    const cpu = new Cpu8086();
    cpu.load(mission.source);
    let count = 0;
    while (!cpu.halted && count++ < 2048) cpu.step();
    expect(cpu.halted).toBe(true);
    expect(cpu.registers.AX).toBe(mission.answer);
    if (index === 1) expect([cpu.flags.CF, cpu.flags.OF]).toEqual([true, false]);
    if (index === 2) expect([cpu.flags.CF, cpu.flags.OF]).toEqual([false, true]);
    if (index === 4) expect(cpu.registers.BX).toBe(1);
    if (index === 5) {
      expect(cpu.registers.BX).toBe(0x1234);
      expect(cpu.readWord(cpu.registers.DS, 32)).toBe(0x1234);
    }
    if (index === 6) expect(cpu.readWord(cpu.registers.SS, 10)).toBe(9);
    if (index === 7) expect(cpu.flags.CF).toBe(true);
  });
