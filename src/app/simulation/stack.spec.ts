import { describe, expect, it } from 'vitest';
import { assemble, Cpu8086, physicalAddress } from './cpu8086';

const run = (source: string, steps: number) => {
  const cpu = new Cpu8086();
  cpu.load(source);
  for (let i = 0; i < steps; i++) cpu.step();
  return cpu;
};

describe('pila, CALL y RET', () => {
  it('push_then_pop_restores_register_and_sp', () => {
    const cpu = run('MOV AX, 1234h\nPUSH AX\nMOV AX, 0\nPOP AX\nHLT', 4);
    expect(cpu.registers.AX).toBe(0x1234);
    expect(cpu.registers.SP).toBe(0xfffe);
  });

  it('push_writes_the_word_little_endian_at_ss_sp', () => {
    const cpu = run('MOV AX, 1234h\nPUSH AX\nHLT', 2);
    expect(cpu.registers.SP).toBe(0xfffc);
    const at = physicalAddress(cpu.registers.SS, 0xfffc);
    expect(cpu.memory[at]).toBe(0x34);
    expect(cpu.memory[at + 1]).toBe(0x12);
    const event = cpu.trace[1];
    expect(event.writes).toEqual([at]);
    expect(event.operation?.accesses[0]).toMatchObject({ kind: 'write', value: 0x1234 });
  });

  it('call_stores_the_next_ip_on_the_stack', () => {
    const cpu = run('CALL rutina\nHLT\nrutina:\nRET', 1);
    // CALL is 3 bytes at 0100h: the return address is 0103h and the jump goes to the routine at 0104h.
    expect(cpu.readWord(cpu.registers.SS, cpu.registers.SP)).toBe(0x103);
    expect(cpu.registers.IP).toBe(0x104);
    expect(cpu.registers.SP).toBe(0xfffc);
  });

  it('ret_returns_after_the_call_and_restores_sp', () => {
    // Case T62: the instruction after CALL runs, and SP is back to its initial value.
    const cpu = run('MOV AX, 5\nCALL doble\nMOV BX, AX\nHLT\ndoble:\nADD AX, AX\nRET', 5);
    expect(cpu.registers.AX).toBe(10);
    expect(cpu.registers.BX).toBe(10);
    expect(cpu.registers.SP).toBe(0xfffe);
    expect(cpu.halted).toBe(false);
    cpu.step();
    expect(cpu.halted).toBe(true);
  });

  it('stack_instructions_preserve_flags', () => {
    const cpu = run('MOV AX, 0FFFFh\nADD AX, 1\nPUSH AX\nPOP BX\nCALL f\nHLT\nf:\nRET', 5);
    const flagsAfterAdd = cpu.trace[1].after.flags;
    for (const event of cpu.trace.slice(2)) expect(event.after.flags).toEqual(flagsAfterAdd);
    expect(cpu.flags.CF).toBe(true);
    expect(cpu.flags.ZF).toBe(true);
  });

  it('far_call_is_rejected_without_partial_change', () => {
    const cpu = new Cpu8086();
    cpu.load('MOV AX, 9\nHLT');
    const before = JSON.stringify(cpu.snapshot());
    for (const bad of ['CALL FAR rutina', 'CALL [BX]', 'CALL 1234h', 'RET 4', 'PUSH 5', 'POP [BX]'])
      expect(() => cpu.load(bad + '\nHLT'), bad).toThrow();
    expect(JSON.stringify(cpu.snapshot())).toBe(before);
    expect(cpu.instructions.map((i) => i.text)).toEqual(['MOV AX, 9', 'HLT']);
  });

  it('encodes_push_pop_call_ret_bytes', () => {
    const bytes = assemble('PUSH AX\nPUSH BX\nPOP CX\nCALL f\nRET\nf:\nRET').map((i) => i.bytes);
    expect(bytes[0]).toEqual([0x50]);
    expect(bytes[1]).toEqual([0x53]);
    expect(bytes[2]).toEqual([0x59]);
    expect(bytes[3]).toEqual([0xe8, 0x01, 0x00]);
    expect(bytes[4]).toEqual([0xc3]);
  });

  it('decodes_from_bytes_without_assembler_metadata', () => {
    const cpu = run('PUSH CX\nCALL f\nHLT\nf:\nPOP DX\nRET', 1);
    cpu.instructions = [];
    const event = cpu.step()!;
    expect(event.instruction.op).toBe('CALL');
    expect(event.instruction.text).toContain('CALL');
  });
});
