import {
  BYTE_REGISTERS,
  REGISTER_NAMES,
  SEGMENT_REGISTERS,
  bytePair,
  type ByteRegister,
  type Operand,
  type Register,
  type SegmentRegister,
  type Size,
} from './types';

export const ALU_OPS = ['ADD', 'OR', 'ADC', 'SBB', 'AND', 'SUB', 'XOR', 'CMP'] as const;
export const SHIFT_FIELDS: Readonly<Record<string, number>> = {
  ROL: 0,
  ROR: 1,
  SHL: 4,
  SHR: 5,
  SAR: 7,
};
export const GROUP3_FIELDS: Readonly<Record<string, number>> = {
  TEST: 0,
  NOT: 2,
  NEG: 3,
  MUL: 4,
  IMUL: 5,
  DIV: 6,
  IDIV: 7,
};
/** Conditional jumps by their first opcode byte (0x70 + condition). */
export const JCC_OPCODES: Readonly<Record<string, number>> = {
  JO: 0x70,
  JNO: 0x71,
  JB: 0x72,
  JAE: 0x73,
  JZ: 0x74,
  JNZ: 0x75,
  JBE: 0x76,
  JA: 0x77,
  JS: 0x78,
  JNS: 0x79,
  JL: 0x7c,
  JGE: 0x7d,
  JLE: 0x7e,
  JG: 0x7f,
};
export const SHORT_JUMPS = new Set([...Object.keys(JCC_OPCODES), 'LOOP']);
export const NEAR_JUMPS = new Set(['JMP', 'CALL']);

export const registerIndex = (o: Extract<Operand, { kind: 'register' }>): number =>
  o.size === 8
    ? BYTE_REGISTERS.indexOf(o.name as ByteRegister)
    : REGISTER_NAMES.indexOf(o.name as Register);

export const operandSize = (o: Operand): Size | undefined =>
  o.kind === 'register' ? o.size : o.kind === 'memory' ? o.size : o.kind === 'segment' ? 16 : undefined;

const isRm = (o: Operand): o is Extract<Operand, { kind: 'register' | 'memory' }> =>
  o.kind === 'register' || o.kind === 'memory';

export function modrm(field: number, o: Operand): number[] {
  if (o.kind === 'register') return [0xc0 | (field << 3) | registerIndex(o)];
  if (o.kind !== 'memory') throw Error('Se esperaba registro o memoria');
  if (!o.bases.length) return [(field << 3) | 6, ...bytePair(o.displacement)];
  const d = o.displacement;
  if (!o.wide && !d && !(o.bases.length === 1 && o.bases[0] === 'BP')) return [(field << 3) | o.rm];
  if (!o.wide && d >= -128 && d <= 127) return [0x40 | (field << 3) | o.rm, d & 255];
  return [0x80 | (field << 3) | o.rm, ...bytePair(d)];
}

function immediate(o: Operand, size: Size): number[] {
  if (o.kind !== 'immediate') throw Error('Se esperaba un valor inmediato');
  const v = o.value;
  if (size === 8) {
    if (v < -128 || v > 255) throw Error('El valor ' + v + ' no cabe en 8 bits');
    return [v & 255];
  }
  if (v < -32768 || v > 65535) throw Error('Literal fuera de 16 bits: ' + v);
  return bytePair(v);
}

/** The width shared by the operands; a mismatch or an unknown width is a mistake the student can fix. */
function sizeOfPair(a: Operand, b?: Operand): Size {
  const sa = operandSize(a);
  const sb = b ? operandSize(b) : undefined;
  if (sa && sb && sa !== sb) throw Error('Los operandos tienen tamaños distintos (8 y 16 bits)');
  const size = sa ?? sb;
  if (!size) throw Error('Indica el tamaño con BYTE PTR o WORD PTR');
  return size;
}

function expect(op: string, ops: Operand[], count: number): void {
  if (ops.length !== count)
    throw Error(
      count === 0
        ? op + ' no lleva operandos'
        : op + (count === 1 ? ' lleva un operando' : ' lleva ' + count + ' operandos'),
    );
}

/** Bytes of one instruction whose operands are already resolved; jumps are placed by the assembler. */
export function encode(op: string, ops: Operand[]): number[] {
  switch (op) {
    case 'HLT':
    case 'NOP':
    case 'CBW':
    case 'CWD':
      expect(op, ops, 0);
      return [{ HLT: 0xf4, NOP: 0x90, CBW: 0x98, CWD: 0x99 }[op]!];
    case 'RET':
      if (ops.length)
        throw Error('RET no lleva operandos: solo se admite el retorno cercano sin desplazamiento');
      return [0xc3];
    case 'INT': {
      expect(op, ops, 1);
      const v = ops[0].kind === 'immediate' ? ops[0].value : -1;
      if (v !== 0x20 && v !== 0x21) throw Error('INT admite solo 20h y 21h en este laboratorio');
      return [0xcd, v];
    }
    case 'PUSH':
    case 'POP':
      // Only 16-bit registers: segment registers, memory and immediates are outside the subset.
      if (ops.length !== 1 || ops[0].kind !== 'register' || ops[0].size !== 16)
        throw Error(op + ' admite solo un registro de 16 bits');
      return [(op === 'PUSH' ? 0x50 : 0x58) + registerIndex(ops[0])];
    case 'INC':
    case 'DEC': {
      expect(op, ops, 1);
      const o = ops[0];
      if (!isRm(o)) throw Error('Se esperaba un registro o una posición de memoria');
      const field = op === 'INC' ? 0 : 1;
      if (o.kind === 'register' && o.size === 16) return [(op === 'INC' ? 0x40 : 0x48) + registerIndex(o)];
      return [sizeOfPair(o) === 8 ? 0xfe : 0xff, ...modrm(field, o)];
    }
    case 'NOT':
    case 'NEG':
    case 'MUL':
    case 'IMUL':
    case 'DIV':
    case 'IDIV': {
      expect(op, ops, 1);
      if (!isRm(ops[0])) throw Error(op + ' necesita un registro o una posición de memoria');
      return [sizeOfPair(ops[0]) === 8 ? 0xf6 : 0xf7, ...modrm(GROUP3_FIELDS[op], ops[0])];
    }
    case 'IN':
    case 'OUT': {
      expect(op, ops, 2);
      const [first, second] = ops;
      const acc = op === 'IN' ? first : second;
      const port = op === 'IN' ? second : first;
      if (acc.kind !== 'register' || acc.size !== 8 || acc.name !== 'AL')
        throw Error(op + ' usa AL: los puertos del 8255 didáctico son de 8 bits');
      if (port.kind === 'register' && port.name === 'DX') return [op === 'IN' ? 0xec : 0xee];
      if (port.kind === 'immediate') {
        if (port.value < 0 || port.value > 255) throw Error('Un puerto inmediato va de 0 a 255; para uno mayor usa DX');
        return [op === 'IN' ? 0xe4 : 0xe6, port.value];
      }
      throw Error('El puerto es un número de 0 a 255 o el registro DX');
    }
    case 'LEA': {
      expect(op, ops, 2);
      const [d, s] = ops;
      if (d.kind !== 'register' || d.size !== 16 || s.kind !== 'memory')
        throw Error('LEA carga un registro de 16 bits con una dirección de memoria');
      return [0x8d, ...modrm(registerIndex(d), s)];
    }
    case 'XCHG': {
      expect(op, ops, 2);
      let [a, b] = ops;
      if (a.kind === 'memory') [a, b] = [b, a];
      if (a.kind !== 'register' || !isRm(b))
        throw Error('XCHG intercambia un registro con registro o memoria');
      return [sizeOfPair(a, b) === 8 ? 0x86 : 0x87, ...modrm(registerIndex(a), b)];
    }
    case 'SHL':
    case 'SHR':
    case 'SAR':
    case 'ROL':
    case 'ROR': {
      expect(op, ops, 2);
      const [d, c] = ops;
      if (!isRm(d)) throw Error(op + ' necesita un registro o una posición de memoria');
      const byCl = c.kind === 'register' && c.name === 'CL';
      if (!byCl && !(c.kind === 'immediate' && c.value === 1))
        throw Error('El 8086 desplaza de 1 en 1; usa CL para otra cuenta');
      const size = sizeOfPair(d);
      return [(size === 8 ? 0xd0 : 0xd1) + (byCl ? 2 : 0), ...modrm(SHIFT_FIELDS[op], d)];
    }
    case 'TEST': {
      expect(op, ops, 2);
      let [a, b] = ops;
      if (a.kind === 'register' && b.kind === 'memory') [a, b] = [b, a];
      if (b.kind === 'immediate') {
        if (!isRm(a)) throw Error('TEST necesita un registro o memoria');
        const size = sizeOfPair(a);
        return [size === 8 ? 0xf6 : 0xf7, ...modrm(0, a), ...immediate(b, size)];
      }
      if (!isRm(a) || b.kind !== 'register')
        throw Error('TEST compara un registro con registro, memoria o valor');
      return [sizeOfPair(a, b) === 8 ? 0x84 : 0x85, ...modrm(registerIndex(b), a)];
    }
    case 'MOV':
      return encodeMov(ops);
    default: {
      const group = (ALU_OPS as readonly string[]).indexOf(op);
      if (group < 0) throw Error('Instrucción no admitida: ' + op + ' (fuera del subconjunto de SILICIO)');
      return encodeAlu(op, group, ops);
    }
  }
}

function encodeAlu(op: string, group: number, ops: Operand[]): number[] {
  expect(op, ops, 2);
  const [dst, src] = ops;
  if (src.kind === 'immediate') {
    if (!isRm(dst)) throw Error('El destino debe ser un registro o una posición de memoria');
    const size = sizeOfPair(dst);
    return [size === 8 ? 0x80 : 0x81, ...modrm(group, dst), ...immediate(src, size)];
  }
  const base = group * 8;
  if (dst.kind === 'register' && isRm(src))
    return [base + (sizeOfPair(dst, src) === 8 ? 2 : 3), ...modrm(registerIndex(dst), src)];
  if (dst.kind === 'memory' && src.kind === 'register')
    return [base + (sizeOfPair(dst, src) === 8 ? 0 : 1), ...modrm(registerIndex(src), dst)];
  if (dst.kind === 'memory' && src.kind === 'memory')
    throw Error('Una instrucción no puede tener dos operandos en memoria');
  throw Error('El destino debe ser un registro o una posición de memoria');
}

function encodeMov(ops: Operand[]): number[] {
  expect('MOV', ops, 2);
  const [dst, src] = ops;
  if (dst.kind === 'segment') {
    if (dst.name === 'CS') throw Error('CS no se puede cargar con MOV');
    if (!isRm(src) || sizeOfPair(src) !== 16)
      throw Error('Un registro de segmento se carga desde un registro de 16 bits o memoria');
    return [0x8e, ...modrm(SEGMENT_REGISTERS.indexOf(dst.name as SegmentRegister), src)];
  }
  if (src.kind === 'segment') {
    if (!isRm(dst) || sizeOfPair(dst) !== 16)
      throw Error('Un registro de segmento se copia a un registro de 16 bits o memoria');
    return [0x8c, ...modrm(SEGMENT_REGISTERS.indexOf(src.name as SegmentRegister), dst)];
  }
  if (src.kind === 'immediate') {
    if (dst.kind === 'register')
      return dst.size === 8
        ? [0xb0 + registerIndex(dst), ...immediate(src, 8)]
        : [0xb8 + registerIndex(dst), ...immediate(src, 16)];
    if (dst.kind !== 'memory') throw Error('El destino debe ser un registro o una posición de memoria');
    const size = sizeOfPair(dst);
    return [size === 8 ? 0xc6 : 0xc7, ...modrm(0, dst), ...immediate(src, size)];
  }
  if (dst.kind === 'register' && isRm(src))
    return [sizeOfPair(dst, src) === 8 ? 0x8a : 0x8b, ...modrm(registerIndex(dst), src)];
  if (dst.kind === 'memory' && src.kind === 'register')
    return [sizeOfPair(dst, src) === 8 ? 0x88 : 0x89, ...modrm(registerIndex(src), dst)];
  if (dst.kind === 'memory' && src.kind === 'memory')
    throw Error('Una instrucción no puede tener dos operandos en memoria');
  throw Error('El destino debe ser un registro o una posición de memoria');
}
