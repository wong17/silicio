import { JCC_OPCODES, NEAR_JUMPS, SHORT_JUMPS, encode } from './encoding';
import { expandMacros, splitTopLevel, type SourceLine } from './macros';
import { evaluate, parseOperand, type Symbol, type SymbolContext } from './operands';
import {
  bytePair,
  type AssembledProgram,
  type DataBlock,
  type DataSymbol,
  type Instruction,
  type Operand,
  type Size,
} from './types';

const ORIGIN = 0x100;
const MAX_CODE_BYTES = 16384;
const OUT_OF_SUBSET = new Set([
  'MOVSB', 'MOVSW', 'LODSB', 'LODSW', 'STOSB', 'STOSW', 'CMPSB', 'CMPSW', 'SCASB', 'SCASW',
  'REP', 'REPE', 'REPNE', 'REPZ', 'REPNZ', 'LOOPE', 'LOOPNE', 'LOOPZ', 'LOOPNZ', 'JCXZ', 'JP', 'JNP',
  'JPE', 'JPO', 'IRET', 'CLI', 'STI', 'CLD', 'STD', 'CLC', 'STC', 'CMC', 'LAHF', 'SAHF', 'PUSHF',
  'POPF', 'XLAT', 'LDS', 'LES', 'RCL', 'RCR', 'AAA', 'AAS', 'AAD', 'AAM', 'DAA', 'DAS',
  'WAIT', 'ESC', 'LOCK',
]);
const ALIASES: Readonly<Record<string, string>> = {
  JE: 'JZ', JNE: 'JNZ', JC: 'JB', JNAE: 'JB', JNC: 'JAE', JNB: 'JAE', JNA: 'JBE', JNBE: 'JA',
  JNL: 'JGE', JNG: 'JLE', JNLE: 'JG', JNGE: 'JL', SAL: 'SHL',
};

type Item =
  | { kind: 'instr'; line: number; text: string; op: string; args: string[]; address: number; size: number }
  | {
      kind: 'data';
      line: number;
      unit: 'byte' | 'word';
      items: string[];
      segment: 'code' | 'data';
      address: number;
      size: number;
    };

interface Layout {
  items: Item[];
  symbols: Map<string, Symbol>;
  data: DataSymbol[];
  exe: boolean;
  origin: number;
}

const stripComment = (raw: string): string => {
  let quote = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote) quote = '';
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === ';') return raw.slice(0, i).trim();
  }
  return raw.trim();
};

const fail = (line: number, message: string): never => {
  throw Error('Línea ' + line + ': ' + message);
};

function dataSize(items: string[], unit: 'byte' | 'word', ctx: SymbolContext): number {
  const width = unit === 'byte' ? 1 : 2;
  let total = 0;
  for (const item of items) {
    const dup = item.match(/^(.+?)\s+DUP\s*\((.*)\)$/i);
    if (dup) {
      const count = evaluate(dup[1], ctx).value;
      if (count < 0 || count > 16384) throw Error('Número de repeticiones fuera de rango: ' + dup[1].trim());
      total += count * dataSize(splitTopLevel(dup[2]), unit, ctx);
    } else if (/^(['"]).*\1$/.test(item) && item.length !== 3) {
      if (unit === 'word') throw Error('Una cadena solo se declara con DB');
      total += item.length - 2;
    } else total += width;
  }
  return total;
}

function dataBytes(items: string[], unit: 'byte' | 'word', ctx: SymbolContext): number[] {
  const bytes: number[] = [];
  for (const item of items) {
    const dup = item.match(/^(.+?)\s+DUP\s*\((.*)\)$/i);
    if (dup) {
      const inner = dataBytes(splitTopLevel(dup[2]), unit, ctx);
      for (let n = evaluate(dup[1], ctx).value; n > 0; n--) bytes.push(...inner);
    } else if (item === '?') bytes.push(...(unit === 'byte' ? [0] : [0, 0]));
    else if (/^(['"]).*\1$/.test(item) && item.length !== 3) {
      for (const ch of item.slice(1, -1)) bytes.push(ch.charCodeAt(0) & 255);
    } else {
      const v = evaluate(item, ctx).value;
      if (unit === 'byte') {
        if (v < -128 || v > 255) throw Error('El valor ' + v + ' no cabe en un byte (DB)');
        bytes.push(v & 255);
      } else {
        if (v < -32768 || v > 65535) throw Error('Literal fuera de 16 bits: ' + v);
        bytes.push(...bytePair(v));
      }
    }
  }
  return bytes;
}

/** Operands as the encoder needs them: widths settled and immediates checked against them. */
function settle(op: string, operands: Operand[]): Operand[] {
  const widthOf = (o: Operand) => (o.kind === 'register' ? o.size : o.kind === 'memory' ? o.size : o.kind === 'segment' ? 16 : undefined);
  const known = operands.map(widthOf).find((s) => s !== undefined) as Size | undefined;
  return operands.map((o, index) => {
    if (o.kind !== 'immediate') return o;
    if (op === 'INT') return { ...o, size: 8 as Size };
    if (op === 'IN' || op === 'OUT') return { ...o, size: 8 as Size };
    if (/^(SHL|SHR|SAR|ROL|ROR)$/.test(op) && index === 1) return o;
    const size = widthOf(operands[1 - index] ?? o) ?? known ?? 16;
    const v = o.value;
    if (size === 8 && (v < -128 || v > 255)) throw Error('El valor ' + v + ' no cabe en 8 bits');
    if (size === 16 && (v < -32768 || v > 65535)) throw Error('Literal fuera de 16 bits: ' + v);
    return { ...o, value: v & (size === 8 ? 0xff : 0xffff), size };
  });
}

function layout(lines: SourceLine[], previous: Map<string, Symbol>): Layout {
  const symbols = new Map<string, Symbol>();
  const items: Item[] = [];
  const data: DataSymbol[] = [];
  const ctx: SymbolContext = {
    strict: false,
    lookup: (name) => symbols.get(name) ?? previous.get(name),
  };
  let exe = false;
  let section: 'code' | 'data' = 'code';
  let origin = ORIGIN;
  let codeAt = ORIGIN;
  let dataAt = 0;

  for (const { text: whole, line } of lines) {
    try {
      let text = whole;
      const label = text.match(/^([A-Za-z_@?$][\w@?$]*)\s*:(?!:)/);
      if (label) {
        const key = label[1].toUpperCase();
        if (symbols.has(key)) throw Error('Etiqueta duplicada: ' + key);
        symbols.set(key, { name: label[1], value: codeAt, kind: 'code' });
        text = text.slice(label[0].length).trim();
        if (!text) continue;
      }
      const section_ = text.match(/^\.(MODEL|STACK|DATA|CODE|STARTUP|EXIT)\b/i);
      if (section_) {
        const d = section_[1].toUpperCase();
        if (d === 'MODEL') exe = true;
        if (d === 'DATA') section = 'data';
        if (d === 'CODE') section = 'code';
        continue;
      }
      const org = text.match(/^ORG\s+(.+)$/i);
      if (org) {
        if (items.length) throw Error('ORG debe ir antes de la primera instrucción o dato');
        origin = codeAt = evaluate(org[1], ctx).value;
        continue;
      }
      if (/^END\b/i.test(text)) continue;
      const include = text.match(/^INCLUDE\b/i);
      if (include)
        throw Error(
          'INCLUDE no está disponible: escribe el texto con INT 21h servicio 09h o define una macro como en la misión 17',
        );
      const named = text.match(/^([A-Za-z_@?$][\w@?$]*)\s+(PROC|ENDP|EQU|DB|DW)\b\s*(.*)$/i);
      const bare = text.match(/^(DB|DW)\b\s*(.*)$/i);
      if (named && named[2].toUpperCase() === 'ENDP') continue;
      if (named && named[2].toUpperCase() === 'PROC') {
        if (/\bFAR\b/i.test(named[3])) throw Error('PROC FAR está fuera del subconjunto de SILICIO (solo llamadas cercanas)');
        const key = named[1].toUpperCase();
        if (symbols.has(key)) throw Error('Etiqueta duplicada: ' + key);
        symbols.set(key, { name: named[1], value: codeAt, kind: 'code' });
        continue;
      }
      if (named && named[2].toUpperCase() === 'EQU') {
        const key = named[1].toUpperCase();
        if (symbols.has(key)) throw Error('Símbolo duplicado: ' + key);
        symbols.set(key, { name: named[1], value: evaluate(named[3], ctx).value, kind: 'const' });
        continue;
      }
      if (named || bare) {
        const name = named ? named[1] : undefined;
        const unit = (named ? named[2] : bare![1]).toUpperCase() === 'DB' ? 'byte' : 'word';
        const args = splitTopLevel(named ? named[3] : bare![2]);
        if (!args.length) throw Error('Faltan los valores de ' + unit.toUpperCase());
        const segment = exe && section === 'data' ? 'data' : 'code';
        const at = segment === 'data' ? dataAt : codeAt;
        const size = dataSize(args, unit, ctx);
        if (name) {
          const key = name.toUpperCase();
          if (symbols.has(key)) throw Error('Símbolo duplicado: ' + key);
          symbols.set(key, { name, value: at, kind: 'data', type: unit });
          data.push({ name, address: at, type: unit, length: size / (unit === 'byte' ? 1 : 2) });
        }
        items.push({ kind: 'data', line, unit, items: args, segment, address: at, size });
        if (segment === 'data') dataAt += size;
        else codeAt += size;
        continue;
      }
      const m = text.match(/^([A-Za-z]+)\b\s*(.*)$/);
      if (!m) throw Error('Sintaxis inválida');
      let op = m[1].toUpperCase();
      op = ALIASES[op] ?? op;
      if ((op === 'JMP' || op === 'CALL') && /\bFAR\b|\d\s*:\s*\d/i.test(m[2]) && op === 'JMP') throw Error('Los saltos lejanos están fuera del subconjunto de SILICIO');
      if (/^F[A-Z0-9]+$/.test(op))
        throw Error('Instrucción no admitida: ' + op + ' (el coprocesador está fuera del subconjunto de SILICIO)');
      if (OUT_OF_SUBSET.has(op))
        throw Error('Instrucción no admitida: ' + op + ' (fuera del subconjunto de SILICIO)');
      const args = m[2] ? splitTopLevel(m[2]) : [];
      const isJump = SHORT_JUMPS.has(op) || NEAR_JUMPS.has(op);
      let size: number;
      if (isJump) {
        if (args.length !== 1 || !/^[A-Za-z_]\w*$/.test(args[0]))
          throw Error(
            op === 'CALL'
              ? 'CALL admite solo una etiqueta cercana, no CALL lejano ni indirecto'
              : 'El salto requiere una etiqueta',
          );
        size = NEAR_JUMPS.has(op) ? 3 : 2;
      } else {
        const operands = settle(op, args.map((a) => parseOperand(a, ctx)));
        size = encode(op, operands).length;
      }
      items.push({ kind: 'instr', line, text, op, args, address: codeAt, size });
      codeAt += size;
      if (codeAt > 0x10000 || codeAt - origin > MAX_CODE_BYTES) throw Error('Programa demasiado grande');
    } catch (e) {
      if ((e as Error).message.startsWith('Línea ')) throw e;
      fail(line, (e as Error).message);
    }
  }
  return { items, symbols, data, exe, origin };
}

/** Names and kinds of every symbol, before any address is known, so a forward reference is read right. */
function prescan(lines: SourceLine[]): Map<string, Symbol> {
  const known = new Map<string, Symbol>();
  for (const { text } of lines) {
    const label = text.match(/^([A-Za-z_@?$][\w@?$]*)\s*:(?!:)\s*(.*)$/);
    if (label) known.set(label[1].toUpperCase(), { name: label[1], value: 0, kind: 'code' });
    const rest = label ? label[2] : text;
    const named = rest.match(/^([A-Za-z_@?$][\w@?$]*)\s+(PROC|EQU|DB|DW)\b/i);
    if (!named) continue;
    const d = named[2].toUpperCase();
    known.set(named[1].toUpperCase(), {
      name: named[1],
      value: 0,
      kind: d === 'PROC' ? 'code' : d === 'EQU' ? 'const' : 'data',
      ...(d === 'DB' ? { type: 'byte' as const } : d === 'DW' ? { type: 'word' as const } : {}),
    });
  }
  return known;
}

const sameSymbols = (a: Map<string, Symbol>, b: Map<string, Symbol>) =>
  a.size === b.size && [...a].every(([k, v]) => b.get(k)?.value === v.value && b.get(k)?.kind === v.kind);

/** Two-pass assembler: sizes and addresses first (repeated until forward references settle), then bytes. */
export function assemble(source: string): AssembledProgram {
  const raw: SourceLine[] = source
    .split(/\r?\n/)
    .map((t, i) => ({ text: stripComment(t), line: i + 1 }))
    .filter((l) => l.text);
  const { lines, expansions } = expandMacros(raw);

  let state = layout(lines, prescan(lines));
  for (let round = 0; round < 6; round++) {
    const next = layout(lines, state.symbols);
    const stable = sameSymbols(next.symbols, state.symbols);
    state = next;
    if (stable) break;
  }
  const strict: SymbolContext = { strict: true, lookup: (n) => state.symbols.get(n) };
  const instructions: Instruction[] = [];
  const blocks: DataBlock[] = [];
  const addresses = new Set(
    state.items.filter((i) => i.kind === 'instr').map((i) => i.address),
  );

  for (const item of state.items) {
    try {
      if (item.kind === 'data') {
        const bytes = dataBytes(item.items, item.unit, strict);
        blocks.push({ segment: item.segment, address: item.address, bytes });
        continue;
      }
      const { op, args, address, line, text } = item;
      let operands: Operand[] = [];
      let bytes: number[];
      let target: number | undefined;
      if (SHORT_JUMPS.has(op) || NEAR_JUMPS.has(op)) {
        const name = args[0].toUpperCase();
        const symbol = state.symbols.get(name);
        if (!symbol || symbol.kind !== 'code' || !addresses.has(symbol.value))
          throw Error('Destino inválido: ' + args[0]);
        target = symbol.value;
        const relative = target - (address + item.size);
        const wide = NEAR_JUMPS.has(op);
        const bound = wide ? 32768 : 128;
        if (relative < -bound || relative >= bound) throw Error('Salto fuera de rango: ' + args[0]);
        bytes = wide
          ? [op === 'JMP' ? 0xe9 : 0xe8, ...bytePair(relative)]
          : [op === 'LOOP' ? 0xe2 : JCC_OPCODES[op], relative & 255];
      } else {
        operands = settle(op, args.map((a) => parseOperand(a, strict)));
        bytes = encode(op, operands);
        if (bytes.length !== item.size) throw Error('El tamaño de la instrucción cambió al resolver símbolos');
      }
      instructions.push({
        address,
        line,
        text,
        op,
        operands,
        bytes,
        ...(target !== undefined ? { target } : {}),
      });
    } catch (e) {
      if ((e as Error).message.startsWith('Línea ')) throw e;
      fail(item.line, (e as Error).message);
    }
  }
  if (!instructions.length) throw Error('Escribe al menos una instrucción');
  const inlineData = blocks.some((b) => b.segment === 'code');
  return {
    instructions,
    data: state.data,
    macroExpansions: expansions,
    blocks,
    entry: instructions[0].address,
    // As in a real .COM file, variables that sit inside the code are reached with DS = CS.
    dataSegment: !state.exe && inlineData ? 0x1000 : undefined,
  };
}
