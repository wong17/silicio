export type FlagName = 'CF' | 'PF' | 'AF' | 'ZF' | 'SF' | 'OF';

export interface FlagInfo {
  name: FlagName;
  title: string;
  meaning: string;
}

export const FLAG_INFO: readonly FlagInfo[] = [
  { name: 'CF', title: 'Acarreo', meaning: 'Acarreo o préstamo sin signo: el resultado no cupo en 16 bits.' },
  { name: 'PF', title: 'Paridad', meaning: 'Paridad: 1 si el byte bajo tiene un número par de unos.' },
  { name: 'AF', title: 'Acarreo auxiliar', meaning: 'Acarreo auxiliar entre los nibbles bajos (bits 3 y 4).' },
  { name: 'ZF', title: 'Cero', meaning: 'Cero: el resultado vale exactamente 0000h.' },
  { name: 'SF', title: 'Signo', meaning: 'Signo: copia del bit 15 del resultado.' },
  { name: 'OF', title: 'Desbordamiento', meaning: 'Desbordamiento con signo: el resultado cambió de signo de forma incorrecta.' },
];

export interface FlagContext {
  /** Flag value after the step. */
  value: boolean;
  /** Value before the step, when a step has run. */
  before?: boolean;
  /** 16-bit result of the step, when the instruction produced one. */
  result?: number;
  operands?: number[];
  /** Mnemonic of the executed instruction, e.g. ADD. */
  op?: string;
}

const h4 = (n: number) => (n & 0xffff).toString(16).toUpperCase().padStart(4, '0');

function ones(n: number): number {
  let count = 0;
  for (let v = n & 0xff; v; v >>= 1) count += v & 1;
  return count;
}

/**
 * Why a flag holds its value after the last step. With no step yet it says so; with a step but no result
 * (MOV, jumps) it reports that the instruction leaves the flags as they were.
 */
export function explainFlag(flag: FlagName, c: FlagContext): string {
  const on = c.value ? 1 : 0;
  if (c.op === undefined) return `${flag} = ${on}: aún no se ejecutó ninguna instrucción.`;
  if (c.result === undefined)
    return `${flag} = ${on}: ${c.op} no produce resultado aritmético, así que conserva su valor anterior.`;
  const r = c.result & 0xffff;
  switch (flag) {
    case 'ZF':
      return c.value ? `ZF = 1: el resultado es ${h4(r)}h, es decir, cero.` : `ZF = 0: el resultado ${h4(r)}h no es cero.`;
    case 'SF':
      return `SF = ${on}: el bit 15 de ${h4(r)}h vale ${(r >> 15) & 1}${c.value ? ', resultado negativo con signo' : ''}.`;
    case 'PF': {
      const n = ones(r);
      return `PF = ${on}: el byte bajo ${(r & 0xff).toString(16).toUpperCase().padStart(2, '0')}h tiene ${n} ${n === 1 ? 'uno' : 'unos'}, cantidad ${n % 2 === 0 ? 'par' : 'impar'}.`;
    }
    case 'CF':
      return c.value
        ? `CF = 1: la operación ${c.op} generó acarreo o préstamo fuera de los 16 bits.`
        : `CF = 0: la operación ${c.op} cupo en 16 bits sin acarreo ni préstamo.`;
    case 'OF':
      return c.value
        ? `OF = 1: con signo, ${c.op} dio un resultado de signo incorrecto (${h4(r)}h).`
        : `OF = 0: con signo, el resultado ${h4(r)}h es coherente con los operandos.`;
    case 'AF':
      return c.value
        ? `AF = 1: hubo acarreo o préstamo entre los bits 3 y 4 en ${c.op}.`
        : `AF = 0: no hubo acarreo entre los bits 3 y 4 en ${c.op}.`;
  }
}
