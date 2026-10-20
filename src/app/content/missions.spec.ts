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

import { assemble } from '../simulation/cpu8086';
it('academic_mission_9_names_the_real_addresses', () => {
  const mission = MISSIONS[8];
  const program = assemble(mission.source).instructions;
  const call = program.find((i) => i.op === 'CALL')!;
  expect(call.address).toBe(0x103);
  expect(call.address + call.bytes.length).toBe(0x106);
  expect(call.target).toBe(0x109);
  for (const text of ['0103h', '0106h', '0109h']) expect(mission.goal).toContain(text);
  const cpu = new Cpu8086();
  cpu.load(mission.source);
  while (!cpu.halted) cpu.step();
  expect([cpu.registers.AX, cpu.registers.BX, cpu.registers.SP]).toEqual([10, 10, 0xfffe]);
});
