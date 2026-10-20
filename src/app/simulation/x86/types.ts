export const REGISTER_NAMES = ['AX', 'CX', 'DX', 'BX', 'SP', 'BP', 'SI', 'DI'] as const;
export type Register = (typeof REGISTER_NAMES)[number];
export const BYTE_REGISTERS = ['AL', 'CL', 'DL', 'BL', 'AH', 'CH', 'DH', 'BH'] as const;
export type ByteRegister = (typeof BYTE_REGISTERS)[number];
/** Encoding order of the segment registers in `MOV Sreg, r/m16`. */
export const SEGMENT_REGISTERS = ['ES', 'CS', 'SS', 'DS'] as const;
export type SegmentRegister = (typeof SEGMENT_REGISTERS)[number];
export type Registers = Record<Register | SegmentRegister | 'IP', number>;
export interface Flags {
  CF: boolean;
  PF: boolean;
  AF: boolean;
  ZF: boolean;
  SF: boolean;
  OF: boolean;
}
export type Size = 8 | 16;
export type Operand =
  | { kind: 'register'; name: Register | ByteRegister; size: Size }
  | { kind: 'segment'; name: SegmentRegister }
  | { kind: 'immediate'; value: number; size?: Size }
  | {
      kind: 'memory';
      bases: Register[];
      displacement: number;
      rm: number;
      segment: 'DS' | 'SS';
      /** Width of the access when the instruction fixes it (register operand, PTR or typed variable). */
      size?: Size;
      /** The displacement came from a symbol: it is always encoded in 16 bits so pass one and two agree. */
      wide?: boolean;
    };
export interface Instruction {
  address: number;
  line: number;
  text: string;
  op: string;
  operands: Operand[];
  bytes: number[];
  target?: number;
}
export interface IoState {
  /** Text of the 80×25 screen, rows separated by line feeds. */
  screen: string;
  /** Position of the next character: row × 80 + column. */
  cursor: number;
  /** Key codes typed and not yet read by the program. */
  keyboard: number[];
  ports?: Readonly<Record<number, number>>;
}
export interface Snapshot {
  registers: Registers;
  flags: Flags;
  memory: Record<number, number>;
  halted: boolean;
  io: IoState;
}
export interface Operation {
  operands: number[];
  result?: number;
  accesses: { kind: 'read' | 'write'; address: number; value: number }[];
}
export interface Trace {
  operation?: Operation;
  before: Snapshot;
  after: Snapshot;
  instruction: Instruction;
  reads: number[];
  writes: number[];
}
export type StepResult =
  | { kind: 'executed'; trace: Trace }
  | { kind: 'waiting-input'; service: 0x01 | 0x0a }
  | { kind: 'halted'; reason: 'hlt' | 'int20' | 'int21-4c'; trace?: Trace }
  | { kind: 'fault'; reason: 'division'; line: number };
export interface DataSymbol {
  name: string;
  address: number;
  type: 'byte' | 'word';
  length: number;
}
export interface DataBlock {
  /** `code` blocks sit in the code segment (COM template); `data` blocks in the data segment. */
  segment: 'code' | 'data';
  address: number;
  bytes: number[];
}
export interface AssembledProgram {
  instructions: Instruction[];
  data: readonly DataSymbol[];
  macroExpansions: readonly { line: number; expanded: string[] }[];
  blocks: readonly DataBlock[];
  /** Address of the first instruction, where IP starts. */
  entry: number;
  /** Segment value for DS at start; undefined keeps the default layout. */
  dataSegment?: number;
}

export const physicalAddress = (segment: number, offset: number) =>
  ((segment & 0xffff) * 16 + (offset & 0xffff)) & 0xfffff;
export const hex = (value: number, digits = 4) =>
  (value >>> 0).toString(16).toUpperCase().padStart(digits, '0');
export const word = (n: number) => n & 0xffff;
export const bytePair = (n: number) => [n & 255, (n >>> 8) & 255];
export const emptyIo = (): IoState => ({ screen: '', cursor: 0, keyboard: [] });

/** Canonical text of an operand, shared by the listing and the round-trip tests. */
export function formatOperand(o: Operand): string {
  if (o.kind === 'register' || o.kind === 'segment') return o.name;
  if (o.kind === 'immediate')
    return o.size === undefined ? String(o.value) : hex(o.value, o.size === 8 ? 2 : 4) + 'h';
  const disp = o.displacement
    ? [(o.displacement < 0 ? '-' + hex(-o.displacement) : hex(word(o.displacement))) + 'h']
    : [];
  return '[' + [...o.bases, ...disp].join('+').replace('+-', '-') + ']';
}

/** What an executing instruction can touch. */
export interface Machine {
  registers: Registers;
  flags: Flags;
  memory: Record<number, number>;
  io: IoState;
  halted: boolean;
}
/** Memory seen through the access log: every byte the instruction reads or writes is recorded. */
export interface MemoryPort {
  readByte(segment: number, offset: number): number;
  writeByte(segment: number, offset: number, value: number): void;
}
export type HaltReason = 'hlt' | 'int20' | 'int21-4c';
