export interface SourceLine {
  text: string;
  line: number;
}

interface Macro {
  name: string;
  params: string[];
  body: string[];
}

const MAX_DEPTH = 8;
const MAX_LINES = 4096;

/** Splits on commas that are outside quotes and parentheses. */
export function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let current = '';
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = '';
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim() || parts.length) parts.push(current.trim());
  return parts;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Expands `name MACRO p1, p2 … ENDM` definitions where the macro is used. Parameters are replaced as
 * whole words and `LOCAL` names get a fresh suffix per expansion, so two uses never repeat a label.
 */
export function expandMacros(lines: SourceLine[]): {
  lines: SourceLine[];
  expansions: { line: number; expanded: string[] }[];
} {
  const macros = new Map<string, Macro>();
  const rest: SourceLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].text.match(/^([A-Za-z_@?$][\w@?$]*)\s+MACRO\b(.*)$/i);
    if (!m) {
      rest.push(lines[i]);
      continue;
    }
    const body: string[] = [];
    let closed = false;
    for (i++; i < lines.length; i++) {
      if (/^ENDM\b/i.test(lines[i].text)) {
        closed = true;
        break;
      }
      if (/\bMACRO\b/i.test(lines[i].text))
        throw Error('Línea ' + lines[i].line + ': no se admiten macros dentro de otra macro');
      body.push(lines[i].text);
    }
    if (!closed) throw Error('Línea ' + lines[i - 1 < 0 ? 0 : Math.min(i - 1, lines.length - 1)].line + ': la macro ' + m[1] + ' no termina con ENDM');
    const params = m[2].trim() ? splitTopLevel(m[2]).map((p) => p.trim()) : [];
    macros.set(m[1].toUpperCase(), { name: m[1], params, body });
  }
  const expansions: { line: number; expanded: string[] }[] = [];
  const out: SourceLine[] = [];
  let unique = 0;

  const expand = (text: string, line: number, depth: number, sink: string[]): void => {
    const label = text.match(/^([A-Za-z_@?$][\w@?$]*\s*:)\s*(.*)$/);
    const prefix = label ? label[1] + ' ' : '';
    const statement = label ? label[2] : text;
    const call = statement.match(/^([A-Za-z_@?$][\w@?$]*)\b\s*(.*)$/);
    const macro = call ? macros.get(call[1].toUpperCase()) : undefined;
    if (!macro) {
      sink.push(text);
      return;
    }
    if (depth >= MAX_DEPTH) throw Error('Línea ' + line + ': la macro ' + macro.name + ' se llama a sí misma');
    const args = call![2].trim() ? splitTopLevel(call![2]) : [];
    if (args.length > macro.params.length)
      throw Error('Línea ' + line + ': la macro ' + macro.name + ' espera ' + macro.params.length + ' parámetros');
    const suffix = '_' + ++unique;
    const locals: string[] = [];
    let body = macro.body.filter((b) => {
      const l = b.match(/^LOCAL\s+(.*)$/i);
      if (l) locals.push(...splitTopLevel(l[1]));
      return !l;
    });
    body = body.map((b) => {
      for (const name of locals) b = b.replace(new RegExp('\\b' + escapeRe(name) + '\\b', 'gi'), name + suffix);
      macro.params.forEach((p, n) => {
        b = b.replace(new RegExp('\\b' + escapeRe(p) + '\\b', 'gi'), () => args[n] ?? '');
      });
      return b;
    });
    if (prefix) sink.push(prefix.trim());
    for (const b of body) expand(b, line, depth + 1, sink);
  };

  for (const l of rest) {
    const expanded: string[] = [];
    expand(l.text, l.line, 0, expanded);
    if (expanded.length === 1 && expanded[0] === l.text) {
      out.push(l);
      continue;
    }
    expansions.push({ line: l.line, expanded });
    for (const text of expanded) out.push({ text, line: l.line });
    if (out.length > MAX_LINES) throw Error('Línea ' + l.line + ': la expansión de macros es demasiado grande');
  }
  return { lines: out, expansions };
}
