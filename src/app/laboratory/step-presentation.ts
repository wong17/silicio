import { hex, physicalAddress, type Instruction, type Operand, type Snapshot, type Trace } from '../simulation/cpu8086';
import { readRegister } from '../simulation/x86/executor';
import { PPI_PORT_A, PPI_PORT_C, PPI_CONTROL, digitOf, portName } from '../simulation/x86/ppi8255';
import type { LearningEvent } from './learning-event';

/** The seven steps of the instruction cycle as the course teaches them (§4.3). */
export type CoursePhase =
  | 'fetch-load'
  | 'fetch-increment'
  | 'fetch-decode'
  | 'exec-operands'
  | 'exec-run'
  | 'exec-store'
  | 'exec-interrupts';

export interface PhaseInfo {
  id: CoursePhase;
  /** 1 to 7, as numbered in the course. */
  number: number;
  group: 'Búsqueda' | 'Ejecución';
  title: string;
  /** Pieces of the bench this step lights. */
  pieces: readonly string[];
}

export const COURSE_PHASES: readonly PhaseInfo[] = [
  { id: 'fetch-load', number: 1, group: 'Búsqueda', title: 'Cargar la siguiente instrucción', pieces: ['biu', 'queue'] },
  { id: 'fetch-increment', number: 2, group: 'Búsqueda', title: 'Incrementar el secuenciador', pieces: ['registers'] },
  { id: 'fetch-decode', number: 3, group: 'Búsqueda', title: 'Interpretar', pieces: ['control', 'queue'] },
  { id: 'exec-operands', number: 4, group: 'Ejecución', title: 'Cargar operandos', pieces: ['registers', 'biu'] },
  { id: 'exec-run', number: 5, group: 'Ejecución', title: 'Ejecutar', pieces: ['alu'] },
  { id: 'exec-store', number: 6, group: 'Ejecución', title: 'Guardar resultado', pieces: ['registers', 'biu'] },
  { id: 'exec-interrupts', number: 7, group: 'Ejecución', title: 'Verificar interrupciones', pieces: ['control'] },
];

export interface Change {
  label: string;
  before: string;
  after: string;
}

export interface PhaseStep extends PhaseInfo {
  /** What happens in this step of this instruction, with its real values. */
  text: string;
}

export interface StepPresentation {
  event: LearningEvent;
  phases: readonly PhaseStep[];
  /** One sentence for the whole instruction, built from the values of the step. */
  explanation: string;
  changes: readonly Change[];
  /** The state to show while explaining phase `index` (0–6): the confirmed state arrives at step 6. */
  projection(index: number): Snapshot;
}

const h = (v: number, d = 4) => hex(v, d) + 'h';
const where = (o: Operand) => (o.kind === 'memory' ? 'memoria' : o.kind === 'immediate' ? 'el valor inmediato' : o.kind === 'segment' ? 'un registro de segmento' : o.name);
const FLAGS = ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'] as const;
const REGISTERS = ['AX', 'BX', 'CX', 'DX', 'SP', 'BP', 'SI', 'DI', 'CS', 'DS', 'SS', 'ES', 'IP'] as const;
const VERBS: Record<string, string> = {
  ADD: 'suma',
  ADC: 'suma con acarreo',
  SUB: 'resta',
  SBB: 'resta con acarreo',
  AND: 'combina con AND',
  OR: 'combina con OR',
  XOR: 'combina con XOR',
};
const JUMPS = new Set(['JMP', 'JZ', 'JNZ', 'JB', 'JAE', 'JBE', 'JA', 'JL', 'JGE', 'JLE', 'JG', 'JS', 'JNS', 'JO', 'JNO', 'LOOP']);
const CONDITIONS: Record<string, string> = {
  JZ: 'ZF=1',
  JNZ: 'ZF=0',
  JB: 'CF=1',
  JAE: 'CF=0',
  JBE: 'CF=1 o ZF=1',
  JA: 'CF=0 y ZF=0',
  JL: 'SF≠OF',
  JGE: 'SF=OF',
  JLE: 'ZF=1 o SF≠OF',
  JG: 'ZF=0 y SF=OF',
  JS: 'SF=1',
  JNS: 'SF=0',
  JO: 'OF=1',
  JNO: 'OF=0',
};

function operandValue(o: Operand, before: Snapshot, reads: Trace['operation']): string {
  if (o.kind === 'register') return o.name + '=' + h(readRegister(before.registers, o.name, o.size), o.size === 8 ? 2 : 4);
  if (o.kind === 'segment') return o.name + '=' + h(before.registers[o.name]);
  if (o.kind === 'immediate') return h(o.value, o.size === 8 ? 2 : 4);
  const read = reads?.accesses.find((a) => a.kind === 'read');
  return read ? h(read.value, o.size === 8 ? 2 : 4) + ' de ' + h(read.address, 5) : 'una posición de memoria';
}

function screenAdded(before: Snapshot, after: Snapshot): string {
  return after.io.screen.startsWith(before.io.screen) ? after.io.screen.slice(before.io.screen.length) : after.io.screen;
}

function changesOf(trace: Trace): Change[] {
  const { before, after } = trace;
  const out: Change[] = [];
  for (const r of REGISTERS)
    if (before.registers[r] !== after.registers[r]) out.push({ label: r, before: h(before.registers[r]), after: h(after.registers[r]) });
  for (const f of FLAGS)
    if (before.flags[f] !== after.flags[f]) out.push({ label: f, before: before.flags[f] ? '1' : '0', after: after.flags[f] ? '1' : '0' });
  for (const w of trace.writes) {
    const was = before.memory[w] ?? 0;
    const now = after.memory[w] ?? 0;
    if (was !== now || trace.writes.length) out.push({ label: 'Memoria ' + h(w, 5), before: h(was, 2), after: h(now, 2) });
  }
  if (before.io.screen !== after.io.screen)
    out.push({ label: 'Pantalla', before: '«' + before.io.screen.slice(-12) + '»', after: '«' + after.io.screen.slice(-12) + '»' });
  for (const port of [PPI_PORT_A, PPI_PORT_C, PPI_CONTROL]) {
    const was = before.io.ports?.[port];
    const now = after.io.ports?.[port];
    if (was !== now)
      out.push({ label: 'Puerto ' + hex(port, 2) + 'h', before: was === undefined ? '—' : h(was, 2), after: now === undefined ? '—' : h(now, 2) });
  }
  if (before.io.keyboard.length !== after.io.keyboard.length)
    out.push({ label: 'Teclado', before: before.io.keyboard.length + ' tecla(s)', after: after.io.keyboard.length + ' tecla(s)' });
  return out;
}

/** One sentence about the whole instruction, from the values it really used. */
function explain(trace: Trace): string {
  const i = trace.instruction;
  const { before, after, operation } = trace;
  const [d, s] = i.operands;
  const a = operation?.operands[0];
  const b = operation?.operands[1];
  const res = operation?.result;
  // The sentence speaks in decimal, as the course does; the phase details keep the hexadecimal.
  const val = (n: number | undefined, _o?: Operand) => (n === undefined ? '?' : String(n));
  const memoryUntouched = trace.writes.length ? '' : ' La memoria no cambia.';
  switch (i.op) {
    case 'HLT':
      return 'HLT detiene el procesador: no se ejecutan más instrucciones.';
    case 'NOP':
      return 'NOP no hace nada: solo avanza IP.';
    case 'MOV':
      return i.text + ' copia ' + operandValue(s, before, operation) + ' en ' + where(d) + (d.kind === 'memory' ? ' (' + h(trace.writes[0] ?? 0, 5) + ')' : '') + '.' + (d.kind === 'memory' ? '' : memoryUntouched);
    case 'ADD': case 'ADC': case 'SUB': case 'SBB': case 'AND': case 'OR': case 'XOR': {
      const source = s.kind === 'immediate' ? 'el valor ' + val(b, d) : s.kind === 'register' ? s.name + '=' + val(b, d) : val(b, d) + ' de memoria';
      const target = d.kind === 'memory' ? 'la memoria' : where(d) + '=' + val(a, d);
      const tail = d.kind === 'memory' ? ' y guarda ' + val(res, d) + ' en memoria.' : ' y deja ' + where(d) + '=' + val(res, d) + '.' + memoryUntouched;
      return i.text + ' toma ' + source + ', lo ' + (VERBS[i.op] ?? 'combina') + (i.op === 'SUB' || i.op === 'SBB' ? ' de ' : ' a ') + target + tail;
    }
    case 'CMP':
      return i.text + ' resta ' + val(b, d) + ' de ' + val(a, d) + ' sin guardar el resultado: solo cambian los flags (ZF=' + (after.flags.ZF ? 1 : 0) + ', CF=' + (after.flags.CF ? 1 : 0) + ').';
    case 'TEST':
      return i.text + ' hace AND de ' + val(a, d) + ' y ' + val(b, d) + ' sin guardarlo: solo cambian los flags.';
    case 'INC': case 'DEC':
      return i.text + (i.op === 'INC' ? ' suma' : ' resta') + ' 1 a ' + where(d) + ' (' + val(a, d) + ' → ' + val(res, d) + ') y conserva CF.';
    case 'NEG': case 'NOT':
      return i.text + (i.op === 'NEG' ? ' cambia el signo de ' : ' invierte los bits de ') + val(a, d) + ' y deja ' + val(res, d) + '.';
    case 'MUL': case 'IMUL': {
      const wide = d.kind === 'register' ? d.size === 16 : d.kind === 'memory' && d.size === 16;
      return i.text + ' multiplica ' + (wide ? 'AX' : 'AL') + '=' + val(a, wide ? { kind: 'register', name: 'AX', size: 16 } : d) + ' por ' + val(b, d) + ' y deja ' + (wide ? 'DX:AX=' + after.registers.DX + ':' + after.registers.AX : 'AX=' + after.registers.AX) + '.';
    }
    case 'DIV': case 'IDIV': {
      const wide = d.kind === 'register' ? d.size === 16 : d.kind === 'memory' && d.size === 16;
      return i.text + ' divide ' + (wide ? 'DX:AX' : 'AX') + '=' + String(a ?? 0) + ' entre ' + val(b, d) + ': cociente ' + (wide ? 'AX=' + after.registers.AX : 'AL=' + (after.registers.AX & 255)) + ', resto ' + (wide ? 'DX=' + after.registers.DX : 'AH=' + (after.registers.AX >> 8)) + '.';
    }
    case 'SHL': case 'SHR': case 'SAR': case 'ROL': case 'ROR':
      return i.text + ' desplaza los bits de ' + where(d) + ' (' + val(a, d) + ') ' + (b === 1 ? 'una posición' : b + ' posiciones') + ' y deja ' + val(res, d) + '.';
    case 'LEA':
      return i.text + ' calcula la dirección efectiva ' + h(a ?? 0) + ' y la guarda en ' + where(d) + ' sin leer la memoria.';
    case 'XCHG':
      return i.text + ' intercambia ' + val(a, d) + ' y ' + val(b, d) + '.';
    case 'CBW': return 'CBW extiende el signo de AL a AX: AX=' + after.registers.AX + '.';
    case 'CWD': return 'CWD extiende el signo de AX a DX: DX=' + after.registers.DX + '.';
    case 'PUSH':
      return i.text + ' resta 2 a SP (' + h(before.registers.SP) + ' → ' + h(after.registers.SP) + ') y guarda ' + val(a, d) + ' en la pila.';
    case 'POP':
      return i.text + ' lee ' + val(a, d) + ' de la pila, lo guarda en ' + where(d) + ' y suma 2 a SP.';
    case 'CALL':
      return i.text + ' apila la dirección de retorno ' + h(a ?? 0) + ' y salta a ' + h(i.target ?? after.registers.IP) + '.';
    case 'RET':
      return 'RET recupera ' + h(after.registers.IP) + ' de la pila y vuelve a esa dirección; SP queda en ' + h(after.registers.SP) + '.';
    case 'IN': {
      const port = operation?.operands[0] ?? 0;
      return i.text + ' lee el puerto ' + h(port, 2) + ' ' + portName(port) + ' y deja AL=' + (operation?.result ?? 0) + '.';
    }
    case 'OUT': {
      const port = operation?.operands[0] ?? 0;
      const value = operation?.operands[1] ?? 0;
      const shown = port === PPI_PORT_C && digitOf(value) !== undefined ? ' (el display muestra ' + digitOf(value) + ')' : '';
      return i.text + ' escribe ' + h(value, 2) + ' en el puerto ' + h(port, 2) + ' ' + portName(port) + '.' + shown;
    }
    case 'INT': {
      const ah = (before.registers.AX >>> 8) & 255;
      if (i.operands[0].kind === 'immediate' && i.operands[0].value === 0x20) return 'INT 20h termina el programa.';
      if (ah === 0x4c) return 'INT 21h servicio 4Ch termina el programa.';
      const added = screenAdded(before, after);
      if (ah === 0x09) return 'INT 21h servicio 09h escribe «' + added + '» en la Pantalla (cadena hasta el $ en DS:DX).';
      if (ah === 0x02) return 'INT 21h servicio 02h escribe «' + added + '» en la Pantalla.';
      if (ah === 0x01) return 'INT 21h servicio 01h lee la tecla «' + String.fromCharCode(after.registers.AX & 255) + '» en AL y la muestra.';
      if (ah === 0x0a) return 'INT 21h servicio 0Ah lee una línea del teclado en el búfer de DS:DX.';
      return i.text + ' ejecuta un servicio del sistema simulado.';
    }
    default:
      if (JUMPS.has(i.op)) {
        const taken = after.registers.IP !== (i.address + i.bytes.length) % 0x10000 || (i.op === 'JMP');
        if (i.op === 'JMP') return i.text + ' salta siempre a ' + h(i.target ?? 0) + '.';
        if (i.op === 'LOOP') return 'LOOP resta 1 a CX (' + before.registers.CX + ' → ' + after.registers.CX + ') y ' + (taken ? 'salta a ' + h(i.target ?? 0) + ' porque CX≠0.' : 'sigue porque CX llegó a 0.');
        return i.text + (taken ? ' salta a ' + h(i.target ?? 0) : ' no salta') + ' porque ' + (CONDITIONS[i.op] ?? 'la condición') + (taken ? ' se cumple.' : ' no se cumple.');
      }
      return i.text + '.';
  }
}

function operandsText(trace: Trace): string {
  const { instruction: i, before, operation } = trace;
  if (!i.operands.length) return 'Esta instrucción no necesita operandos.';
  if (i.op === 'POP' || i.op === 'RET') return 'Lee ' + h(operation?.operands[0] ?? 0) + ' de la pila, en ' + h(physicalAddress(before.registers.SS, before.registers.SP), 5) + '.';
  const parts = i.operands
    .filter((o) => !(i.op === 'MOV' && o === i.operands[0]) && !(i.op === 'LEA' && o === i.operands[1]))
    .map((o) => operandValue(o, before, operation));
  if (!parts.length) return 'El destino no se lee: MOV solo escribe.';
  const mem = trace.reads.length ? ' Lectura de datos, distinta de la búsqueda de código.' : '';
  return 'Toma ' + parts.join(' y ') + '.' + mem;
}

function runText(trace: Trace): string {
  const i = trace.instruction;
  const { operation } = trace;
  if (JUMPS.has(i.op) || i.op === 'CALL' || i.op === 'RET') return explain(trace);
  if (['ADD', 'ADC', 'SUB', 'SBB', 'AND', 'OR', 'XOR', 'CMP', 'TEST', 'INC', 'DEC', 'NEG'].includes(i.op) && operation)
    return 'La ALU opera ' + operation.operands.map((n) => h(n)).join(' y ') + (operation.result !== undefined ? ' → ' + h(operation.result) : '') + ' y fija los flags.';
  if (i.op === 'MOV') return 'No hay operación aritmética: el valor pasa sin cambios.';
  if (i.op === 'INT') return explain(trace);
  if (i.op === 'HLT') return 'El procesador queda detenido.';
  return explain(trace);
}

function storeText(trace: Trace, changes: Change[]): string {
  if (trace.instruction.op === 'CMP' || trace.instruction.op === 'TEST') return 'No guarda ningún resultado: solo quedan los flags.';
  if (!changes.length) return 'No cambia ningún registro ni la memoria.';
  const regs = changes.filter((c) => !c.label.startsWith('Memoria') && c.label !== 'IP' && !FLAGS.includes(c.label as 'CF'));
  const mem = changes.filter((c) => c.label.startsWith('Memoria'));
  const flags = changes.filter((c) => FLAGS.includes(c.label as 'CF'));
  const parts = [
    ...regs.map((c) => c.label + ' ' + c.before + ' → ' + c.after),
    ...mem.map((c) => c.label + ': ' + c.before + ' → ' + c.after),
    ...(flags.length ? ['flags ' + flags.map((c) => c.label + '=' + c.after).join(' ')] : []),
  ];
  return parts.length ? 'Guarda: ' + parts.join('; ') + '.' : 'Solo cambia IP.';
}

function eventKind(trace: Trace): LearningEvent['kind'] {
  const i = trace.instruction;
  if (i.op === 'IN') return 'input';
  if (i.op === 'OUT') return 'output';
  if (i.op === 'INT') {
    if (trace.before.io.keyboard.length > trace.after.io.keyboard.length) return 'input';
    if (trace.before.io.screen !== trace.after.io.screen) return 'output';
    return 'interrupt';
  }
  return 'instruction';
}

function eventRole(trace: Trace): LearningEvent['role'] {
  const i = trace.instruction;
  if (JUMPS.has(i.op) || ['CALL', 'RET', 'HLT', 'INT', 'NOP'].includes(i.op)) return 'control';
  if (i.op === 'IN' || i.op === 'OUT') return 'transfer';
  if (trace.writes.length) return 'storage';
  if (['MOV', 'PUSH', 'POP', 'XCHG', 'LEA'].includes(i.op)) return 'transfer';
  return 'processing';
}

/**
 * Turns one executed instruction into its presentation: the seven steps of the cycle, the change list and a
 * sentence. It reads the trace only; showing a phase never executes anything again.
 */
export function presentStep(trace: Trace, ids: { sessionId: string; revision: number }): StepPresentation {
  const i: Instruction = trace.instruction;
  const changes = changesOf(trace);
  const length = i.bytes.length;
  const fetchAt = physicalAddress(trace.before.registers.CS, trace.before.registers.IP);
  const opcode = i.bytes.map((b) => h(b, 2)).join(' ');
  const memoryRead = trace.operation?.accesses.find((a) => a.kind === 'read');
  const texts: Record<CoursePhase, string> = {
    'fetch-load': 'La BIU forma CS:IP = ' + hex(trace.before.registers.CS) + ':' + hex(trace.before.registers.IP) + ', la dirección física ' + h(fetchAt, 5) + ', y trae ' + length + ' byte(s) a la cola: ' + opcode + '.',
    'fetch-increment': 'IP avanza ' + length + ' byte(s): pasa de ' + h(trace.before.registers.IP) + ' a ' + h((trace.before.registers.IP + length) & 0xffff) + '.',
    'fetch-decode': 'El control decodifica ' + i.op + ' a partir del opcode ' + h(i.bytes[0], 2) + (length > 1 ? ' y de sus ' + (length - 1) + ' byte(s) siguientes' : '') + ': ' + i.text + '.',
    'exec-operands': operandsText(trace),
    'exec-run': runText(trace),
    'exec-store': storeText(trace, changes),
    'exec-interrupts': i.op === 'INT'
      ? 'Un PC real apila FLAGS, CS e IP y salta por el vector de 0000:0084h; aquí el servicio está simulado.'
      : 'Se comprueban IF y las solicitudes pendientes: en este subconjunto no hay ninguna.',
  };
  const target = memoryRead ? 'memory' : trace.writes.length ? 'memory' : undefined;
  const event: LearningEvent = {
    id: ids.sessionId + ':' + ids.revision,
    sessionId: ids.sessionId,
    revision: ids.revision,
    experience: '8086',
    controllerId: '8086',
    kind: eventKind(trace),
    role: eventRole(trace),
    source: memoryRead ? 'memory' : 'biu',
    target: trace.writes.length ? 'memory' : (target ?? 'registers'),
    address: memoryRead?.address ?? trace.writes[0] ?? fetchAt,
    bytes: [...i.bytes],
    explanationKey: 'cpu8086.' + i.op,
    changes,
  };
  const projection = (index: number): Snapshot => {
    if (index >= 5) return trace.after;
    const shown: Snapshot = structuredClone(trace.before);
    // The sequencer moves on in step 2; a jump only lands once the result is stored.
    if (index >= 1) shown.registers.IP = (trace.before.registers.IP + length) & 0xffff;
    return shown;
  };
  return {
    event,
    phases: COURSE_PHASES.map((p) => ({ ...p, text: texts[p.id] })),
    explanation: explain(trace),
    changes,
    projection,
  };
}
