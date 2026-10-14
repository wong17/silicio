import type { projectLaboratory } from './laboratory.facade';
import { BUFFER_STAGE_UNITS } from '../content/apple-m5';

/** Phases of one instruction's journey, in the order a student follows them. */
export type Phase = 'idle' | 'fetch' | 'decode' | 'execute' | 'write';

export const PHASES: readonly Exclude<Phase, 'idle'>[] = ['fetch', 'decode', 'execute', 'write'];

export const PHASE_LABEL: Record<Phase, string> = {
  idle: 'En reposo',
  fetch: 'Buscar',
  decode: 'Decodificar',
  execute: 'Ejecutar',
  write: 'Escribir',
};

/**
 * What the academic state says is happening right now, in the vocabulary of the scene: which blocks are
 * working, what the buses carry and which registers changed. Animations that explain behaviour read this
 * and nothing else, so they cannot drift from the real session.
 */
export interface StationActivity {
  phase: Phase;
  /** Session the activity belongs to; a consumer drops anything from an older one. */
  sessionId: string;
  /** Increments with every executed step, so a consumer can tell a new step from a repeated phase. */
  revision: number;
  /** Ids of the model pieces that work in this phase. */
  blocks: string[];
  /** Physical address on the bus during this phase, when there is one. */
  address?: number;
  data?: number;
  rd: boolean;
  wr: boolean;
  ale: boolean;
  /** Code bytes of the instruction (fetch, decode) or data bytes (write). */
  bytes: number[];
  /** Register and flag names that changed in the step. */
  changed: string[];
  mnemonic?: string;
  /** Apple M5 shared-buffer dependency, when the station is the SoC. */
  buffer?: BufferActivity;
  /** La máquina: which bus carries a value in the current step, and the values the chips show. */
  machine?: MachineActivity;
  /** Memory station: where the selected address lands and what the cells hold. */
  memory?: MemoryActivity;
}

/** One byte of a word as the classic board stores it: a bank, a row and a column in each one-bit chip. */
export interface MemoryByte {
  address: number;
  /** 0 even bank (D0 to D7), 1 odd bank (D8 to D15). */
  bank: 0 | 1;
  /** Cell index inside the bank: the address without its A0 bit. */
  index: number;
  row: number;
  col: number;
  value: number;
}

export interface MemoryActivity {
  segment: number;
  offset: number;
  physical: number;
  a0: boolean;
  bhe: boolean;
  /** One bus cycle for an even address, two for a word that starts on an odd one. */
  cycles: 1 | 2;
  /** Low byte (the one at `physical`) and high byte (the next address). */
  low: MemoryByte;
  high: MemoryByte;
  word: number;
  /** Another segment:offset pair that names the same physical cell. */
  alias: { segment: number; offset: number };
  /** Eight bytes of the aligned 64-bit burst that the DIMM serves for this address. */
  burstBase: number;
  burst: number[];
}

export interface MachineActivity {
  stage: number;
  /** Bus that lights in this step, or none while the machine waits or the ALU works. */
  bus: 'address' | 'data' | 'control' | null;
  /** Direction of travel along the bus: `out` goes from the processor, `in` goes toward it. */
  direction: 'out' | 'in';
  /** Where the value ends up on a control step: the output port instead of the RAM. */
  target: 'ram' | 'io';
  /** Text carried by the packet, e.g. 0007h or RD. */
  value: string;
  accumulator: number;
  memory: number[];
  output: number;
  aluFrom?: number;
}

export interface BufferActivity {
  /** 0 CPU prepares, 1 GPU processes, 2 CPU receives. */
  stage: 0 | 1 | 2;
  /** The completion signal has been given: only then may the CPU read B1. */
  completed: boolean;
  /** Conceptual contrast: each unit has its own memory and the buffer is copied between them. */
  separate: boolean;
  version: number;
}

export const IDLE_ACTIVITY: StationActivity = {
  phase: 'idle',
  sessionId: '',
  revision: 0,
  blocks: [],
  rd: false,
  wr: false,
  ale: false,
  bytes: [],
  changed: [],
};

type LaboratoryView = ReturnType<typeof projectLaboratory> & {
  sessionId: string;
  /** Physical address of the instruction fetched in the last step (CS × 16 + IP before it). */
  fetchAddress?: number;
};

const BLOCKS: Record<Phase, string[]> = {
  idle: [],
  fetch: ['biu', 'queue'],
  decode: ['control', 'queue'],
  execute: ['alu', 'registers', 'control'],
  write: ['biu'],
};

/** Projects the facade view into the activity of one phase. Pure: no clocks, no randomness. */
export function projectActivity(view: LaboratoryView, phase: Phase, revision = 0): StationActivity {
  const instruction = view.instruction;
  if (phase === 'idle' || !instruction)
    return { ...IDLE_ACTIVITY, sessionId: view.sessionId, revision, phase: instruction ? phase : 'idle' };
  const changed = [
    ...view.registers.filter((r) => r.changedMask !== 0).map((r) => r.name as string),
    ...view.flagsChanged.map((f) => f as string),
  ];
  const write = view.accesses.find((a) => a.kind === 'write');
  const read = view.accesses.find((a) => a.kind === 'read');
  const base: StationActivity = {
    ...IDLE_ACTIVITY,
    phase,
    sessionId: view.sessionId,
    revision,
    blocks: BLOCKS[phase],
    changed: phase === 'execute' || phase === 'write' ? changed : [],
    mnemonic: instruction.text,
  };
  switch (phase) {
    case 'fetch':
      return { ...base, address: view.fetchAddress, ale: true, rd: true, bytes: [...instruction.bytes] };
    case 'decode':
      return { ...base, bytes: [...instruction.bytes] };
    case 'execute':
      return { ...base, data: view.operation?.result ?? view.operation?.operands[0] };
    case 'write': {
      const access = write ?? read;
      return {
        ...base,
        address: access?.address,
        data: access?.value ?? view.operation?.result,
        ale: !!access,
        wr: !!write,
        rd: !write && !!read,
        bytes: access ? [access.value & 0xff] : [],
      };
    }
  }
}

/**
 * Delivers activity to the scene's models. Activity stamped with another session id than the current one
 * (a late worker result after a reload or import) is dropped before any model sees it.
 */
export class ActivityChannel {
  private listeners = new Set<(a: StationActivity) => void>();
  private session = '';
  private last: StationActivity = IDLE_ACTIVITY;

  subscribe(fn: (a: StationActivity) => void): () => void {
    this.listeners.add(fn);
    fn(this.last);
    return () => this.listeners.delete(fn);
  }

  /** Marks which session is live; the next activity must carry the same id. */
  begin(sessionId: string): void {
    this.session = sessionId;
    this.last = { ...IDLE_ACTIVITY, sessionId };
    for (const fn of this.listeners) fn(this.last);
  }

  publish(activity: StationActivity): boolean {
    if (this.session && activity.sessionId !== this.session) return false;
    if (!this.session) this.session = activity.sessionId;
    this.last = activity;
    for (const fn of this.listeners) fn(activity);
    return true;
  }

  clear(): void {
    this.listeners.clear();
  }

  get current(): StationActivity {
    return this.last;
  }
}

/** Little-endian bit list of a value, lowest bit first, for pin and lamp rows. */
export function bitsOf(value: number | undefined, width: number): boolean[] {
  const v = value ?? 0;
  return Array.from({ length: width }, (_, i) => ((v >>> i) & 1) === 1);
}

/** Activity of the SoC station: the shared buffer is the only thing that moves, and it never moves. */
export function projectBufferActivity(
  buffer: BufferActivity,
  sessionId: string,
  revision: number,
): StationActivity {
  const units = BUFFER_STAGE_UNITS[buffer.stage];
  return {
    ...IDLE_ACTIVITY,
    phase: buffer.stage === 0 ? 'fetch' : buffer.stage === 1 ? 'execute' : 'write',
    sessionId,
    revision,
    blocks: [...units],
    rd: buffer.stage !== 0,
    wr: buffer.stage !== 2,
    changed: buffer.completed ? ['B1'] : [],
    buffer,
  };
}

const MASK20 = 0xfffff;

function memoryByte(address: number, read: (a: number) => number): MemoryByte {
  const a = address & MASK20;
  const index = (a >>> 1) & 0xffff;
  return { address: a, bank: (a & 1) as 0 | 1, index, row: index & 0xff, col: (index >>> 8) & 0xff, value: read(a) & 0xff };
}

/** Pure projection of the selected segment:offset onto the banks, rows and columns of the board. */
export function projectMemory(segment: number, offset: number, read: (address: number) => number): MemoryActivity {
  const seg = segment & 0xffff,
    off = offset & 0xffff;
  const physical = (seg * 16 + off) & MASK20;
  const low = memoryByte(physical, read),
    high = memoryByte(physical + 1, read);
  const burstBase = physical & ~7 & MASK20;
  const aliasSegment = off >= 16 ? (seg + 1) & 0xffff : (seg - 1) & 0xffff;
  const aliasOffset = off >= 16 ? off - 16 : (off + 16) & 0xffff;
  return {
    segment: seg,
    offset: off,
    physical,
    a0: (physical & 1) === 1,
    bhe: (physical & 1) === 0,
    cycles: (physical & 1) === 1 ? 2 : 1,
    low,
    high,
    word: (high.value << 8) | low.value,
    alias: { segment: aliasSegment, offset: aliasOffset },
    burstBase,
    burst: Array.from({ length: 8 }, (_, i) => read(burstBase + i) & 0xff),
  };
}
