import type { projectLaboratory } from './laboratory.facade';

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
