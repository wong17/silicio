import {
  BYTE_REGISTERS,
  REGISTER_NAMES,
  SEGMENT_REGISTERS,
  type ByteRegister,
  type Operand,
  type Register,
  type SegmentRegister,
  type Size,
} from './types';

export interface Symbol {
  name: string;
  value: number;
  kind: 'code' | 'data' | 'const';
  type?: 'byte' | 'word';
}
export interface SymbolContext {
  lookup(name: string): Symbol | undefined;
  /** Pass two: an unknown symbol is an error. Pass one: it counts as zero. */
  strict: boolean;
}
export interface Evaluated {
  value: number;
  symbolic: boolean;
  /** First data symbol met, which gives the access its width. */
  typed?: Symbol;
}

/** Segment values of the fixed layout: `@CODE` and `@DATA`. */
export const SEGMENT_SYMBOLS: Readonly<Record<string, number>> = { '@CODE': 0x1000, '@DATA': 0x2000 };

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

function numberLiteral(token: string): number | undefined {
  if (/^\d+$/.test(token)) return Number(token);
  if (/^0x[\da-f]+$/i.test(token)) return parseInt(token.slice(2), 16);
  if (/^\d[\da-f]*h$/i.test(token)) return parseInt(token.slice(0, -1), 16);
  if (/^[01]+b$/i.test(token)) return parseInt(token.slice(0, -1), 2);
  return undefined;
}

/** Arithmetic on literals, character constants, EQU constants, `OFFSET` and variable names. */
export function evaluate(text: string, ctx: SymbolContext): Evaluated {
  const tokens = text.match(/'[^']*'|"[^"]*"|[A-Za-z_@?$.][\w@?$.]*|\d[\w]*|[-+*()]/g) ?? [];
  if (tokens.join('').length !== text.replace(/\s+/g, '').length)
    throw Error('Expresión no válida: ' + text.trim());
  let at = 0;
  let symbolic = false;
  let typed: Symbol | undefined;
  const peek = () => tokens[at];
  const factor = (): number => {
    const t = tokens[at++];
    if (t === undefined) throw Error('Expresión incompleta: ' + text.trim());
    if (t === '-') return -factor();
    if (t === '+') return factor();
    if (t === '(') {
      const v = sum();
      if (tokens[at++] !== ')') throw Error('Falta ) en: ' + text.trim());
      return v;
    }
    if (t[0] === "'" || t[0] === '"') {
      if (t.length !== 3) throw Error('Un carácter entre comillas debe tener una sola letra: ' + t);
      return t.charCodeAt(1);
    }
    if (/^offset$/i.test(t)) return factor();
    const n = numberLiteral(t);
    if (n !== undefined) return n;
    const upper = t.toUpperCase();
    if ((REGISTER_NAMES as readonly string[]).includes(upper) || (BYTE_REGISTERS as readonly string[]).includes(upper))
      throw Error('No se puede usar el registro ' + upper + ' en esta expresión');
    const symbol = ctx.lookup(upper);
    if (symbol) {
      symbolic = true;
      if (symbol.kind === 'data') typed ??= symbol;
      return symbol.value;
    }
    if (upper in SEGMENT_SYMBOLS) return SEGMENT_SYMBOLS[upper];
    if (/^[a-f][\da-f]*h$/i.test(t)) return parseInt(t.slice(0, -1), 16);
    if (ctx.strict) throw Error('Símbolo no definido: ' + t);
    symbolic = true;
    return 0;
  };
  const product = (): number => {
    let v = factor();
    while (peek() === '*') {
      at++;
      v *= factor();
    }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (peek() === '+' || peek() === '-') v = tokens[at++] === '+' ? v + product() : v - product();
    return v;
  };
  const value = sum();
  if (at !== tokens.length) throw Error('Expresión no válida: ' + text.trim());
  return { value, symbolic, typed };
}

/** `[BX+SI+4]`, `[10]`, `tabla[SI]`, `BYTE PTR [BX]`, `OFFSET x`, registers, numbers and variable names. */
export function parseOperand(raw: string, ctx: SymbolContext): Operand {
  let text = raw.trim();
  if (!text) throw Error('Falta un operando');
  if (/^[A-Za-z]{2}\s*:/.test(text) && !/^[A-Za-z_]\w*\s*:\s*$/.test(text))
    throw Error('Los prefijos de segmento (' + text.slice(0, 2).toUpperCase() + ':) están fuera del subconjunto de SILICIO');
  let size: Size | undefined;
  const ptr = text.match(/^(BYTE|WORD)\s+PTR\s+(.*)$/i);
  if (ptr) {
    size = ptr[1].toUpperCase() === 'BYTE' ? 8 : 16;
    text = ptr[2].trim();
  }
  const upper = text.toUpperCase();
  if ((REGISTER_NAMES as readonly string[]).includes(upper) && !ptr)
    return { kind: 'register', name: upper as Register, size: 16 };
  if ((BYTE_REGISTERS as readonly string[]).includes(upper) && !ptr)
    return { kind: 'register', name: upper as ByteRegister, size: 8 };
  if ((SEGMENT_REGISTERS as readonly string[]).includes(upper) && !ptr)
    return { kind: 'segment', name: upper as SegmentRegister };

  const bracket = text.indexOf('[');
  if (bracket >= 0) {
    if (!text.endsWith(']')) throw Error('Falta ]');
    const before = text.slice(0, bracket).trim();
    const inside = text.slice(bracket + 1, -1).replace(/\s/g, '');
    if (!inside) throw Error('Dirección vacía: ' + text);
    const bases: Register[] = [];
    let displacement = 0;
    let symbolic = false;
    let typed: Symbol | undefined;
    const addTerm = (term: string, sign: 1 | -1) => {
      const t = term.toUpperCase();
      if ((REGISTER_NAMES as readonly string[]).includes(t)) {
        if (!['BX', 'BP', 'SI', 'DI'].includes(t) || sign < 0 || bases.includes(t as Register))
          throw Error('Dirección no admitida: ' + text);
        bases.push(t as Register);
        return;
      }
      const e = evaluate(term, ctx);
      displacement += sign * e.value;
      symbolic ||= e.symbolic;
      typed ??= e.typed;
    };
    if (before) {
      const e = evaluate(before, ctx);
      displacement += e.value;
      symbolic ||= e.symbolic;
      typed ??= e.typed;
    }
    for (const part of inside.match(/[+-]?[^+-]+/g) ?? []) {
      const sign = part.startsWith('-') ? -1 : 1;
      addTerm(part.replace(/^[+-]/, ''), sign);
    }
    const key = [...bases].sort().join('+');
    if (!(key in modes) || displacement < -32768 || displacement > 65535)
      throw Error('Dirección no admitida: ' + text);
    const found = (typed as Symbol | undefined)?.type;
    return {
      kind: 'memory',
      bases,
      displacement,
      rm: modes[key],
      segment: bases.includes('BP') ? 'SS' : 'DS',
      size: size ?? (found ? (found === 'byte' ? 8 : 16) : undefined),
      wide: symbolic || undefined,
    };
  }

  // A bare variable name is the value stored there; any other expression is an immediate value.
  if (/^[A-Za-z_@?$][\w@?$]*$/.test(text) && !/^offset$/i.test(text)) {
    const symbol = ctx.lookup(upper);
    if (symbol?.kind === 'data') {
      return {
        kind: 'memory',
        bases: [],
        displacement: symbol.value,
        rm: 6,
        segment: 'DS',
        size: size ?? (symbol.type === 'byte' ? 8 : 16),
        wide: true,
      };
    }
  }
  if (ptr) throw Error('PTR se usa con una dirección entre corchetes o una variable');
  return { kind: 'immediate', value: evaluate(text, ctx).value };
}
