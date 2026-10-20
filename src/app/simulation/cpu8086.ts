import { assemble } from './x86/assembler';
import { decode } from './x86/decoder';
import { execute } from './x86/executor';
import { setSwitches } from './x86/ppi8255';
import { keyCodes } from './x86/text-screen';
import {
  REGISTER_NAMES,
  emptyIo,
  hex,
  physicalAddress,
  type AssembledProgram,
  type Flags,
  type HaltReason,
  type Instruction,
  type IoState,
  type Registers,
  type Snapshot,
  type StepResult,
  type Trace,
} from './x86/types';

export { REGISTER_NAMES, assemble, decode, hex, physicalAddress };
export type { AssembledProgram, Flags, Instruction, IoState, Registers, Snapshot, StepResult, Trace };
export type { Operand, Operation, Register, DataSymbol } from './x86/types';

const initialRegisters = (): Registers => ({
  AX: 7,
  BX: 0,
  CX: 0,
  DX: 0,
  SP: 0xfffe,
  BP: 0,
  SI: 0,
  DI: 0,
  CS: 0x1000,
  DS: 0x2000,
  SS: 0x3000,
  ES: 0x2000,
  IP: 0x100,
});
const initialFlags = (): Flags => ({
  CF: false,
  PF: false,
  AF: false,
  ZF: false,
  SF: false,
  OF: false,
});
const copyIo = (io: IoState): IoState => ({
  screen: io.screen,
  cursor: io.cursor,
  keyboard: [...io.keyboard],
  ...(io.ports ? { ports: { ...io.ports } } : {}),
});

export class Cpu8086 {
  registers = initialRegisters();
  flags = initialFlags();
  memory: Record<number, number> = {};
  io: IoState = emptyIo();
  halted = false;
  haltReason: HaltReason = 'hlt';
  instructions: Instruction[] = [];
  program?: AssembledProgram;
  trace: Trace[] = [];
  constructor() {
    this.reset();
  }
  reset(): void {
    this.registers = initialRegisters();
    this.flags = initialFlags();
    this.memory = {};
    this.io = emptyIo();
    this.trace = [];
    this.halted = false;
    this.haltReason = 'hlt';
    this.writeWord(0x2000, 10, 5);
    this.writeWord(0x2100, 10, 9);
    [1, 2, 3, 4].forEach((v, n) => this.writeWord(0x2000, n * 2, v));
  }
  load(source: string): void {
    const program = assemble(source);
    this.reset();
    this.program = program;
    this.instructions = program.instructions;
    const code = this.registers.CS;
    for (const i of program.instructions)
      i.bytes.forEach((b, n) => (this.memory[physicalAddress(code, i.address + n)] = b));
    if (program.dataSegment !== undefined) this.registers.DS = this.registers.ES = program.dataSegment;
    for (const block of program.blocks) {
      const segment = block.segment === 'code' ? code : this.registers.DS;
      block.bytes.forEach((b, n) => (this.memory[physicalAddress(segment, block.address + n)] = b));
    }
    this.registers.IP = program.entry;
  }
  /** Keys typed at the emulated keyboard; the program reads them with INT 21h. */
  type(text: string): void {
    this.io = { ...this.io, keyboard: [...this.io.keyboard, ...keyCodes(text)] };
  }
  /** Positions of the eight switches of the 8255 trainer, read by `IN` from port B. */
  setSwitches(value: number): void {
    this.io = { ...this.io, ports: setSwitches(this.io.ports, value) };
  }
  readWord(segment: number, offset: number): number {
    const a = physicalAddress(segment, offset);
    return (this.memory[a] ?? 0) | ((this.memory[(a + 1) & 0xfffff] ?? 0) << 8);
  }
  writeWord(segment: number, offset: number, value: number): void {
    const a = physicalAddress(segment, offset);
    this.memory[a] = value & 255;
    this.memory[(a + 1) & 0xfffff] = (value >>> 8) & 255;
  }
  snapshot(): Snapshot {
    return {
      registers: { ...this.registers },
      flags: { ...this.flags },
      memory: { ...this.memory },
      halted: this.halted,
      io: copyIo(this.io),
    };
  }
  restore(state: Snapshot): void {
    this.registers = { ...state.registers };
    this.flags = { ...state.flags };
    this.memory = { ...state.memory };
    this.halted = state.halted;
    this.io = copyIo(state.io ?? emptyIo());
  }
  /** One instruction: executed, waiting for a key, halted, or faulted; the last two leave no trace of the attempt. */
  execute(): StepResult {
    if (this.halted) return { kind: 'halted', reason: this.haltReason };
    const i = decode(this.memory, this.registers.CS, this.registers.IP);
    const authored = this.instructions.find(
      (x) =>
        x.address === i.address &&
        x.bytes.length === i.bytes.length &&
        x.bytes.every((b, n) => b === i.bytes[n]),
    );
    if (authored) {
      i.text = authored.text;
      i.line = authored.line;
    }
    const before = this.snapshot();
    let outcome;
    try {
      outcome = execute(this, i);
    } catch (e) {
      this.restore(before);
      throw e;
    }
    if (outcome.kind === 'wait') {
      this.restore(before);
      return { kind: 'waiting-input', service: outcome.service };
    }
    if (outcome.kind === 'fault') {
      this.restore(before);
      return { kind: 'fault', reason: outcome.reason, line: i.line };
    }
    const trace: Trace = {
      before,
      after: this.snapshot(),
      instruction: i,
      reads: outcome.reads,
      writes: outcome.writes,
      operation: outcome.operation,
    };
    this.trace.push(trace);
    if (outcome.halt) {
      this.haltReason = outcome.halt;
      return { kind: 'halted', reason: outcome.halt, trace };
    }
    return { kind: 'executed', trace };
  }
  /** The trace of the instruction run, or undefined when there was nothing to run. */
  step(): Trace | undefined {
    const result = this.execute();
    if (result.kind === 'executed' || (result.kind === 'halted' && result.trace)) return result.trace;
    if (result.kind === 'fault')
      throw Error('Error de división (línea ' + result.line + '): el divisor es 0 o el cociente no cabe. El 8086 real lanzaría INT 0.');
    return undefined;
  }
}
