import { Cpu8086 } from '../cpu8086';

/**
 * CISC against RISC with the same task (§7). The 8086 side runs on the real engine, so its bytes and accesses
 * are measured, not typed. The RISC side is a didactic load/store machine in the style of ARM: fixed 4-byte
 * instructions, memory only through LDR and STR. Its encodings are not AArch64 and are not shown as such.
 */
export type RiscOp =
  | { op: 'LDR'; rd: number; base: number; offset: number }
  | { op: 'STR'; rs: number; base: number; offset: number }
  | { op: 'ADD'; rd: number; rn: number; rm: number };

export const RISC_BYTES = 4;

export const riscText = (i: RiscOp): string =>
  i.op === 'LDR' ? `LDR R${i.rd},[R${i.base},#${i.offset}]` : i.op === 'STR' ? `STR R${i.rs},[R${i.base},#${i.offset}]` : `ADD R${i.rd},R${i.rn},R${i.rm}`;

export interface SideResult {
  text: string[];
  instructions: number;
  bytes: number;
  dataReads: number;
  dataWrites: number;
  /** Value of the accumulator (AX or R2) or of the word in memory, depending on the task. */
  result: number;
  encoding?: string[];
}

export interface Comparison {
  task: 'sum' | 'store';
  title: string;
  cisc: SideResult;
  risc: SideResult;
  /** Both sides end with the same value. */
  same: boolean;
  /** Data traffic is the same: what changes is how the work is written. */
  sameDataTraffic: boolean;
}

/** Runs a RISC program; R0 holds the data base (the role of DS), words are 16-bit as in the 8086 task. */
export function runRisc(
  program: readonly RiscOp[],
  regs: number[],
  memory: Record<number, number>,
): { regs: number[]; memory: Record<number, number>; reads: number; writes: number } {
  const r = [...regs];
  const m = { ...memory };
  let reads = 0;
  let writes = 0;
  for (const i of program) {
    if (i.op === 'LDR') {
      r[i.rd] = m[r[i.base] + i.offset] ?? 0;
      reads++;
    } else if (i.op === 'STR') {
      m[r[i.base] + i.offset] = r[i.rs] & 0xffff;
      writes++;
    } else r[i.rd] = (r[i.rn] + r[i.rm]) & 0xffff;
  }
  return { regs: r, memory: m, reads, writes };
}

const hexBytes = (b: readonly number[]) => b.map((x) => x.toString(16).toUpperCase().padStart(2, '0'));

function cisc(source: string, accumulator: number, word: number): SideResult & { memoryWord: number } {
  const cpu = new Cpu8086();
  cpu.load(source + '\nHLT');
  cpu.registers.AX = accumulator;
  cpu.writeWord(cpu.registers.DS, 10, word);
  const t = cpu.step()!;
  return {
    text: [t.instruction.text.replace(/,\s*/g, ',')],
    instructions: 1,
    bytes: t.instruction.bytes.length,
    dataReads: t.reads.length,
    dataWrites: t.writes.length,
    result: cpu.registers.AX,
    memoryWord: cpu.readWord(cpu.registers.DS, 10),
    encoding: hexBytes(t.instruction.bytes),
  };
}

/** Mission 01 (AX = 7, word at [10] = 5) in both styles; the data base R0 plays the role of DS. */
export function compare(task: 'sum' | 'store', accumulator = 7, word = 5): Comparison {
  const base = 0x2000;
  const memory = { [base + 10]: word };
  if (task === 'sum') {
    const left = cisc('ADD AX,[10]', accumulator, word);
    const code: RiscOp[] = [{ op: 'LDR', rd: 1, base: 0, offset: 10 }, { op: 'ADD', rd: 2, rn: 2, rm: 1 }];
    const run = runRisc(code, [base, 0, accumulator, 0], memory);
    const right: SideResult = { text: code.map(riscText), instructions: code.length, bytes: code.length * RISC_BYTES, dataReads: run.reads, dataWrites: run.writes, result: run.regs[2] };
    return { task, title: 'Sumar una palabra de memoria a un registro', cisc: left, risc: right, same: left.result === right.result, sameDataTraffic: left.dataReads === right.dataReads && left.dataWrites === right.dataWrites };
  }
  const left = cisc('ADD [10],AX', accumulator, word);
  const code: RiscOp[] = [{ op: 'LDR', rd: 1, base: 0, offset: 10 }, { op: 'ADD', rd: 1, rn: 1, rm: 2 }, { op: 'STR', rs: 1, base: 0, offset: 10 }];
  const run = runRisc(code, [base, 0, accumulator, 0], memory);
  const right: SideResult = { text: code.map(riscText), instructions: code.length, bytes: code.length * RISC_BYTES, dataReads: run.reads, dataWrites: run.writes, result: run.memory[base + 10] };
  return { task, title: 'Sumar un registro a una palabra de memoria y guardarla', cisc: { ...left, result: left.memoryWord }, risc: right, same: left.memoryWord === right.result, sameDataTraffic: left.dataReads === right.dataReads && left.dataWrites === right.dataWrites };
}
