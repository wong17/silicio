import { hex, physicalAddress } from './cpu8086';

/** The logical space of the 8086 is 1 MiB; the board of the bench holds one 128 KiB window of it. */
export const WINDOW_BYTES = 0x20000;

export interface MemoryWindow {
  /** 0–7: which 128 KiB slice of the 1 MiB space. */
  index: number;
  base: number;
  /** Where the address falls inside the window. */
  offset: number;
}

export function windowOf(physical: number): MemoryWindow {
  const address = physical & 0xfffff;
  const index = Math.floor(address / WINDOW_BYTES);
  return { index, base: index * WINDOW_BYTES, offset: address - index * WINDOW_BYTES };
}

export interface StoredWord {
  /** Lower address: the least significant byte. */
  low: number;
  /** Next address: the most significant byte. */
  high: number;
}

/** A word in memory, little endian: 1234h is 34h at the lower address and 12h at the next. */
export function splitWord(value: number): StoredWord {
  const v = value & 0xffff;
  return { low: v & 255, high: v >> 8 };
}
export const joinWord = (low: number, high: number): number => ((high & 255) << 8) | (low & 255);

/** The same word in the formats a student meets, each with its label. */
export type WordFormat = 'hex' | 'dec' | 'bin' | 'ascii';
export function formatWord(value: number, format: WordFormat): string {
  const v = value & 0xffff;
  switch (format) {
    case 'hex':
      return hex(v) + 'h';
    case 'dec':
      return v + ' (decimal)';
    case 'bin':
      return v.toString(2).padStart(16, '0').replace(/(.{4})(?=.)/g, '$1 ') + ' (binario)';
    case 'ascii': {
      const printable = (b: number) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '·');
      return '«' + printable(v & 255) + printable(v >> 8) + '» (ASCII, byte bajo primero)';
    }
  }
}

export type BaseRegister = 'BX' | 'BP' | 'SI' | 'DI';
export interface AddressingMode {
  id: string;
  label: string;
  bases: readonly BaseRegister[];
}
/** The addressing modes of the subset, in the order the course introduces them. */
export const ADDRESSING_MODES: readonly AddressingMode[] = [
  { id: 'direct', label: 'Directo [desplazamiento]', bases: [] },
  { id: 'bx', label: 'Base [BX]', bases: ['BX'] },
  { id: 'bp', label: 'Base [BP] (usa SS)', bases: ['BP'] },
  { id: 'si', label: 'Índice [SI]', bases: ['SI'] },
  { id: 'di', label: 'Índice [DI]', bases: ['DI'] },
  { id: 'bx+si', label: 'Base e índice [BX+SI]', bases: ['BX', 'SI'] },
  { id: 'bx+di', label: 'Base e índice [BX+DI]', bases: ['BX', 'DI'] },
  { id: 'bp+si', label: 'Base e índice [BP+SI] (usa SS)', bases: ['BP', 'SI'] },
  { id: 'bp+di', label: 'Base e índice [BP+DI] (usa SS)', bases: ['BP', 'DI'] },
];

export interface AddressInput {
  mode: string;
  registers: Readonly<Record<BaseRegister, number>>;
  displacement: number;
  segments: Readonly<{ DS: number; SS: number }>;
}
export interface AddressStep {
  title: string;
  text: string;
}
export interface BuiltAddress {
  steps: readonly AddressStep[];
  /** Effective address: base + index + displacement, 16 bits. */
  ea: number;
  segmentName: 'DS' | 'SS';
  segment: number;
  physical: number;
  window: MemoryWindow;
}

const h4 = (v: number) => hex(v) + 'h';

/** Builds the physical address of an operand in the four steps the student has to do by hand. */
export function buildAddress(input: AddressInput): BuiltAddress {
  const mode = ADDRESSING_MODES.find((m) => m.id === input.mode);
  if (!mode) throw Error('Modo de direccionamiento desconocido: ' + input.mode);
  const disp = input.displacement & 0xffff;
  const parts = [...mode.bases.map((r) => input.registers[r] & 0xffff), disp];
  const ea = parts.reduce((sum, v) => sum + v, 0) & 0xffff;
  const segmentName = mode.bases.includes('BP') ? 'SS' : 'DS';
  const segment = input.segments[segmentName] & 0xffff;
  const physical = physicalAddress(segment, ea);
  const operand = '[' + [...mode.bases, ...(disp || !mode.bases.length ? [h4(disp)] : [])].join('+') + ']';
  const roles = mode.bases.map((r) => (r === 'BX' || r === 'BP' ? 'base ' : 'índice ') + r).concat(disp || !mode.bases.length ? ['desplazamiento ' + h4(disp)] : []);
  return {
    ea,
    segmentName,
    segment,
    physical,
    window: windowOf(physical),
    steps: [
      { title: 'Modo de direccionamiento', text: operand + ': ' + roles.join(' + ') + '.' },
      {
        title: 'Dirección efectiva',
        text: 'EA = ' + [...mode.bases.map((r) => r), ...(disp || !mode.bases.length ? ['desplazamiento'] : [])].join(' + ') + ' = ' + parts.map(h4).join(' + ') + ' = ' + h4(ea) + '.',
      },
      { title: 'Segmento', text: segmentName + ' = ' + h4(segment) + (segmentName === 'SS' ? ' (con BP el segmento por defecto es SS)' : ' (el segmento por defecto de los datos)') + '.' },
      { title: 'Dirección física', text: 'física = ' + h4(segment) + ' × 16 + ' + h4(ea) + ' = ' + hex(physical, 5) + 'h.' },
    ],
  };
}

export interface SegmentedAddress {
  segment: number;
  offset: number;
}
/** True when two segment:offset pairs name the same byte of the 20-bit space. */
export const sameAddress = (a: SegmentedAddress, b: SegmentedAddress): boolean =>
  physicalAddress(a.segment, a.offset) === physicalAddress(b.segment, b.offset);

/** Another pair that reaches the same byte: one segment up, sixteen offsets down (when it fits). */
export function aliasOf(a: SegmentedAddress): SegmentedAddress | undefined {
  if (a.offset >= 16 && a.segment < 0xffff) return { segment: a.segment + 1, offset: a.offset - 16 };
  if (a.segment > 0 && a.offset <= 0xffef) return { segment: a.segment - 1, offset: a.offset + 16 };
  return undefined;
}

/** Cycles of the model for a word access: an even address uses both banks at once, an odd one needs two. */
export function wordCycles(physical: number): 1 | 2 {
  return physical % 2 === 0 ? 1 : 2;
}
export const bankOf = (physical: number): 'par' | 'impar' => (physical % 2 === 0 ? 'par' : 'impar');

/**
 * The isolated memory of the exercise: its own bytes, never the 8086 session's. Writing a word follows the
 * same little-endian rule as the processor, with the address rolling over at 20 bits.
 */
export class ExerciseMemory {
  private bytes: Record<number, number> = {};

  byte(address: number): number {
    return this.bytes[address & 0xfffff] ?? 0;
  }

  writeWord(physical: number, value: number): void {
    const { low, high } = splitWord(value);
    this.bytes[physical & 0xfffff] = low;
    this.bytes[(physical + 1) & 0xfffff] = high;
  }

  writeByte(address: number, value: number): void {
    this.bytes[address & 0xfffff] = value & 255;
  }

  readWord(physical: number): number {
    return joinWord(this.byte(physical), this.byte(physical + 1));
  }

  snapshot(): Record<number, number> {
    return { ...this.bytes };
  }

  restore(bytes: Record<number, number>): void {
    this.bytes = { ...bytes };
  }

  clear(): void {
    this.bytes = {};
  }
}
