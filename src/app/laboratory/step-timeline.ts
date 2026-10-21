import { hex, type Snapshot } from '../simulation/cpu8086';
import type { PcEvent, PcState } from '../simulation/pc/pc-model';
import { packetsOf, type PcPacket } from './pc-activity';
import { COURSE_PHASES, type Change, type StepPresentation } from './step-presentation';

/**
 * One step of a simulation as a list of cards the student reads top to bottom. A card carries everything that
 * step needs (text, route, bus lines, what changed and the whole state right after it), so nothing has to be
 * looked up in another panel. Pure: it only reads what the engines already produced.
 */
export interface StepCell {
  name: string;
  value: string;
  /** Different from the state before the step began. */
  changed: boolean;
  /** AH|AL, BH|BL… for the general registers of the 8086. */
  parts?: { high: string; low: string };
}

export interface StepState {
  registers: StepCell[];
  flags: StepCell[];
  /** What the screen or monitor shows at this point; empty when nothing is shown. */
  screen: string;
  /** Keys waiting in the keyboard controller. */
  keyboard: number;
}

export interface StepCard {
  id: string;
  index: number;
  /** Number of the step in the course (1–7); 0 for switching on. */
  number: number;
  group: 'Arranque' | 'Búsqueda' | 'Ejecución';
  title: string;
  text: string;
  role?: PcEvent['role'];
  route?: { source: string; target: string; label: string };
  packets: readonly PcPacket[];
  changes: readonly Change[];
  state: StepState;
  /** Piece ids of the scene and the instruments this card is about. */
  pieces: readonly string[];
}

export interface StepTimeline {
  kind: '8086' | 'machine';
  title: string;
  summary: string;
  cards: readonly StepCard[];
}

const h = (v: number, d = 4) => hex(v, d) + 'h';
const GENERAL = ['AX', 'BX', 'CX', 'DX'] as const;
const POINTERS = ['SI', 'DI', 'SP', 'BP', 'IP'] as const;
const FLAGS = ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'] as const;

function stateOf8086(shown: Snapshot, before: Snapshot): StepState {
  const register = (name: (typeof GENERAL)[number] | (typeof POINTERS)[number]): StepCell => {
    const value = shown.registers[name];
    const cell: StepCell = { name, value: h(value), changed: value !== before.registers[name] };
    if ((GENERAL as readonly string[]).includes(name)) cell.parts = { high: hex(value >> 8, 2), low: hex(value & 255, 2) };
    return cell;
  };
  return {
    registers: [...GENERAL, ...POINTERS].map(register),
    flags: FLAGS.map((f) => ({ name: f, value: shown.flags[f] ? '1' : '0', changed: shown.flags[f] !== before.flags[f] })),
    screen: shown.io.screen,
    keyboard: shown.io.keyboard.length,
  };
}

/** Differences between two instants of the same instruction, in the labels the rest of the lab uses. */
function diff(from: Snapshot, to: Snapshot): Change[] {
  if (from === to) return [];
  const out: Change[] = [];
  for (const name of [...GENERAL, ...POINTERS, 'CS', 'DS', 'SS', 'ES'] as const)
    if (from.registers[name] !== to.registers[name]) out.push({ label: name, before: h(from.registers[name]), after: h(to.registers[name]) });
  for (const f of FLAGS) if (from.flags[f] !== to.flags[f]) out.push({ label: f, before: from.flags[f] ? '1' : '0', after: to.flags[f] ? '1' : '0' });
  const addresses = new Set([...Object.keys(from.memory), ...Object.keys(to.memory)].map(Number));
  for (const a of [...addresses].sort((x, y) => x - y)) {
    const was = from.memory[a] ?? 0;
    const now = to.memory[a] ?? 0;
    if (was !== now) out.push({ label: 'Memoria ' + h(a, 5), before: h(was, 2), after: h(now, 2) });
  }
  if (from.io.screen !== to.io.screen)
    out.push({ label: 'Pantalla', before: '«' + from.io.screen.slice(-12) + '»', after: '«' + to.io.screen.slice(-12) + '»' });
  if (from.io.keyboard.length !== to.io.keyboard.length)
    out.push({ label: 'Teclado', before: from.io.keyboard.length + ' tecla(s)', after: to.io.keyboard.length + ' tecla(s)' });
  return out;
}

/** The seven steps of the instruction on screen, each with the state it leaves behind. */
export function timeline8086(presentation: StepPresentation, title: string): StepTimeline {
  const before = presentation.projection(0);
  const cards = presentation.phases.map<StepCard>((phase, index) => ({
    id: phase.id,
    index,
    number: phase.number,
    group: phase.group,
    title: phase.title,
    text: phase.text,
    packets: [],
    changes: index === 0 ? [] : diff(presentation.projection(index - 1), presentation.projection(index)),
    state: stateOf8086(presentation.projection(index), before),
    pieces: COURSE_PHASES[index].pieces,
  }));
  return { kind: '8086', title, summary: presentation.explanation, cards };
}

const NAMES: Record<string, string> = {
  power: 'Encendido',
  cpu: 'Procesador',
  'cpu-pc': 'PC',
  'cpu-ir': 'IR',
  'cpu-mar': 'MAR',
  'cpu-mdr': 'MDR',
  'cpu-regs': 'Registros',
  alu: 'ALU',
  'control-unit': 'Unidad de control',
  rom: 'ROM',
  ram: 'RAM',
  ssd: 'SSD',
  'memory-controller': 'Controlador de memoria',
  'keyboard-controller': 'Teclado',
  'interrupt-controller': 'Interrupciones',
  'storage-controller': 'Almacenamiento',
  'display-engine': 'Motor de pantalla',
  keyboard: 'Teclado',
  monitor: 'Monitor',
};
const nameOf = (piece: string) => NAMES[piece] ?? piece;

interface View {
  pc: number;
  ir: number;
  mar: number;
  mdr: number;
  regs: number[];
  flags: PcState['flags'];
  screen: string;
  keyboard: number;
}

const fromState = (s: PcState): View => ({
  pc: s.pc,
  ir: s.ir,
  mar: s.mar,
  mdr: s.mdr,
  regs: [...s.regs],
  flags: s.flags,
  screen: s.monitor.mode === 'image' ? 'Imagen de 8×8' : s.monitor.text,
  keyboard: s.keyboard.length,
});

/** What one event does to the registers and outputs, using the values it carries (nothing is parsed from text). */
function apply(view: View, event: PcEvent, after: PcState): View {
  const next = { ...view };
  if (event.phase === 0) return fromState(after);
  if (event.target === 'cpu-pc' && (event.phase === 2 || event.changes.length) && event.value !== undefined) next.pc = event.value;
  if (event.target === 'cpu-mar') next.mar = event.address ?? event.value ?? next.mar;
  if (event.target === 'cpu-mdr' && event.value !== undefined) next.mdr = event.value;
  if (event.target === 'cpu-ir' && event.value !== undefined) next.ir = event.value;
  for (const c of event.changes) {
    const reg = /^R(\d)$/.exec(c.label);
    if (reg) next.regs = next.regs.map((v, i) => (i === Number(reg[1]) ? after.regs[i] : v));
    if (c.label === 'flags') next.flags = after.flags;
    if (c.label === 'Cola del teclado') next.keyboard = after.keyboard.length;
  }
  if (event.target === 'monitor') next.screen = fromState(after).screen;
  return next;
}

function stateOfPc(view: View, start: View): StepState {
  const hex4 = (n: number) => h(n >>> 0, 4);
  const cell = (name: string, value: string, was: string): StepCell => ({ name, value, changed: value !== was });
  const flag = (name: string, on: boolean, was: boolean): StepCell => ({ name, value: on ? '1' : '0', changed: on !== was });
  return {
    registers: [
      cell('PC', hex4(view.pc), hex4(start.pc)),
      cell('IR', h(view.ir >>> 0, 8), h(start.ir >>> 0, 8)),
      cell('MAR', hex4(view.mar), hex4(start.mar)),
      cell('MDR', h(view.mdr >>> 0, 8), h(start.mdr >>> 0, 8)),
      ...view.regs.map((v, i) => cell('R' + i, String(v | 0), String(start.regs[i] | 0))),
    ],
    flags: (['Z', 'N', 'C', 'V'] as const).map((f) => flag(f, view.flags[f], start.flags[f])),
    screen: view.screen,
    keyboard: view.keyboard,
  };
}

/** One card per event of a PC step; the state after each card is rebuilt from the events in order. */
export function timelinePc(before: PcState, after: PcState, events: readonly PcEvent[], title: string): StepTimeline {
  const start = fromState(before);
  let view = start;
  const cards = events.map<StepCard>((event, index) => {
    // The last card always shows the machine as the engine confirmed it.
    view = index === events.length - 1 ? fromState(after) : apply(view, event, after);
    const phase = COURSE_PHASES[event.phase - 1];
    return {
      id: 'e' + index,
      index,
      number: event.phase,
      group: event.phase === 0 ? 'Arranque' : event.phase <= 3 ? 'Búsqueda' : 'Ejecución',
      title: phase ? phase.title : 'Encender',
      text: event.text,
      role: event.role,
      route: { source: event.source, target: event.target, label: nameOf(event.source) + ' a ' + nameOf(event.target) },
      packets: packetsOf(event),
      changes: event.changes,
      state: stateOfPc(view, start),
      pieces: [event.source, event.target],
    };
  });
  return { kind: 'machine', title, summary: events.at(-1)?.text ?? '', cards };
}
