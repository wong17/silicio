/**
 * The conceptual 32-bit processor of «La máquina»: a word is one instruction, words are the unit of memory
 * and R0–R3 are its registers. It is a teaching model of the course's PC, not x86-64.
 *
 * Instruction word: operation (8 bits) · a (4 bits) · b (4 bits) · immediate (16 bits, signed).
 */
export const OPERATIONS = [
  'INPUT', 'LOADI', 'LOAD', 'STORE', 'ADD', 'SUB', 'ADDI', 'COMPARE', 'COMPAREI', 'BRANCH', 'STATUS',
  'READ_FILE', 'WRITE_FILE', 'DISPLAY', 'HALT', 'RETI', 'EI',
] as const;
export type Operation = (typeof OPERATIONS)[number];

/** Operations that are services of the system (files and screen), not instructions of a real ISA. */
export const SERVICES: ReadonlySet<Operation> = new Set(['READ_FILE', 'WRITE_FILE', 'DISPLAY']);

export const CONDITIONS = ['ALWAYS', 'Z', 'NZ', 'N', 'NN', 'V', 'NV', 'LT', 'GE'] as const;
export type Condition = (typeof CONDITIONS)[number];

/** Where `READ_FILE` puts the data. */
export const REGIONS = ['input', 'program'] as const;
/** What `DISPLAY` shows: the framebuffer as text or as an 8×8 image, a number, an error, the input region as text. */
export const DISPLAY_MODES = ['text', 'image', 'number', 'error', 'input-text'] as const;
/** What `WRITE_FILE` writes: the words of the input region as text, or one integer as decimal text. */
export const WRITE_MODES = ['text', 'number'] as const;

export interface Decoded {
  op: Operation;
  a: number;
  b: number;
  imm: number;
}

export function encode(d: Decoded): number {
  const op = OPERATIONS.indexOf(d.op) + 1;
  if (op === 0) throw Error('Operación desconocida: ' + d.op);
  return ((op & 0xff) << 24) | ((d.a & 15) << 20) | ((d.b & 15) << 16) | (d.imm & 0xffff);
}

export function decode(word: number): Decoded {
  const w = word >>> 0;
  const op = OPERATIONS[(w >>> 24) - 1];
  if (!op) throw Error('Palabra de instrucción inválida: ' + (w >>> 0).toString(16).padStart(8, '0') + 'h');
  const imm = w & 0xffff;
  return { op, a: (w >>> 20) & 15, b: (w >>> 16) & 15, imm: imm & 0x8000 ? imm - 0x10000 : imm };
}

export const signed32 = (n: number): number => n | 0;

/** One line of the assembly of the fixtures, as the student reads it. */
export function format(d: Decoded, names: readonly string[] = FILE_NAMES): string {
  const r = (n: number) => 'R' + n;
  switch (d.op) {
    case 'HALT': case 'RETI': case 'EI': return d.op;
    case 'INPUT': return 'INPUT ' + r(d.a);
    case 'LOADI': return 'LOADI ' + r(d.a) + ', ' + d.imm;
    case 'LOAD': return 'LOAD ' + r(d.a) + ', [' + r(d.b) + (d.imm ? '+' + d.imm : '') + ']';
    case 'STORE': return 'STORE [' + r(d.b) + (d.imm ? '+' + d.imm : '') + '], ' + r(d.a);
    case 'ADD': case 'SUB': case 'COMPARE': return d.op + ' ' + r(d.a) + ', ' + r(d.b);
    case 'ADDI': case 'COMPAREI': return d.op + ' ' + r(d.a) + ', ' + d.imm;
    case 'BRANCH': return 'BRANCH ' + CONDITIONS[d.a] + ', ' + d.imm;
    case 'STATUS': return 'STATUS ' + r(d.a) + ', ' + d.imm;
    case 'READ_FILE': return 'READ_FILE ' + r(d.a) + ', ' + REGIONS[d.b] + ', ' + (names[d.imm] ?? d.imm);
    case 'WRITE_FILE': return 'WRITE_FILE ' + r(d.a) + ', ' + (names[d.imm] ?? d.imm) + ', ' + WRITE_MODES[d.b];
    case 'DISPLAY': return 'DISPLAY ' + DISPLAY_MODES[d.b] + ', ' + r(d.a) + (d.imm ? ', ' + d.imm : '');
  }
}

/** Slots of the virtual SSD with fixed names, so a program names a file by its place in this table. */
export const FILE_NAMES = ['programa.bin', 'datos.csv', 'resultado.txt', 'nota.txt', 'imagen.csv'] as const;
export type FileName = (typeof FILE_NAMES)[number];

const reg = (t: string): number => {
  const m = /^R([0-3])$/i.exec(t.trim());
  if (!m) throw Error('Registro inválido: ' + t.trim() + ' (R0 a R3)');
  return Number(m[1]);
};
const num = (t: string, labels: ReadonlyMap<string, number>): number => {
  const s = t.trim();
  const v = labels.get(s.toLowerCase());
  if (v !== undefined) return v;
  if (/^[-+]?\d+$/.test(s)) return Number(s);
  if (/^0x[\da-f]+$/i.test(s)) return parseInt(s, 16);
  throw Error('Valor inválido: ' + s);
};
const mem = (t: string, labels: ReadonlyMap<string, number>): { b: number; imm: number } => {
  const m = /^\[\s*(R[0-3])\s*(?:([+-])\s*([\w]+))?\s*\]$/i.exec(t.trim());
  if (!m) throw Error('Dirección inválida: ' + t.trim() + ' (usa [Rn+desplazamiento])');
  const off = m[3] ? num(m[3], labels) * (m[2] === '-' ? -1 : 1) : 0;
  return { b: reg(m[1]), imm: off };
};
const split = (t: string) => t.split(',').map((x) => x.trim());

/**
 * Assembles the text of a fixture. Labels end with `:`; `;` starts a comment; `.org N` is not needed:
 * the program is copied to the start of the program region, and labels are word offsets there.
 */
export function assemble(source: string, base: number, symbols: Readonly<Record<string, number>> = {}): number[] {
  const lines = source
    .split('\n')
    .map((l) => l.split(';')[0].trim())
    .filter(Boolean);
  const labels = new Map<string, number>(Object.entries(symbols).map(([k, v]) => [k.toLowerCase(), v]));
  let at = 0;
  const bodies: { line: string; index: number }[] = [];
  for (const line of lines) {
    const label = /^([A-Za-z_]\w*):\s*(.*)$/.exec(line);
    const rest = label ? label[2] : line;
    if (label) labels.set(label[1].toLowerCase(), base + at);
    if (rest) bodies.push({ line: rest, index: at++ });
  }
  return bodies.map(({ line }) => {
    const [mn, ...restParts] = line.split(/\s+/);
    const op = mn.toUpperCase() as Operation;
    const args = split(restParts.join(' '));
    try {
      switch (op) {
        case 'HALT': case 'RETI': case 'EI': return encode({ op, a: 0, b: 0, imm: 0 });
        case 'INPUT': return encode({ op, a: reg(args[0]), b: 0, imm: 0 });
        case 'LOADI': return encode({ op, a: reg(args[0]), b: 0, imm: num(args[1], labels) });
        case 'LOAD': return encode({ op, a: reg(args[0]), ...mem(args[1], labels) });
        case 'STORE': return encode({ op, a: reg(args[1]), ...mem(args[0], labels) });
        case 'ADD': case 'SUB': case 'COMPARE': return encode({ op, a: reg(args[0]), b: reg(args[1]), imm: 0 });
        case 'ADDI': case 'COMPAREI': return encode({ op, a: reg(args[0]), b: 0, imm: num(args[1], labels) });
        case 'BRANCH': {
          const c = CONDITIONS.indexOf(args[0].toUpperCase() as Condition);
          if (c < 0) throw Error('Condición desconocida: ' + args[0]);
          return encode({ op, a: c, b: 0, imm: num(args[1], labels) });
        }
        case 'STATUS': return encode({ op, a: reg(args[0]), b: 0, imm: num(args[1], labels) });
        case 'READ_FILE': {
          const region = REGIONS.indexOf(args[1] as (typeof REGIONS)[number]);
          const file = FILE_NAMES.indexOf(args[2] as FileName);
          if (region < 0 || file < 0) throw Error('READ_FILE necesita región y archivo conocidos');
          return encode({ op, a: reg(args[0]), b: region, imm: file });
        }
        case 'WRITE_FILE': {
          const file = FILE_NAMES.indexOf(args[1] as FileName);
          const mode = WRITE_MODES.indexOf(args[2] as (typeof WRITE_MODES)[number]);
          if (file < 0 || mode < 0) throw Error('WRITE_FILE necesita archivo y modo conocidos');
          return encode({ op, a: reg(args[0]), b: mode, imm: file });
        }
        case 'DISPLAY': {
          const mode = DISPLAY_MODES.indexOf(args[0] as (typeof DISPLAY_MODES)[number]);
          if (mode < 0) throw Error('Modo de DISPLAY desconocido: ' + args[0]);
          return encode({ op, a: args[1] ? reg(args[1]) : 0, b: mode, imm: args[2] ? num(args[2], labels) : 0 });
        }
        default:
          throw Error('Operación desconocida: ' + mn);
      }
    } catch (e) {
      throw Error((e as Error).message + ' en «' + line + '»');
    }
  });
}
