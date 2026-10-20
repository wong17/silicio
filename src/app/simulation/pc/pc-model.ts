import { FILE_NAMES, CONDITIONS, assemble, decode, format, type Decoded } from './pc-isa';
import { decimalText, fileWords, MAX_FILE_BYTES, utf8Encode, type SsdFiles } from './pc-files';

/** Map of the conceptual machine, in words. ROM and RAM share one address space; the ROM is never written. */
export const ROM_BASE = 0x0000;
export const ROM_SIZE = 0x10;
export const PROGRAM_BASE = 0x1000;
export const PROGRAM_SIZE = 0x100;
export const INPUT_BASE = 0x1100;
export const INPUT_SIZE = 0x400;
export const WORK_BASE = 0x1500;
export const WORK_SIZE = 0x100;
export const FRAMEBUFFER_BASE = 0x1600;
export const FRAMEBUFFER_SIZE = 0x800;
/** The keyboard interrupt jumps to the second word of the program, which holds a jump to its handler. */
export const KEYBOARD_VECTOR = PROGRAM_BASE + 1;
export const MAX_STEPS = 20000;

export type Region = 'rom' | 'program' | 'input' | 'work' | 'framebuffer';
export interface Flags {
  Z: boolean;
  N: boolean;
  C: boolean;
  V: boolean;
}
export interface PcInput {
  /** Number of instructions executed when the key arrived. */
  at: number;
  kind: 'key';
  code: number;
}
export type MonitorMode = 'off' | 'text' | 'image' | 'number' | 'error';
export interface Monitor {
  mode: MonitorMode;
  text: string;
  pixels: readonly number[];
  number?: number;
  message?: string;
}
export interface PcState {
  power: 'off' | 'on';
  pc: number;
  ir: number;
  mar: number;
  mdr: number;
  regs: readonly number[];
  flags: Flags;
  ram: Readonly<Record<Exclude<Region, 'rom'>, readonly number[]>>;
  ssd: SsdFiles;
  /** Keys the keyboard controller holds until the processor reads them. */
  keyboard: readonly number[];
  interrupt: { enabled: boolean; inService: boolean; shadow: boolean; saved?: { pc: number; flags: Flags } };
  monitor: Monitor;
  halted: boolean;
  counters: { instructions: number; polls: number; interrupts: number };
  inputs: readonly PcInput[];
}

export type EventRole = 'processing' | 'storage' | 'transfer' | 'control';
export interface PcEvent {
  /** Step of the cycle (§4.3): 1 load, 2 increment PC, 3 interpret, 4 operands, 5 execute, 6 store, 7 interrupts; 0 for power-on. */
  phase: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  role: EventRole;
  /** Piece ids of the bench; the same names as the 2D instruments. */
  source: string;
  target: string;
  address?: number;
  value?: number;
  /** Lines of the bus that carry this transfer (§6.1): address, data and control. */
  bus: { address?: number; data?: number; control?: 'read' | 'write' | 'interrupt' | 'status' };
  text: string;
  changes: { label: string; before: string; after: string }[];
}

export type StepOutcome =
  | { kind: 'executed' | 'halted'; state: PcState; events: PcEvent[]; text: string }
  | { kind: 'waiting'; state: PcState; reason: 'keyboard'; text: string }
  | { kind: 'fault'; state: PcState; message: string };

const h = (n: number, d = 8) => (n >>> 0).toString(16).toUpperCase().padStart(d, '0') + 'h';
const regionOf = (address: number): Region | undefined => {
  if (address >= ROM_BASE && address < ROM_BASE + ROM_SIZE) return 'rom';
  if (address >= PROGRAM_BASE && address < PROGRAM_BASE + PROGRAM_SIZE) return 'program';
  if (address >= INPUT_BASE && address < INPUT_BASE + INPUT_SIZE) return 'input';
  if (address >= WORK_BASE && address < WORK_BASE + WORK_SIZE) return 'work';
  if (address >= FRAMEBUFFER_BASE && address < FRAMEBUFFER_BASE + FRAMEBUFFER_SIZE) return 'framebuffer';
  return undefined;
};
const BASES: Record<Exclude<Region, 'rom'>, number> = { program: PROGRAM_BASE, input: INPUT_BASE, work: WORK_BASE, framebuffer: FRAMEBUFFER_BASE };
const SIZES: Record<Exclude<Region, 'rom'>, number> = { program: PROGRAM_SIZE, input: INPUT_SIZE, work: WORK_SIZE, framebuffer: FRAMEBUFFER_SIZE };
export const regionName: Record<Region, string> = { rom: 'ROM', program: 'RAM · programa', input: 'RAM · entrada', work: 'RAM · trabajo', framebuffer: 'RAM · pantalla' };

/** The boot loader in the ROM: copy the program from the SSD to RAM and jump to it. */
export const ROM_WORDS: readonly number[] = assemble('READ_FILE R3, program, programa.bin\nBRANCH ALWAYS, ' + PROGRAM_BASE, ROM_BASE);

export const EMPTY_MONITOR: Monitor = { mode: 'off', text: '', pixels: [], };
const zeros = (n: number): readonly number[] => new Array<number>(n).fill(0);
const emptyRam = (): PcState['ram'] => ({
  program: zeros(PROGRAM_SIZE),
  input: zeros(INPUT_SIZE),
  work: zeros(WORK_SIZE),
  framebuffer: zeros(FRAMEBUFFER_SIZE),
});
const noFlags = (): Flags => ({ Z: false, N: false, C: false, V: false });

/** A PC that is switched off with the given files on its SSD. */
export function offState(ssd: SsdFiles = {}): PcState {
  return {
    power: 'off', pc: ROM_BASE, ir: 0, mar: 0, mdr: 0, regs: [0, 0, 0, 0], flags: noFlags(), ram: emptyRam(), ssd,
    keyboard: [], interrupt: { enabled: false, inService: false, shadow: false }, monitor: EMPTY_MONITOR, halted: false,
    counters: { instructions: 0, polls: 0, interrupts: 0 }, inputs: [],
  };
}

/** Switching on: RAM and registers are empty, the PC points at the ROM, the SSD is as it was left. */
export function powerOn(state: PcState): { state: PcState; events: PcEvent[] } {
  const next: PcState = { ...offState(state.ssd), power: 'on' };
  return {
    state: next,
    events: [
      {
        phase: 0, role: 'control', source: 'power', target: 'cpu', address: ROM_BASE, bus: { address: ROM_BASE, control: 'read' },
        text: 'Al encender, el PC apunta al inicio de la ROM (' + h(ROM_BASE, 4) + '): ahí vive el cargador.',
        changes: [{ label: 'PC', before: '—', after: h(ROM_BASE, 4) }],
      },
    ],
  };
}

/** Switching off erases RAM, registers and screen; the files of the SSD stay. */
export const powerOff = (state: PcState): PcState => offState(state.ssd);

export function readWord(state: PcState, address: number): number {
  const region = regionOf(address);
  if (!region) throw Error('La dirección ' + h(address, 4) + ' no existe en este PC: la memoria llega a ' + h(FRAMEBUFFER_BASE + FRAMEBUFFER_SIZE - 1, 4) + '.');
  if (region === 'rom') return ROM_WORDS[address - ROM_BASE] ?? 0;
  return state.ram[region][address - BASES[region]];
}

function writeWord(state: PcState, address: number, value: number): PcState {
  const region = regionOf(address);
  if (!region) throw Error('La dirección ' + h(address, 4) + ' no existe en este PC.');
  if (region === 'rom') throw Error('La ROM no se puede escribir: el cargador no cambia.');
  const words = [...state.ram[region]];
  words[address - BASES[region]] = value | 0;
  return { ...state, ram: { ...state.ram, [region]: words } };
}

function flagsFor(result: number, a: number, b: number, sub: boolean): Flags {
  const r = result | 0;
  const overflow = sub ? ((a ^ b) & (a ^ r)) < 0 : (~(a ^ b) & (a ^ r)) < 0;
  const carry = sub ? (a >>> 0) < (b >>> 0) : (a >>> 0) + (b >>> 0) > 0xffffffff;
  return { Z: r === 0, N: r < 0, C: carry, V: overflow };
}

const holds = (cond: number, f: Flags): boolean => {
  switch (CONDITIONS[cond]) {
    case 'ALWAYS': return true;
    case 'Z': return f.Z;
    case 'NZ': return !f.Z;
    case 'N': return f.N;
    case 'NN': return !f.N;
    case 'V': return f.V;
    case 'NV': return !f.V;
    case 'LT': return f.N !== f.V;
    case 'GE': return f.N === f.V;
    default: return false;
  }
};

const ERRORS: Record<number, string> = { 1: 'Desbordamiento: la suma no cabe en 32 bits con signo' };

function textOf(words: readonly number[], limit: number): string {
  let out = '';
  for (let i = 0; i < Math.min(words.length, limit); i++) {
    if (words[i] === 0) break;
    out += String.fromCodePoint(words[i] > 0 && words[i] <= 0x10ffff ? words[i] : 0xfffd);
  }
  return out;
}

const regChange = (label: string, before: number, after: number) => ({ label, before: String(before | 0), after: String(after | 0) });

/** The fields the student watches while an instruction goes through the cycle. */
function fetchEvents(state: PcState): { events: PcEvent[]; ir: number; mdr: number } {
  const address = state.pc;
  const word = readWord(state, address);
  const region = regionOf(address)!;
  const store = region === 'rom' ? 'rom' : 'ram';
  return {
    ir: word,
    mdr: word,
    events: [
      {
        phase: 1, role: 'transfer', source: 'cpu-pc', target: 'cpu-mar', address, value: address, bus: { address, control: 'read' },
        text: 'PC → MAR: la dirección ' + h(address, 4) + ' sale al bus de direcciones.',
        changes: [{ label: 'MAR', before: h(state.mar, 4), after: h(address, 4) }],
      },
      {
        phase: 1, role: 'transfer', source: store, target: 'cpu-mdr', address, value: word, bus: { address, data: word, control: 'read' },
        text: regionName[region] + '[MAR] → MDR: la memoria responde con la palabra ' + h(word) + '.',
        changes: [{ label: 'MDR', before: h(state.mdr), after: h(word) }],
      },
      {
        phase: 1, role: 'transfer', source: 'cpu-mdr', target: 'cpu-ir', value: word, bus: { data: word },
        text: 'MDR → IR: la instrucción queda en el registro de instrucción.',
        changes: [{ label: 'IR', before: h(state.ir), after: h(word) }],
      },
      {
        phase: 2, role: 'control', source: 'cpu-pc', target: 'cpu-pc', value: address + 1, bus: {},
        text: 'PC avanza una palabra: ' + h(address, 4) + ' → ' + h(address + 1, 4) + '.',
        changes: [{ label: 'PC', before: h(address, 4), after: h(address + 1, 4) }],
      },
    ],
  };
}

const ev = (e: Omit<PcEvent, 'changes'> & { changes?: PcEvent['changes'] }): PcEvent => ({ ...e, changes: e.changes ?? [] });

/**
 * Runs one instruction through the seven steps of the cycle and then looks at the interrupt request. The
 * state it returns is new; the one it received is untouched, so the history can keep every step.
 */
export function stepPc(state: PcState): StepOutcome {
  if (state.power !== 'on') return { kind: 'fault', state, message: 'El PC está apagado. Enciéndelo para ejecutar.' };
  if (state.halted) return { kind: 'halted', state, events: [], text: 'El procesador está detenido (HALT).' };
  if (state.counters.instructions >= MAX_STEPS) return { kind: 'fault', state, message: 'Pausa automática: el programa superó ' + MAX_STEPS + ' instrucciones.' };
  try {
    return execute(state);
  } catch (e) {
    return { kind: 'fault', state, message: (e as Error).message };
  }
}

function execute(start: PcState): StepOutcome {
  const fetched = fetchEvents(start);
  const d: Decoded = decode(fetched.ir);
  // The key is read before anything changes, so a wait leaves no trace of the attempt.
  if (d.op === 'INPUT' && !start.keyboard.length)
    return { kind: 'waiting', state: start, reason: 'keyboard', text: 'INPUT espera una tecla: el controlador del teclado no tiene ninguna.' };

  let s: PcState = { ...start, ir: fetched.ir, mdr: fetched.mdr, mar: start.pc, pc: start.pc + 1 };
  const events = [...fetched.events];
  events.push(ev({ phase: 3, role: 'control', source: 'cpu-ir', target: 'control-unit', value: fetched.ir, bus: {}, text: 'La unidad de control interpreta ' + format(d) + '.' }));
  const regs = [...s.regs];
  let flags = s.flags;
  let halted = false;
  const addr = (b: number, imm: number) => (regs[b] + imm) | 0;
  const setReg = (n: number, v: number, label = 'R' + n) => {
    events.push(ev({ phase: 6, role: 'processing', source: 'alu', target: 'cpu-regs', value: v | 0, bus: {}, text: label + ' recibe ' + (v | 0) + '.', changes: [regChange(label, regs[n], v)] }));
    regs[n] = v | 0;
  };
  const operandRegs = (...n: number[]) =>
    events.push(ev({ phase: 4, role: 'transfer', source: 'cpu-regs', target: 'alu', bus: {}, text: 'Se leen ' + n.map((r) => 'R' + r + '=' + regs[r]).join(' y ') + '.' }));

  switch (d.op) {
    case 'LOADI':
      events.push(ev({ phase: 4, role: 'processing', source: 'control-unit', target: 'cpu-regs', value: d.imm, bus: {}, text: 'El valor inmediato ' + d.imm + ' viene en la propia instrucción.' }));
      setReg(d.a, d.imm);
      break;
    case 'LOAD': {
      const at = addr(d.b, d.imm);
      const word = readWord(s, at);
      events.push(
        ev({ phase: 4, role: 'transfer', source: 'cpu-regs', target: 'cpu-mar', address: at, bus: { address: at, control: 'read' }, text: 'La dirección ' + h(at, 4) + ' = R' + d.b + ' + ' + d.imm + ' va a MAR.', changes: [{ label: 'MAR', before: h(s.mar, 4), after: h(at, 4) }] }),
        ev({ phase: 4, role: 'transfer', source: regionOf(at) === 'rom' ? 'rom' : 'ram', target: 'cpu-mdr', address: at, value: word, bus: { address: at, data: word, control: 'read' }, text: regionName[regionOf(at)!] + '[' + h(at, 4) + '] = ' + (word | 0) + ' llega a MDR.', changes: [{ label: 'MDR', before: h(s.mdr), after: h(word) }] }),
      );
      s = { ...s, mar: at, mdr: word >>> 0 };
      setReg(d.a, word);
      break;
    }
    case 'STORE': {
      const at = addr(d.b, d.imm);
      operandRegs(d.a);
      events.push(ev({ phase: 5, role: 'transfer', source: 'cpu-regs', target: 'cpu-mdr', value: regs[d.a], bus: { data: regs[d.a] }, text: 'R' + d.a + ' = ' + regs[d.a] + ' pasa a MDR.', changes: [{ label: 'MDR', before: h(s.mdr), after: h(regs[d.a]) }] }));
      const before = readWord(s, at);
      s = writeWord({ ...s, mar: at, mdr: regs[d.a] >>> 0 }, at, regs[d.a]);
      events.push(ev({ phase: 6, role: 'storage', source: 'cpu-mdr', target: 'ram', address: at, value: regs[d.a], bus: { address: at, data: regs[d.a], control: 'write' }, text: 'MDR → ' + regionName[regionOf(at)!] + '[' + h(at, 4) + ']: la palabra queda guardada.', changes: [{ label: 'RAM[' + h(at, 4) + ']', before: String(before | 0), after: String(regs[d.a] | 0) }] }));
      break;
    }
    case 'ADD': case 'SUB': case 'ADDI': {
      const a = regs[d.a];
      const b = d.op === 'ADDI' ? d.imm : regs[d.b];
      operandRegs(...(d.op === 'ADDI' ? [d.a] : [d.a, d.b]));
      const sub = d.op === 'SUB';
      const result = (sub ? a - b : a + b) | 0;
      flags = flagsFor(result, a, b, sub);
      events.push(ev({ phase: 5, role: 'processing', source: 'alu', target: 'alu', value: result, bus: {}, text: 'La ALU calcula ' + a + (sub ? ' − ' : ' + ') + b + ' = ' + result + '; flags Z=' + +flags.Z + ' N=' + +flags.N + ' C=' + +flags.C + ' V=' + +flags.V + '.', changes: [{ label: 'flags', before: flagText(s.flags), after: flagText(flags) }] }));
      setReg(d.a, result);
      break;
    }
    case 'COMPARE': case 'COMPAREI': {
      const a = regs[d.a];
      const b = d.op === 'COMPAREI' ? d.imm : regs[d.b];
      operandRegs(...(d.op === 'COMPAREI' ? [d.a] : [d.a, d.b]));
      flags = flagsFor((a - b) | 0, a, b, true);
      events.push(ev({ phase: 5, role: 'processing', source: 'alu', target: 'control-unit', bus: {}, text: 'La ALU resta ' + a + ' − ' + b + ' sin guardar el resultado: solo cambian los flags (Z=' + +flags.Z + ' N=' + +flags.N + ').', changes: [{ label: 'flags', before: flagText(s.flags), after: flagText(flags) }] }));
      break;
    }
    case 'BRANCH': {
      const taken = holds(d.a, flags);
      events.push(ev({ phase: 5, role: 'control', source: 'control-unit', target: 'cpu-pc', value: d.imm, bus: {}, text: 'BRANCH ' + CONDITIONS[d.a] + ': ' + (taken ? 'se cumple, PC salta a ' + h(d.imm, 4) + '.' : 'no se cumple, PC sigue.'), changes: taken ? [{ label: 'PC', before: h(s.pc, 4), after: h(d.imm, 4) }] : [] }));
      if (taken) s = { ...s, pc: d.imm };
      break;
    }
    case 'STATUS': {
      const ready = start.keyboard.length > 0;
      events.push(ev({ phase: 4, role: 'transfer', source: 'keyboard-controller', target: 'cpu-regs', value: ready ? 1 : 0, bus: { control: 'status', data: ready ? 1 : 0 }, text: 'STATUS pregunta al controlador del teclado: ' + (ready ? 'hay una tecla.' : 'no hay teclas (sondeo en vano).') }));
      s = { ...s, counters: { ...s.counters, polls: s.counters.polls + (ready ? 0 : 1) } };
      setReg(d.a, ready ? 1 : 0);
      break;
    }
    case 'INPUT': {
      const [key, ...rest] = start.keyboard;
      events.push(ev({ phase: 4, role: 'transfer', source: 'keyboard-controller', target: 'cpu-regs', value: key, bus: { data: key, control: 'read' }, text: 'INPUT lee la tecla ' + describeKey(key) + ' del controlador.', changes: [{ label: 'Cola del teclado', before: start.keyboard.length + ' tecla(s)', after: rest.length + ' tecla(s)' }] }));
      s = { ...s, keyboard: rest };
      setReg(d.a, key);
      break;
    }
    case 'READ_FILE': {
      const name = FILE_NAMES[d.imm];
      const words = fileWords(s.ssd, name);
      const region = d.b === 1 ? 'program' : 'input';
      if (words.length > SIZES[region]) throw Error(name + ' no cabe en la región de ' + (region === 'input' ? 'entrada (' + INPUT_SIZE + ' palabras)' : 'programa') + ': tiene ' + words.length + ' palabras.');
      events.push(
        ev({ phase: 4, role: 'transfer', source: 'ssd', target: 'storage-controller', bus: { control: 'read' }, text: 'El controlador de almacenamiento pide ' + name + ' al SSD (' + (s.ssd[name]?.length ?? 0) + ' bytes).' }),
        ev({ phase: 6, role: 'storage', source: 'storage-controller', target: 'ram', address: BASES[region], bus: { address: BASES[region], control: 'write' }, text: name + ' se copia a ' + regionName[region] + ': ' + words.length + ' palabras. El SSD no cambia.', changes: [{ label: regionName[region], before: 'anterior', after: words.length + ' palabras' }] }),
      );
      const filled = [...zeros(SIZES[region])];
      words.forEach((w, i) => (filled[i] = w | 0));
      s = { ...s, ram: { ...s.ram, [region]: filled } };
      setReg(d.a, words.length);
      break;
    }
    case 'WRITE_FILE': {
      const name = FILE_NAMES[d.imm];
      let bytes: number[];
      if (d.b === 1) bytes = utf8Encode(decimalText(regs[d.a]));
      else {
        const count = regs[d.a];
        if (count < 0 || count > INPUT_SIZE) throw Error('WRITE_FILE: la longitud ' + count + ' no es válida.');
        bytes = utf8Encode(textOf(s.ram.input, count));
      }
      if (bytes.length > MAX_FILE_BYTES) throw Error('El archivo resultante supera 64 KiB.');
      events.push(
        ev({ phase: 5, role: 'transfer', source: 'ram', target: 'storage-controller', bus: { control: 'write' }, text: 'La RAM entrega ' + bytes.length + ' byte(s) al controlador de almacenamiento.' }),
        ev({ phase: 6, role: 'storage', source: 'storage-controller', target: 'ssd', bus: { control: 'write' }, text: name + ' queda guardado en el SSD: sobrevive al apagado.', changes: [{ label: name, before: (s.ssd[name]?.length ?? 0) + ' bytes', after: bytes.length + ' bytes' }] }),
      );
      s = { ...s, ssd: { ...s.ssd, [name]: bytes } };
      break;
    }
    case 'DISPLAY': {
      const mode = d.b;
      let monitor: Monitor;
      if (mode === 0) monitor = { mode: 'text', text: textOf(s.ram.framebuffer, FRAMEBUFFER_SIZE), pixels: [] };
      else if (mode === 4) monitor = { mode: 'text', text: textOf(s.ram.input, Math.max(0, regs[d.a])), pixels: [] };
      else if (mode === 1) {
        const pixels = s.ram.framebuffer.slice(0, 64);
        if (pixels.some((p) => p < 0 || p > 255)) throw Error('La imagen tiene un valor fuera de 0 a 255.');
        monitor = { mode: 'image', text: '', pixels: [...pixels] };
      } else if (mode === 2) monitor = { mode: 'number', text: decimalText(regs[d.a]), pixels: [], number: regs[d.a] };
      else monitor = { mode: 'error', text: ERRORS[d.imm] ?? 'Error ' + d.imm, pixels: [], message: ERRORS[d.imm] ?? 'Error ' + d.imm };
      events.push(
        ev({ phase: 5, role: 'transfer', source: mode === 2 || mode === 3 ? 'cpu-regs' : 'ram', target: 'display-engine', bus: { control: 'read' }, text: 'El motor de pantalla toma ' + (mode === 2 ? 'el número de R' + d.a : mode === 3 ? 'el código de error' : 'el contenido de la RAM de pantalla') + '.' }),
        ev({ phase: 6, role: 'transfer', source: 'display-engine', target: 'monitor', bus: { control: 'write' }, text: 'El monitor muestra ' + (monitor.mode === 'image' ? 'la imagen de 8×8' : '«' + monitor.text + '»') + '.', changes: [{ label: 'Monitor', before: s.monitor.text || s.monitor.mode, after: monitor.text || monitor.mode }] }),
      );
      s = { ...s, monitor };
      break;
    }
    case 'HALT':
      halted = true;
      events.push(ev({ phase: 5, role: 'control', source: 'control-unit', target: 'control-unit', bus: {}, text: 'HALT detiene el procesador.' }));
      break;
    case 'EI':
      events.push(ev({ phase: 5, role: 'control', source: 'control-unit', target: 'interrupt-controller', bus: {}, text: 'EI habilita las interrupciones: el teclado podrá interrumpir al procesador.' }));
      s = { ...s, interrupt: { ...s.interrupt, enabled: true } };
      break;
    case 'RETI': {
      const saved = s.interrupt.saved;
      if (!saved) throw Error('RETI fuera de una interrupción: no hay PC ni flags guardados.');
      events.push(ev({ phase: 5, role: 'control', source: 'interrupt-controller', target: 'cpu-pc', value: saved.pc, bus: {}, text: 'RETI restaura el PC (' + h(saved.pc, 4) + ') y los flags guardados: el programa continúa donde estaba.', changes: [{ label: 'PC', before: h(s.pc, 4), after: h(saved.pc, 4) }, { label: 'flags', before: flagText(flags), after: flagText(saved.flags) }] }));
      s = { ...s, pc: saved.pc, interrupt: { ...s.interrupt, inService: false, shadow: true, saved: undefined } };
      flags = saved.flags;
      break;
    }
    default:
      throw Error('Operación sin implementar: ' + d.op);
  }

  s = { ...s, regs, flags, halted, counters: { ...s.counters, instructions: s.counters.instructions + 1 } };

  // Step 7: the interrupt request is looked at once the instruction is complete, never in the middle.
  const request = s.interrupt.enabled && !s.interrupt.inService && !s.interrupt.shadow && s.keyboard.length > 0 && !halted;
  if (request) {
    events.push(
      ev({ phase: 7, role: 'control', source: 'keyboard-controller', target: 'interrupt-controller', bus: { control: 'interrupt' }, text: 'El controlador del teclado solicita una interrupción: hay una tecla esperando.' }),
      ev({ phase: 7, role: 'control', source: 'interrupt-controller', target: 'cpu-pc', value: KEYBOARD_VECTOR, bus: { control: 'interrupt' }, text: 'La instrucción en curso terminó: se guardan PC (' + h(s.pc, 4) + ') y flags, y el PC salta al vector ' + h(KEYBOARD_VECTOR, 4) + '.', changes: [{ label: 'PC', before: h(s.pc, 4), after: h(KEYBOARD_VECTOR, 4) }] }),
    );
    s = { ...s, interrupt: { ...s.interrupt, inService: true, saved: { pc: s.pc, flags: s.flags }, shadow: false }, pc: KEYBOARD_VECTOR, counters: { ...s.counters, interrupts: s.counters.interrupts + 1 } };
  } else {
    events.push(ev({ phase: 7, role: 'control', source: 'control-unit', target: 'interrupt-controller', bus: {}, text: s.interrupt.enabled ? 'Se comprueba la solicitud de interrupción: no hay ninguna que atender ahora.' : 'Las interrupciones están deshabilitadas: no se comprueba ninguna solicitud.' }));
    if (s.interrupt.shadow) s = { ...s, interrupt: { ...s.interrupt, shadow: false } };
  }
  return { kind: halted ? 'halted' : 'executed', state: s, events, text: format(d) };
}

const flagText = (f: Flags) => 'Z' + +f.Z + ' N' + +f.N + ' C' + +f.C + ' V' + +f.V;
export const describeKey = (code: number): string => (code === 10 ? '«Enter»' : code >= 32 && code < 127 ? '«' + String.fromCharCode(code) + '»' : '#' + code);

/** A key pressed on the real keyboard: it goes to the controller and is logged so a run can be repeated exactly. */
export function pressKey(state: PcState, code: number): PcState {
  if (state.power !== 'on') throw Error('El PC está apagado: enciéndelo antes de escribir.');
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) throw Error('Tecla inválida.');
  if (state.keyboard.length >= 64) throw Error('La cola del teclado está llena (64 teclas).');
  return { ...state, keyboard: [...state.keyboard, code], inputs: [...state.inputs, { at: state.counters.instructions, kind: 'key', code }] };
}

/** Types text, one key per character. At most 256 characters per send. */
export function typeText(state: PcState, text: string): PcState {
  const chars = [...text];
  if (chars.length > 256) throw Error('El texto supera 256 caracteres por envío.');
  return chars.reduce((s, c) => pressKey(s, c === '\n' ? 10 : c.codePointAt(0)!), state);
}

/** Runs until it halts, waits or faults, up to `limit` instructions. */
export function run(state: PcState, limit = MAX_STEPS): { state: PcState; events: PcEvent[][]; outcome: StepOutcome['kind'] | 'limit'; message?: string } {
  const steps: PcEvent[][] = [];
  let s = state;
  for (let n = 0; n < limit; n++) {
    const out = stepPc(s);
    if (out.kind === 'waiting') return { state: out.state, events: steps, outcome: 'waiting', message: out.text };
    if (out.kind === 'fault') return { state: out.state, events: steps, outcome: 'fault', message: out.message };
    s = out.state;
    steps.push(out.events);
    if (out.kind === 'halted') return { state: s, events: steps, outcome: 'halted' };
  }
  return { state: s, events: steps, outcome: 'limit' };
}

/** Boots: switches on and runs the loader's two instructions, so the program is in RAM and the PC is at its start. */
export function boot(state: PcState): { state: PcState; events: PcEvent[][] } {
  const on = powerOn(state);
  const events: PcEvent[][] = [on.events];
  let s = on.state;
  for (let n = 0; n < 2; n++) {
    const out = stepPc(s);
    if (out.kind !== 'executed') throw Error(out.kind === 'fault' ? out.message : 'El arranque no pudo terminar.');
    s = out.state;
    events.push(out.events);
  }
  return { state: s, events };
}

/** Plays the logged keys back at the instruction where they arrived: the same inputs give the same run. */
export function replay(initial: PcState, inputs: readonly PcInput[], instructions: number): PcState {
  let s: PcState = { ...initial, inputs: [] };
  const pending = [...inputs];
  while (s.counters.instructions < instructions || pending.length) {
    while (pending.length && pending[0].at <= s.counters.instructions) s = pressKey(s, pending.shift()!.code);
    if (s.counters.instructions >= instructions) break;
    const out = stepPc(s);
    if (out.kind === 'waiting' || out.kind === 'fault') break;
    s = out.state;
    if (out.kind === 'halted') break;
  }
  return s;
}

