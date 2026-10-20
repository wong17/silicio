import { FRAMEBUFFER_BASE, INPUT_BASE, PROGRAM_BASE, WORK_BASE, type Monitor, type PcEvent, type PcState } from '../simulation/pc/pc-model';

/** The three lines of a bus (§6.1): what a transfer needs on the address, data and control lines. */
export type Bus = 'address' | 'data' | 'control';

/** One value travelling along one line of the bus between two pieces of the bench. */
export interface PcPacket {
  bus: Bus;
  from: string;
  to: string;
  /** What the packet carries: an address, a data word or a control signal. */
  value: string;
}

export interface PcEventView {
  phase: number;
  role: PcEvent['role'];
  source: string;
  target: string;
  text: string;
  packets: PcPacket[];
}

/** What the scene needs of the PC, nothing else: both the 2D instruments and the 3D bench read this. */
export interface PcSceneActivity {
  power: boolean;
  /** Executed instructions so far; a new value means a new step to animate. */
  step: number;
  events: PcEventView[];
  /** Index (in the whole step) of the transfer being followed, when the student chose one. */
  focus?: number;
  registers: { pc: number; ir: number; mar: number; mdr: number; regs: number[]; flags: string };
  /** Words in use in each RAM region, and the region the last step touched. */
  ram: { program: number; input: number; work: number; framebuffer: number; touched?: 'program' | 'input' | 'work' | 'framebuffer' };
  monitor: Pick<Monitor, 'mode' | 'text' | 'pixels'>;
  ssd: { name: string; bytes: number }[];
  interrupt: { enabled: boolean; inService: boolean; pending: number; interrupts: number };
  polls: number;
}

const hex4 = (n: number) => (n >>> 0).toString(16).toUpperCase().padStart(4, '0') + 'h';
const hex8 = (n: number) => (n >>> 0).toString(16).toUpperCase().padStart(8, '0') + 'h';

/** The memory component an address belongs to. */
const memoryPieceOf = (address: number): 'rom' | 'ram' => (address < PROGRAM_BASE ? 'rom' : 'ram');

const CONTROL_LABEL: Record<string, string> = { read: 'RD', write: 'WR', interrupt: 'IRQ', status: 'STATUS' };

/**
 * The packets of one event: one per line of the bus it uses. The address goes from the processor to the memory
 * side, the data between the two pieces of the event, and the control signal from the control unit to the
 * piece that answers.
 */
export function packetsOf(event: Pick<PcEvent, 'source' | 'target' | 'address' | 'value' | 'bus'>): PcPacket[] {
  const out: PcPacket[] = [];
  const { bus } = event;
  const memory = event.address !== undefined && event.address >= 0 ? memoryPieceOf(event.address) : undefined;
  const device = [event.source, event.target].find((p) => !p.startsWith('cpu') && p !== 'alu' && p !== 'control-unit') ?? event.target;
  if (bus.address !== undefined)
    out.push({ bus: 'address', from: 'cpu-mar', to: event.source === 'rom' || event.target === 'rom' ? 'rom' : memory ?? device, value: hex4(bus.address) });
  if (bus.data !== undefined) out.push({ bus: 'data', from: event.source, to: event.target, value: hex8(bus.data) });
  if (bus.control)
    out.push({ bus: 'control', from: bus.control === 'interrupt' ? event.source : 'control-unit', to: bus.control === 'interrupt' ? event.target : device, value: CONTROL_LABEL[bus.control] });
  return out;
}

/** Words in use: up to the last one that is not zero. */
const count = (words: readonly number[]) => words.reduce((n, w, i) => (w !== 0 ? i + 1 : n), 0);

/** Projects the machine and the events of its last step into what the instruments and the bench show. */
export function pcSceneActivity(state: PcState, allEvents: readonly PcEvent[], focus?: number): PcSceneActivity {
  // Following one packet: only the chosen transfer of the step is on stage.
  const events = focus !== undefined && allEvents[focus] ? [allEvents[focus]] : allEvents;
  const regionOfAddress = (a: number | undefined): PcSceneActivity['ram']['touched'] =>
    a === undefined ? undefined : a >= FRAMEBUFFER_BASE ? 'framebuffer' : a >= WORK_BASE ? 'work' : a >= INPUT_BASE ? 'input' : a >= PROGRAM_BASE ? 'program' : undefined;
  const touched = [...events].reverse().map((e) => regionOfAddress(e.address)).find(Boolean);
  return {
    power: state.power === 'on',
    step: state.counters.instructions,
    focus: focus !== undefined && allEvents[focus] ? focus : undefined,
    events: events.map((e) => ({ phase: e.phase, role: e.role, source: e.source, target: e.target, text: e.text, packets: packetsOf(e) })),
    registers: { pc: state.pc, ir: state.ir, mar: state.mar, mdr: state.mdr, regs: [...state.regs], flags: 'Z' + +state.flags.Z + ' N' + +state.flags.N + ' C' + +state.flags.C + ' V' + +state.flags.V },
    ram: {
      program: count(state.ram.program),
      input: count(state.ram.input),
      work: count(state.ram.work),
      framebuffer: count(state.ram.framebuffer),
      touched,
    },
    monitor: { mode: state.monitor.mode, text: state.monitor.text, pixels: state.monitor.pixels },
    ssd: Object.entries(state.ssd).map(([name, bytes]) => ({ name, bytes: bytes.length })),
    interrupt: { enabled: state.interrupt.enabled, inService: state.interrupt.inService, pending: state.keyboard.length, interrupts: state.counters.interrupts },
    polls: state.counters.polls,
  };
}
