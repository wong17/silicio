import { ALU_OPS, GROUP3_FIELDS, JCC_OPCODES, SHIFT_FIELDS } from './encoding';
import {
  BYTE_REGISTERS,
  REGISTER_NAMES,
  SEGMENT_REGISTERS,
  formatOperand,
  hex,
  physicalAddress,
  word,
  type Instruction,
  type Operand,
  type Register,
  type Size,
} from './types';

const JCC_NAMES = Object.fromEntries(Object.entries(JCC_OPCODES).map(([n, o]) => [o, n]));
const SHIFT_NAMES = Object.fromEntries(Object.entries(SHIFT_FIELDS).map(([n, f]) => [f, n]));
const GROUP3_NAMES = Object.fromEntries(Object.entries(GROUP3_FIELDS).map(([n, f]) => [f, n]));
const RM_PATTERNS: Register[][] = [['BX', 'SI'], ['BX', 'DI'], ['BP', 'SI'], ['BP', 'DI'], ['SI'], ['DI'], ['BP'], ['BX']];

/** Decode supported 8086 bytes independently of assembler metadata. */
export function decode(memory: Record<number, number>, segment: number, address: number): Instruction {
  let ip = address;
  const bytes: number[] = [];
  const next = () => {
    const at = physicalAddress(segment, ip);
    if (!(at in memory)) throw Error('Byte ausente en CS:' + hex(ip));
    const b = memory[at];
    bytes.push(b);
    ip = word(ip + 1);
    return b;
  };
  const u16 = () => next() | (next() << 8);
  const s8 = (v: number) => (v & 128 ? v - 256 : v);
  const register = (n: number, size: Size = 16): Operand =>
    size === 8
      ? { kind: 'register', name: BYTE_REGISTERS[n], size }
      : { kind: 'register', name: REGISTER_NAMES[n], size };
  const mod = (size: Size = 16) => {
    const b = next();
    const mode = b >> 6;
    const field = (b >> 3) & 7;
    const rm = b & 7;
    if (mode === 3) return { field, operand: register(rm, size) };
    const direct = mode === 0 && rm === 6;
    const bases = direct ? [] : RM_PATTERNS[rm];
    const displacement = direct || mode === 2 ? u16() : mode === 1 ? s8(next()) : 0;
    const operand: Operand = {
      kind: 'memory',
      bases,
      displacement,
      rm,
      segment: bases.includes('BP') ? 'SS' : 'DS',
      size,
    };
    return { field, operand };
  };
  const imm = (size: Size): Operand =>
    size === 8 ? { kind: 'immediate', value: next(), size } : { kind: 'immediate', value: u16(), size };
  const opcode = next();
  let op = '';
  let operands: Operand[] = [];
  let target: number | undefined;
  const unsupported = (): never => {
    throw Error('Opcode no admitido: ' + hex(opcode, 2) + 'h en CS:' + hex(address));
  };

  if (opcode < 0x40 && (opcode & 7) < 6) {
    // ADD, OR, ADC, SBB, AND, SUB, XOR, CMP in their six encodings.
    op = ALU_OPS[opcode >> 3];
    const form = opcode & 7;
    const size: Size = form & 1 ? 16 : 8;
    if (form < 4) {
      const { field, operand } = mod(size);
      operands = form < 2 ? [operand, register(field, size)] : [register(field, size), operand];
    } else operands = [register(0, size), imm(size)];
  } else if (opcode >= 0x40 && opcode <= 0x4f) {
    op = opcode < 0x48 ? 'INC' : 'DEC';
    operands = [register(opcode & 7)];
  } else if (opcode >= 0x50 && opcode <= 0x5f) {
    op = opcode < 0x58 ? 'PUSH' : 'POP';
    operands = [register(opcode & 7)];
  } else if (opcode in JCC_NAMES) {
    op = JCC_NAMES[opcode];
    const rel = s8(next());
    target = word(ip + rel);
  } else if (opcode >= 0x80 && opcode <= 0x83 && opcode !== 0x82) {
    const size: Size = opcode === 0x80 ? 8 : 16;
    const { field, operand } = mod(size);
    op = ALU_OPS[field];
    if (opcode === 0x83) operands = [operand, { kind: 'immediate', value: word(s8(next())), size: 16 }];
    else operands = [operand, imm(size)];
  } else if (opcode === 0x84 || opcode === 0x85 || opcode === 0x86 || opcode === 0x87) {
    const size: Size = opcode & 1 ? 16 : 8;
    const { field, operand } = mod(size);
    op = opcode < 0x86 ? 'TEST' : 'XCHG';
    operands = op === 'TEST' ? [operand, register(field, size)] : [register(field, size), operand];
  } else if (opcode >= 0x88 && opcode <= 0x8b) {
    const size: Size = opcode & 1 ? 16 : 8;
    const { field, operand } = mod(size);
    op = 'MOV';
    operands = opcode < 0x8a ? [operand, register(field, size)] : [register(field, size), operand];
  } else if (opcode === 0x8c || opcode === 0x8e) {
    const { field, operand } = mod(16);
    if (field > 3) unsupported();
    op = 'MOV';
    const sreg: Operand = { kind: 'segment', name: SEGMENT_REGISTERS[field] };
    operands = opcode === 0x8c ? [operand, sreg] : [sreg, operand];
  } else if (opcode === 0x8d) {
    const { field, operand } = mod(16);
    if (operand.kind !== 'memory') unsupported();
    op = 'LEA';
    operands = [register(field), operand];
  } else if (opcode === 0x90) op = 'NOP';
  else if (opcode === 0x98) op = 'CBW';
  else if (opcode === 0x99) op = 'CWD';
  else if (opcode >= 0xb0 && opcode <= 0xb7) {
    op = 'MOV';
    operands = [register(opcode - 0xb0, 8), imm(8)];
  } else if (opcode >= 0xb8 && opcode <= 0xbf) {
    op = 'MOV';
    operands = [register(opcode - 0xb8), imm(16)];
  } else if (opcode === 0xc3) op = 'RET';
  else if (opcode === 0xc6 || opcode === 0xc7) {
    const size: Size = opcode === 0xc6 ? 8 : 16;
    const { field, operand } = mod(size);
    if (field !== 0) unsupported();
    op = 'MOV';
    operands = [operand, imm(size)];
  } else if (opcode === 0xe4 || opcode === 0xe6 || opcode === 0xec || opcode === 0xee) {
    const input = opcode === 0xe4 || opcode === 0xec;
    const port: Operand = opcode >= 0xec ? register(2) : imm(8);
    const al = register(0, 8);
    op = input ? 'IN' : 'OUT';
    operands = input ? [al, port] : [port, al];
  } else if (opcode === 0xcd) {
    op = 'INT';
    operands = [{ kind: 'immediate', value: next(), size: 8 }];
  } else if (opcode >= 0xd0 && opcode <= 0xd3) {
    const size: Size = opcode & 1 ? 16 : 8;
    const { field, operand } = mod(size);
    op = SHIFT_NAMES[field];
    if (!op) unsupported();
    operands = [
      operand,
      opcode >= 0xd2
        ? { kind: 'register', name: 'CL', size: 8 }
        : { kind: 'immediate', value: 1 },
    ];
  } else if (opcode === 0xe2 || opcode === 0xe8 || opcode === 0xe9) {
    op = { 0xe2: 'LOOP', 0xe8: 'CALL', 0xe9: 'JMP' }[opcode]!;
    const raw = opcode === 0xe2 ? s8(next()) : s8Wide(u16());
    target = word(ip + raw);
  } else if (opcode === 0xf4) op = 'HLT';
  else if (opcode === 0xf6 || opcode === 0xf7) {
    const size: Size = opcode === 0xf6 ? 8 : 16;
    const { field, operand } = mod(size);
    op = GROUP3_NAMES[field];
    if (!op) unsupported();
    operands = field === 0 ? [operand, imm(size)] : [operand];
  } else if (opcode === 0xfe || opcode === 0xff) {
    const size: Size = opcode === 0xfe ? 8 : 16;
    const { field, operand } = mod(size);
    if (field > 1) unsupported();
    op = field === 0 ? 'INC' : 'DEC';
    operands = [operand];
  } else unsupported();

  return { address, line: 0, op, operands, bytes, target, text: listing(op, operands, target) };
}

const s8Wide = (v: number) => (v & 0x8000 ? v - 0x10000 : v);

/** Text of one instruction the way the listing shows it. */
export function listing(op: string, operands: Operand[], target?: number): string {
  if (target !== undefined) return op + ' ' + hex(target) + 'h';
  if (!operands.length) return op;
  const isShift = op in SHIFT_FIELDS;
  const needsSize =
    operands.some((o) => o.kind === 'memory') &&
    !operands.some((o, i) => (o.kind === 'register' || o.kind === 'segment') && !(isShift && i === 1));
  const text = operands.map((o) => {
    const base = formatOperand(o);
    return needsSize && o.kind === 'memory' ? (o.size === 8 ? 'BYTE PTR ' : 'WORD PTR ') + base : base;
  });
  return op + ' ' + text.join(', ');
}
