export const REGISTER_NAMES = ['AX', 'CX', 'DX', 'BX', 'SP', 'BP', 'SI', 'DI'] as const;
export type Register = (typeof REGISTER_NAMES)[number];
export type Registers = Record<Register | 'CS' | 'DS' | 'SS' | 'ES' | 'IP', number>;
export interface Flags {
  CF: boolean;
  PF: boolean;
  AF: boolean;
  ZF: boolean;
  SF: boolean;
  OF: boolean;
}
type Operand =
  | { kind: 'register'; name: Register }
  | { kind: 'immediate'; value: number }
  | { kind: 'memory'; bases: Register[]; displacement: number; rm: number; segment: 'DS' | 'SS' };
export interface Instruction {
  address: number;
  line: number;
  text: string;
  op: string;
  operands: Operand[];
  bytes: number[];
  target?: number;
}
export interface Snapshot {
  registers: Registers;
  flags: Flags;
  memory: Record<number, number>;
  halted: boolean;
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
export const physicalAddress = (segment: number, offset: number) =>
  ((segment & 0xffff) * 16 + (offset & 0xffff)) & 0xfffff;
export const hex = (value: number, digits = 4) =>
  (value >>> 0).toString(16).toUpperCase().padStart(digits, '0');
const word = (n: number) => n & 0xffff;
const bytePair = (n: number) => [n & 255, (n >>> 8) & 255];
function numberLiteral(text: string): number {
  const n = /^[+-]?\d+$/.test(text)
    ? Number(text)
    : /^0x[\da-f]+$/i.test(text)
      ? parseInt(text.slice(2), 16)
      : /^[\da-f]+h$/i.test(text)
        ? parseInt(text.slice(0, -1), 16)
        : NaN;
  if (!Number.isInteger(n) || n < -32768 || n > 65535)
    throw Error('Literal fuera de 16 bits: ' + text);
  return n;
}
function operand(text: string): Operand {
  text = text.trim().toUpperCase();
  if ((REGISTER_NAMES as readonly string[]).includes(text))
    return { kind: 'register', name: text as Register };
  if (!text.startsWith('[')) return { kind: 'immediate', value: word(numberLiteral(text)) };
  if (!text.endsWith(']')) throw Error('Falta ]');
  const expression = text.slice(1, -1).replace(/\s/g, '');
  const parts = expression.match(/[+-]?[^+-]+/g) ?? [];
  const bases: Register[] = [];
  let displacement = 0;
  for (const part of parts) {
    if (/^\+?(BX|BP|SI|DI)$/.test(part)) bases.push(part.replace('+', '') as Register);
    else displacement += numberLiteral(part.replace(/^\+/, ''));
  }
  const key = bases.sort().join('+');
  const modes: Record<string, number> = {
    'BX+SI': 0,
    'BX+DI': 1,
    'BP+SI': 2,
    'BP+DI': 3,
    SI: 4,
    DI: 5,
    BP: 6,
    BX: 7,
    '': 6,
  };
  if (!(key in modes) || !parts.length || displacement < -32768 || displacement > 65535)
    throw Error('Dirección no admitida: ' + text);
  return {
    kind: 'memory',
    bases,
    displacement,
    rm: modes[key],
    segment: bases.includes('BP') ? 'SS' : 'DS',
  };
}
function modrm(field: number, source: Operand): number[] {
  if (source.kind === 'register')
    return [0xc0 | (field << 3) | REGISTER_NAMES.indexOf(source.name)];
  if (source.kind !== 'memory') throw Error('Se esperaba registro o memoria');
  if (!source.bases.length) return [(field << 3) | 6, ...bytePair(source.displacement)];
  const d = source.displacement;
  if (!d && !(source.bases.length === 1 && source.bases[0] === 'BP'))
    return [(field << 3) | source.rm];
  if (d >= -128 && d <= 127) return [0x40 | (field << 3) | source.rm, d & 255];
  return [0x80 | (field << 3) | source.rm, ...bytePair(d)];
}
function encode(op: string, operands: Operand[]): number[] {
  if (['HLT', 'NOP'].includes(op)) {
    if (operands.length) throw Error(op + ' no lleva operandos');
    return [op === 'HLT' ? 0xf4 : 0x90];
  }
  if (['INC', 'DEC'].includes(op)) {
    if (operands.length !== 1 || operands[0].kind !== 'register')
      throw Error('Se esperaba un registro');
    return [(op === 'INC' ? 0x40 : 0x48) + REGISTER_NAMES.indexOf(operands[0].name)];
  }
  if (op === 'RET') {
    if (operands.length) throw Error('RET no lleva operandos: solo se admite el retorno cercano sin desplazamiento');
    return [0xc3];
  }
  if (['PUSH', 'POP'].includes(op)) {
    // Only 16-bit registers: segment registers, memory and immediates are outside the subset.
    if (operands.length !== 1 || operands[0].kind !== 'register')
      throw Error(op + ' admite solo un registro de 16 bits');
    return [(op === 'PUSH' ? 0x50 : 0x58) + REGISTER_NAMES.indexOf(operands[0].name)];
  }
  if (!['MOV', 'ADD', 'SUB', 'CMP'].includes(op) || operands.length !== 2)
    throw Error('Instrucción no admitida: ' + op);
  const [dst, src] = operands;
  if (op === 'MOV' && dst.kind === 'memory' && src.kind === 'register')
    return [0x89, ...modrm(REGISTER_NAMES.indexOf(src.name), dst)];
  if (dst.kind !== 'register') throw Error('El destino debe ser un registro de 16 bits');
  const reg = REGISTER_NAMES.indexOf(dst.name);
  if (src.kind === 'immediate') {
    return op === 'MOV'
      ? [0xb8 + reg, ...bytePair(src.value)]
      : [0x81, 0xc0 | ({ ADD: 0, SUB: 5, CMP: 7 }[op as 'ADD'] << 3) | reg, ...bytePair(src.value)];
  }
  return [{ MOV: 0x8b, ADD: 0x03, SUB: 0x2b, CMP: 0x3b }[op as 'MOV'], ...modrm(reg, src)];
}
export function assemble(source: string): Instruction[] {
  const labels = new Map<string, number>();
  const instructions: Instruction[] = [];
  let address = 0x100;
  source.split('\n').forEach((raw, index) => {
    let text = raw.split(';')[0].trim();
    if (!text) return;
    try {
      const label = text.match(/^([A-Za-z_]\w*):/);
      if (label) {
        const key = label[1].toUpperCase();
        if (labels.has(key)) throw Error('Etiqueta duplicada: ' + key);
        labels.set(key, address);
        text = text.slice(label[0].length).trim();
        if (!text) return;
      }
      const match = text.match(/^([A-Za-z]+)\s*(.*)$/);
      if (!match) throw Error('Sintaxis inválida');
      const op =
        ({ JE: 'JZ', JNE: 'JNZ' } as Record<string, string>)[match[1].toUpperCase()] ??
        match[1].toUpperCase();
      const isJump = ['JMP', 'JZ', 'JNZ', 'LOOP', 'CALL'].includes(op);
      if (isJump && !/^[A-Za-z_]\w*$/.test(match[2]))
        throw Error(op === 'CALL' ? 'CALL admite solo una etiqueta cercana, no CALL lejano ni indirecto' : 'El salto requiere una etiqueta');
      const operands = isJump ? [] : match[2] ? match[2].split(',').map(operand) : [];
      const bytes = isJump
        ? op === 'JMP' || op === 'CALL'
          ? [op === 'JMP' ? 0xe9 : 0xe8, 0, 0]
          : [{ JZ: 0x74, JNZ: 0x75, LOOP: 0xe2 }[op as 'JZ'], 0]
        : encode(op, operands);
      instructions.push({ address, line: index + 1, text, op, operands, bytes });
      address += bytes.length;
      if (address > 0x10000 || address - 0x100 > 16384) throw Error('Programa demasiado grande');
    } catch (e) {
      throw Error('Línea ' + (index + 1) + ': ' + (e as Error).message);
    }
  });
  for (const i of instructions) {
    if (!['JMP', 'JZ', 'JNZ', 'LOOP', 'CALL'].includes(i.op)) continue;
    const label = i.text.split(/\s+/)[1].toUpperCase();
    const target = labels.get(label);
    if (target === undefined || !instructions.some((x) => x.address === target))
      throw Error('Destino inválido: ' + label);
    const relative = target - (i.address + i.bytes.length);
    const bound = i.op === 'JMP' || i.op === 'CALL' ? 32768 : 128;
    if (relative < -bound || relative >= bound) throw Error('Salto fuera de rango: ' + label);
    i.target = target;
    i.bytes.splice(
      1,
      i.bytes.length - 1,
      ...(i.op === 'JMP' || i.op === 'CALL' ? bytePair(relative) : [relative & 255]),
    );
  }
  if (!instructions.length) throw Error('Escribe al menos una instrucción');
  return instructions;
}
/** Decode supported 8086 bytes independently of assembler metadata. */
export function decode(
  memory: Record<number, number>,
  segment: number,
  address: number,
): Instruction {
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
  const u16 = () => next() | (next() << 8),
    s8 = (v: number) => (v & 128 ? v - 256 : v);
  const register = (n: number): Operand => ({ kind: 'register', name: REGISTER_NAMES[n] });
  const mod = () => {
    const b = next(),
      mode = b >> 6,
      field = (b >> 3) & 7,
      rm = b & 7;
    if (mode === 3) return { field, operand: register(rm) };
    const patterns: Register[][] = [
      ['BX', 'SI'],
      ['BX', 'DI'],
      ['BP', 'SI'],
      ['BP', 'DI'],
      ['SI'],
      ['DI'],
      ['BP'],
      ['BX'],
    ];
    const direct = mode === 0 && rm === 6;
    const bases = direct ? [] : patterns[rm];
    const displacement = direct || mode === 2 ? u16() : mode === 1 ? s8(next()) : 0;
    const operand: Operand = {
      kind: 'memory',
      bases,
      displacement,
      rm,
      segment: bases.includes('BP') ? 'SS' : 'DS',
    };
    return { field, operand };
  };
  const opcode = next();
  let op = '',
    operands: Operand[] = [],
    target: number | undefined;
  if (opcode >= 0xb8 && opcode <= 0xbf) {
    op = 'MOV';
    operands = [register(opcode - 0xb8), { kind: 'immediate', value: u16() }];
  } else if (opcode >= 0x40 && opcode <= 0x4f) {
    op = opcode < 0x48 ? 'INC' : 'DEC';
    operands = [register(opcode & 7)];
  } else if (opcode >= 0x50 && opcode <= 0x5f) {
    op = opcode < 0x58 ? 'PUSH' : 'POP';
    operands = [register(opcode & 7)];
  } else if (opcode === 0xc3) op = 'RET';
  else if (opcode === 0x90 || opcode === 0xf4) op = opcode === 0xf4 ? 'HLT' : 'NOP';
  else if ([0xe9, 0xe8, 0x74, 0x75, 0xe2].includes(opcode)) {
    op = ({ 233: 'JMP', 232: 'CALL', 116: 'JZ', 117: 'JNZ', 226: 'LOOP' } as Record<number, string>)[opcode];
    const wide = opcode === 0xe9 || opcode === 0xe8;
    const raw = wide ? u16() : next();
    const relative = wide ? (raw & 32768 ? raw - 65536 : raw) : s8(raw);
    target = word(ip + relative);
  } else if (opcode === 0x81) {
    const value = mod();
    op = ({ 0: 'ADD', 5: 'SUB', 7: 'CMP' } as Record<number, string>)[value.field];
    if (!op || value.operand.kind !== 'register')
      throw Error('Forma de opcode 81h fuera del subconjunto');
    operands = [value.operand, { kind: 'immediate', value: u16() }];
  } else if ([0x89, 0x8b, 0x03, 0x2b, 0x3b].includes(opcode)) {
    const value = mod();
    op = ({ 137: 'MOV', 139: 'MOV', 3: 'ADD', 43: 'SUB', 59: 'CMP' } as Record<number, string>)[
      opcode
    ];
    operands =
      opcode === 0x89
        ? [value.operand, register(value.field)]
        : [register(value.field), value.operand];
  } else throw Error('Opcode no admitido: ' + hex(opcode, 2) + 'h en CS:' + hex(address));
  const fmt = (o: Operand) =>
    o.kind === 'register'
      ? o.name
      : o.kind === 'immediate'
        ? hex(o.value) + 'h'
        : '[' +
          [...o.bases, ...(o.displacement ? [hex(word(o.displacement)) + 'h'] : [])].join('+') +
          ']';
  return {
    address,
    line: 0,
    op,
    operands,
    bytes,
    target,
    text:
      op +
      (target !== undefined
        ? ' ' + hex(target) + 'h'
        : operands.length
          ? ' ' + operands.map(fmt).join(', ')
          : ''),
  };
}

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
export class Cpu8086 {
  registers = initialRegisters();
  flags = initialFlags();
  memory: Record<number, number> = {};
  halted = false;
  instructions: Instruction[] = [];
  trace: Trace[] = [];
  constructor() {
    this.reset();
  }
  reset(): void {
    this.registers = initialRegisters();
    this.flags = initialFlags();
    this.memory = {};
    this.trace = [];
    this.halted = false;
    this.writeWord(0x2000, 10, 5);
    this.writeWord(0x2100, 10, 9);
    [1, 2, 3, 4].forEach((v, n) => this.writeWord(0x2000, n * 2, v));
  }
  load(source: string): void {
    const program = assemble(source);
    this.reset();
    this.instructions = program;
    for (const i of program)
      i.bytes.forEach(
        (b, n) => (this.memory[physicalAddress(this.registers.CS, i.address + n)] = b),
      );
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
    };
  }
  restore(state: Snapshot): void {
    this.registers = { ...state.registers };
    this.flags = { ...state.flags };
    this.memory = { ...state.memory };
    this.halted = state.halted;
  }
  private address(o: Extract<Operand, { kind: 'memory' }>): number {
    return word(o.displacement + o.bases.reduce((sum, r) => sum + this.registers[r], 0));
  }
  step(): Trace | undefined {
    if (this.halted) return;
    const i = decode(this.memory, this.registers.CS, this.registers.IP);
    const authored = this.instructions.find(
      (x) =>
        x.address === i.address &&
        x.bytes.every((b, n) => b === i.bytes[n]) &&
        x.bytes.length === i.bytes.length,
    );
    if (authored) {
      i.text = authored.text;
      i.line = authored.line;
    }
    const before = this.snapshot();
    const operation: Operation = { operands: [], accesses: [] };
    const reads: number[] = [];
    const writes: number[] = [];
    const read = (o: Operand): number => {
      if (o.kind === 'immediate') return o.value;
      if (o.kind === 'register') return this.registers[o.name];
      const offset = this.address(o);
      const segment = this.registers[o.segment];
      reads.push(physicalAddress(segment, offset));
      const value = this.readWord(segment, offset);
      operation.accesses.push({ kind: 'read', address: physicalAddress(segment, offset), value });
      return value;
    };
    const write = (o: Operand, v: number) => {
      if (o.kind === 'register') this.registers[o.name] = word(v);
      else if (o.kind === 'memory') {
        const offset = this.address(o);
        writes.push(physicalAddress(this.registers[o.segment], offset));
        operation.accesses.push({
          kind: 'write',
          address: physicalAddress(this.registers[o.segment], offset),
          value: word(v),
        });
        this.writeWord(this.registers[o.segment], offset, v);
      } else throw Error('Destino inválido');
    };
    this.registers.IP = word(i.address + i.bytes.length);
    // Stack word at SS:SP. PUSH and CALL write below SP, POP and RET read from it; none touches the flags.
    const push = (value: number) => {
      this.registers.SP = word(this.registers.SP - 2);
      const address = physicalAddress(this.registers.SS, this.registers.SP);
      writes.push(address);
      operation.accesses.push({ kind: 'write', address, value: word(value) });
      this.writeWord(this.registers.SS, this.registers.SP, value);
    };
    const pop = (): number => {
      const address = physicalAddress(this.registers.SS, this.registers.SP);
      const value = this.readWord(this.registers.SS, this.registers.SP);
      reads.push(address);
      operation.accesses.push({ kind: 'read', address, value });
      this.registers.SP = word(this.registers.SP + 2);
      return value;
    };
    if (i.op === 'HLT') this.halted = true;
    else if (i.op === 'PUSH') {
      const value = read(i.operands[0]);
      operation.operands = [value];
      push(value);
    } else if (i.op === 'POP') {
      const value = pop();
      operation.operands = [value];
      if (i.operands[0].kind === 'register') this.registers[i.operands[0].name] = value;
    } else if (i.op === 'CALL') {
      operation.operands = [this.registers.IP];
      push(this.registers.IP);
      this.registers.IP = i.target!;
    } else if (i.op === 'RET') {
      this.registers.IP = pop();
      operation.operands = [this.registers.IP];
    } else if (['JMP', 'JZ', 'JNZ', 'LOOP'].includes(i.op)) {
      if (i.op === 'LOOP') this.registers.CX = word(this.registers.CX - 1);
      if (
        i.op === 'JMP' ||
        (i.op === 'JZ' && this.flags.ZF) ||
        (i.op === 'JNZ' && !this.flags.ZF) ||
        (i.op === 'LOOP' && this.registers.CX !== 0)
      )
        this.registers.IP = i.target!;
    } else if (i.op !== 'NOP') {
      const a = i.op === 'MOV' ? 0 : read(i.operands[0]);
      if (i.op === 'MOV') {
        const value = read(i.operands[1]);
        operation.operands = [value];
        operation.result = value;
        write(i.operands[0], value);
      } else {
        const b = ['INC', 'DEC'].includes(i.op) ? 1 : read(i.operands[1]);
        const subtract = ['SUB', 'CMP', 'DEC'].includes(i.op);
        const raw = subtract ? a - b : a + b;
        const result = word(raw);
        operation.operands = [a, b];
        operation.result = result;
        const oldCF = this.flags.CF;
        this.flags = {
          CF: subtract ? a < b : raw > 0xffff,
          PF: (result & 255).toString(2).split('1').length % 2 === 1,
          AF: !!((a ^ b ^ result) & 16),
          ZF: result === 0,
          SF: !!(result & 0x8000),
          OF: subtract ? !!((a ^ b) & (a ^ result) & 0x8000) : !!(~(a ^ b) & (a ^ result) & 0x8000),
        };
        if (['INC', 'DEC'].includes(i.op)) this.flags.CF = oldCF;
        if (i.op !== 'CMP') write(i.operands[0], result);
      }
    }
    const event = { before, after: this.snapshot(), instruction: i, reads, writes, operation };
    this.trace.push(event);
    return event;
  }
}
