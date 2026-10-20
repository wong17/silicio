import { interrupt } from './dos-services';
import { registerIndex } from './encoding';
import {
  BYTE_REGISTERS,
  REGISTER_NAMES,
  physicalAddress,
  word,
  type ByteRegister,
  type Flags,
  type HaltReason,
  type Instruction,
  type Machine,
  type MemoryPort,
  type Operand,
  type Operation,
  type Register,
  type Size,
} from './types';

export type Outcome =
  | { kind: 'done'; operation: Operation; reads: number[]; writes: number[]; halt?: HaltReason }
  | { kind: 'wait'; service: 0x01 | 0x0a }
  | { kind: 'fault'; reason: 'division' };

const maskOf = (size: Size) => (size === 8 ? 0xff : 0xffff);
const signOf = (size: Size) => (size === 8 ? 0x80 : 0x8000);
const parity = (result: number) => (result & 255).toString(2).split('1').length % 2 === 1;
const signed = (v: number, size: Size) => (v & signOf(size) ? v - (maskOf(size) + 1) : v);

export function readRegister(regs: Machine['registers'], name: Register | ByteRegister, size: Size): number {
  if (size === 16) return regs[name as Register];
  const i = BYTE_REGISTERS.indexOf(name as ByteRegister);
  const full = regs[REGISTER_NAMES[i & 3]];
  return i >= 4 ? (full >>> 8) & 255 : full & 255;
}
export function writeRegister(
  regs: Machine['registers'],
  name: Register | ByteRegister,
  size: Size,
  value: number,
): void {
  if (size === 16) {
    regs[name as Register] = word(value);
    return;
  }
  const i = BYTE_REGISTERS.indexOf(name as ByteRegister);
  const base = REGISTER_NAMES[i & 3];
  regs[base] = i >= 4 ? (regs[base] & 0x00ff) | ((value & 255) << 8) : (regs[base] & 0xff00) | (value & 255);
}

/** Flags of an addition or subtraction, shared by ADD/ADC/SUB/SBB/CMP/INC/DEC/NEG. */
function arithmetic(
  op: 'add' | 'sub',
  a: number,
  b: number,
  carryIn: number,
  size: Size,
): { result: number; flags: Flags } {
  const mask = maskOf(size);
  const raw = op === 'add' ? a + b + carryIn : a - b - carryIn;
  const result = raw & mask;
  const sign = signOf(size);
  return {
    result,
    flags: {
      CF: op === 'add' ? raw > mask : raw < 0,
      PF: parity(result),
      AF: !!((a ^ b ^ result) & 16),
      ZF: result === 0,
      SF: !!(result & sign),
      OF: op === 'add' ? !!(~(a ^ b) & (a ^ result) & sign) : !!((a ^ b) & (a ^ result) & sign),
    },
  };
}

function logic(op: string, a: number, b: number, size: Size): { result: number; flags: Flags } {
  const result = (op === 'AND' || op === 'TEST' ? a & b : op === 'OR' ? a | b : a ^ b) & maskOf(size);
  return {
    result,
    flags: {
      CF: false,
      PF: parity(result),
      AF: false,
      ZF: result === 0,
      SF: !!(result & signOf(size)),
      OF: false,
    },
  };
}

const condition = (op: string, f: Flags): boolean => {
  switch (op) {
    case 'JO': return f.OF;
    case 'JNO': return !f.OF;
    case 'JB': return f.CF;
    case 'JAE': return !f.CF;
    case 'JZ': return f.ZF;
    case 'JNZ': return !f.ZF;
    case 'JBE': return f.CF || f.ZF;
    case 'JA': return !f.CF && !f.ZF;
    case 'JS': return f.SF;
    case 'JNS': return !f.SF;
    case 'JL': return f.SF !== f.OF;
    case 'JGE': return f.SF === f.OF;
    case 'JLE': return f.ZF || f.SF !== f.OF;
    case 'JG': return !f.ZF && f.SF === f.OF;
    default: return false;
  }
};

/** Runs one decoded instruction on the machine; the caller reverts the state on `wait` and `fault`. */
export function execute(m: Machine, i: Instruction): Outcome {
  const regs = m.registers;
  const operation: Operation = { operands: [], accesses: [] };
  const reads: number[] = [];
  const writes: number[] = [];

  const readByteAt = (segment: number, offset: number): number => {
    const address = physicalAddress(segment, offset);
    const value = m.memory[address] ?? 0;
    reads.push(address);
    operation.accesses.push({ kind: 'read', address, value });
    return value;
  };
  const writeByteAt = (segment: number, offset: number, value: number): void => {
    const address = physicalAddress(segment, offset);
    writes.push(address);
    operation.accesses.push({ kind: 'write', address, value: value & 255 });
    m.memory[address] = value & 255;
  };
  const port: MemoryPort = { readByte: readByteAt, writeByte: writeByteAt };
  const effective = (o: Extract<Operand, { kind: 'memory' }>) =>
    word(o.displacement + o.bases.reduce((sum, r) => sum + regs[r], 0));
  /** One word access is recorded once, at its low byte, as the single-access trace of the earlier engine. */
  const readWordAt = (segment: number, offset: number): number => {
    const address = physicalAddress(segment, offset);
    const value = (m.memory[address] ?? 0) | ((m.memory[(address + 1) & 0xfffff] ?? 0) << 8);
    reads.push(address);
    operation.accesses.push({ kind: 'read', address, value });
    return value;
  };
  const writeWordAt = (segment: number, offset: number, value: number): void => {
    const address = physicalAddress(segment, offset);
    writes.push(address);
    operation.accesses.push({ kind: 'write', address, value: word(value) });
    m.memory[address] = value & 255;
    m.memory[(address + 1) & 0xfffff] = (value >>> 8) & 255;
  };

  const read = (o: Operand, size: Size): number => {
    switch (o.kind) {
      case 'immediate': return o.value & maskOf(size);
      case 'register': return readRegister(regs, o.name, o.size);
      case 'segment': return regs[o.name];
      case 'memory': {
        const offset = effective(o);
        const segment = regs[o.segment];
        return size === 8 ? readByteAt(segment, offset) : readWordAt(segment, offset);
      }
    }
  };
  const write = (o: Operand, size: Size, value: number): void => {
    if (o.kind === 'register') writeRegister(regs, o.name, o.size, value);
    else if (o.kind === 'segment') regs[o.name] = word(value);
    else if (o.kind === 'memory') {
      const offset = effective(o);
      if (size === 8) writeByteAt(regs[o.segment], offset, value);
      else writeWordAt(regs[o.segment], offset, value);
    } else throw Error('Destino inválido');
  };
  const sizeOf = (): Size => {
    for (const o of i.operands) {
      if (o.kind === 'register') return o.size;
      if (o.kind === 'memory' && o.size) return o.size;
    }
    return 16;
  };

  regs.IP = word(i.address + i.bytes.length);
  // Stack word at SS:SP. PUSH and CALL write below SP, POP and RET read from it; none touches the flags.
  const push = (value: number) => {
    regs.SP = word(regs.SP - 2);
    writeWordAt(regs.SS, regs.SP, value);
  };
  const pop = (): number => {
    const value = readWordAt(regs.SS, regs.SP);
    regs.SP = word(regs.SP + 2);
    return value;
  };
  const done = (halt?: HaltReason): Outcome => ({ kind: 'done', operation, reads, writes, halt });
  const [dst, src] = i.operands;
  const op = i.op;
  const size = sizeOf();

  switch (op) {
    case 'HLT':
      m.halted = true;
      return done('hlt');
    case 'NOP':
      return done();
    case 'PUSH': {
      const value = read(dst, 16);
      operation.operands = [value];
      push(value);
      return done();
    }
    case 'POP': {
      const value = pop();
      operation.operands = [value];
      write(dst, 16, value);
      return done();
    }
    case 'CALL':
      operation.operands = [regs.IP];
      push(regs.IP);
      regs.IP = i.target!;
      return done();
    case 'RET':
      regs.IP = pop();
      operation.operands = [regs.IP];
      return done();
    case 'JMP':
      regs.IP = i.target!;
      return done();
    case 'LOOP':
      regs.CX = word(regs.CX - 1);
      if (regs.CX !== 0) regs.IP = i.target!;
      return done();
    case 'INT': {
      const vector = (dst as Extract<Operand, { kind: 'immediate' }>).value;
      operation.operands = [vector];
      const out = interrupt(vector, m, port);
      if (out.kind === 'wait') return out;
      if (out.kind === 'halt') {
        m.halted = true;
        return done(out.reason);
      }
      return done();
    }
    case 'MOV': {
      const value = read(src, size);
      operation.operands = [value];
      operation.result = value;
      write(dst, size, value);
      return done();
    }
    case 'LEA':
      write(dst, 16, effective(src as Extract<Operand, { kind: 'memory' }>));
      operation.operands = [effective(src as Extract<Operand, { kind: 'memory' }>)];
      return done();
    case 'XCHG': {
      const a = read(dst, size);
      const b = read(src, size);
      operation.operands = [a, b];
      write(dst, size, b);
      write(src, size, a);
      return done();
    }
    case 'CBW':
      regs.AX = word(signed(regs.AX & 255, 8));
      return done();
    case 'CWD':
      regs.DX = regs.AX & 0x8000 ? 0xffff : 0;
      return done();
    case 'INC':
    case 'DEC': {
      const a = read(dst, size);
      const r = arithmetic(op === 'INC' ? 'add' : 'sub', a, 1, 0, size);
      operation.operands = [a, 1];
      operation.result = r.result;
      m.flags = { ...r.flags, CF: m.flags.CF };
      write(dst, size, r.result);
      return done();
    }
    case 'NEG': {
      const a = read(dst, size);
      const r = arithmetic('sub', 0, a, 0, size);
      operation.operands = [a];
      operation.result = r.result;
      m.flags = r.flags;
      write(dst, size, r.result);
      return done();
    }
    case 'NOT': {
      const a = read(dst, size);
      operation.operands = [a];
      operation.result = ~a & maskOf(size);
      write(dst, size, operation.result);
      return done();
    }
    case 'MUL':
    case 'IMUL': {
      const a = read(dst, size);
      const factor = size === 8 ? regs.AX & 255 : regs.AX;
      const product = op === 'IMUL' ? signed(a, size) * signed(factor, size) : a * factor;
      operation.operands = [factor, a];
      const bits = product < 0 ? product + 2 ** (size * 2) : product;
      regs.AX = word(bits);
      if (size === 16) regs.DX = word(Math.floor(bits / 0x10000));
      operation.result = regs.AX;
      const half = 2 ** (size - 1);
      const overflow =
        op === 'MUL'
          ? product > maskOf(size)
          : product < -half || product > half - 1;
      m.flags = { ...m.flags, CF: overflow, OF: overflow };
      return done();
    }
    case 'DIV':
    case 'IDIV': {
      const divisor = read(dst, size);
      const dividend = size === 8 ? regs.AX : regs.DX * 0x10000 + regs.AX;
      const [n, d] =
        op === 'IDIV'
          ? [size === 8 ? signed(regs.AX, 16) : (dividend | 0), signed(divisor, size)]
          : [dividend, divisor];
      operation.operands = [dividend >>> 0, divisor];
      if (d === 0) return { kind: 'fault', reason: 'division' };
      const quotient = Math.trunc(n / d);
      const remainder = n - quotient * d;
      const lo = op === 'IDIV' ? -(maskOf(size) + 1) / 2 : 0;
      const hi = op === 'IDIV' ? (maskOf(size) + 1) / 2 - 1 : maskOf(size);
      if (quotient < lo || quotient > hi) return { kind: 'fault', reason: 'division' };
      operation.result = quotient & maskOf(size);
      if (size === 8) regs.AX = ((remainder & 255) << 8) | (quotient & 255);
      else {
        regs.AX = word(quotient);
        regs.DX = word(remainder);
      }
      return done();
    }
    case 'SHL':
    case 'SHR':
    case 'SAR':
    case 'ROL':
    case 'ROR': {
      const count = src.kind === 'register' ? regs.CX & 255 : 1;
      const original = read(dst, size);
      operation.operands = [original, count];
      if (count === 0) {
        operation.result = original;
        return done();
      }
      const mask = maskOf(size);
      const sign = signOf(size);
      let v = original;
      let cf = m.flags.CF;
      for (let n = 0; n < count; n++) {
        if (op === 'SHL') {
          cf = !!(v & sign);
          v = (v << 1) & mask;
        } else if (op === 'SHR') {
          cf = !!(v & 1);
          v >>>= 1;
        } else if (op === 'SAR') {
          cf = !!(v & 1);
          v = (v >>> 1) | (v & sign);
        } else if (op === 'ROL') {
          cf = !!(v & sign);
          v = ((v << 1) | (cf ? 1 : 0)) & mask;
        } else {
          cf = !!(v & 1);
          v = (v >>> 1) | (cf ? sign : 0);
        }
      }
      const msb = !!(v & sign);
      const flags: Flags = { ...m.flags, CF: cf };
      if (count === 1)
        flags.OF =
          op === 'SHL' || op === 'ROL' ? msb !== cf : op === 'SHR' ? !!(original & sign) : op === 'ROR' ? msb !== !!(v & (sign >> 1)) : false;
      if (op !== 'ROL' && op !== 'ROR') {
        flags.PF = parity(v);
        flags.ZF = v === 0;
        flags.SF = msb;
        flags.AF = false;
      }
      m.flags = flags;
      operation.result = v;
      write(dst, size, v);
      return done();
    }
    case 'TEST': {
      const a = read(dst, size);
      const b = read(src, size);
      const r = logic('TEST', a, b, size);
      operation.operands = [a, b];
      operation.result = r.result;
      m.flags = r.flags;
      return done();
    }
    case 'ADD':
    case 'ADC':
    case 'SUB':
    case 'SBB':
    case 'CMP':
    case 'AND':
    case 'OR':
    case 'XOR': {
      const a = read(dst, size);
      const b = read(src, size);
      const r =
        op === 'AND' || op === 'OR' || op === 'XOR'
          ? logic(op, a, b, size)
          : arithmetic(
              op === 'ADD' || op === 'ADC' ? 'add' : 'sub',
              a,
              b,
              op === 'ADC' || op === 'SBB' ? (m.flags.CF ? 1 : 0) : 0,
              size,
            );
      operation.operands = [a, b];
      operation.result = r.result;
      m.flags = r.flags;
      if (op !== 'CMP') write(dst, size, r.result);
      return done();
    }
    default:
      if (op in { JO: 1, JNO: 1, JB: 1, JAE: 1, JZ: 1, JNZ: 1, JBE: 1, JA: 1, JS: 1, JNS: 1, JL: 1, JGE: 1, JLE: 1, JG: 1 }) {
        if (condition(op, m.flags)) regs.IP = i.target!;
        return done();
      }
      throw Error('Instrucción no admitida: ' + op);
  }
}

export { registerIndex };
