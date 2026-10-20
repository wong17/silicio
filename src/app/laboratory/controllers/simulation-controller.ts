/** View or chapter the student is looking at. `soc` replaces the old `apple` route in T10. */
export type ExperienceId = '8086' | 'memory' | 'machine' | 'soc';
/** Engine that owns the running exercise; a view can be consulted without owning it. */
export type ControllerId = '8086' | 'memory-lesson' | 'machine' | 'soc';
export type AdvanceUnit = 'instruction' | 'phase' | 'transfer' | 'access';
export type PlaybackStatus = 'ready' | 'running' | 'paused' | 'waiting-input' | 'finished' | 'error';

export interface TransportState {
  status: PlaybackStatus;
  units: readonly AdvanceUnit[];
  canNext: boolean;
  canBack: boolean;
  step: number;
  /** Why the exercise cannot go on, shown beside the controls («Esperando teclado»). */
  reason?: string;
}

/**
 * One engine seen by the transport. `next` resolves when the step is complete (or discarded), so the
 * scheduler never asks for another one while a slow worker is still answering.
 */
export interface SimulationController {
  readonly id: ControllerId;
  state(): TransportState;
  next(unit: AdvanceUnit): Promise<void>;
  back(unit: AdvanceUnit): Promise<void>;
  restart(): Promise<void>;
  pause(): void;
}

export type Speed = 'slow' | 'normal' | 'fast';
/** Pause between two steps of a run; it changes the presentation, never the simulated frequency. */
export const SPEED_DELAY: Readonly<Record<Speed, number>> = { slow: 900, normal: 450, fast: 120 };
export const RUN_STEP_LIMIT = 2048;

/** The view each engine opens by default. */
export const DEFAULT_CONTROLLER: Readonly<Record<ExperienceId, ControllerId>> = {
  '8086': '8086',
  memory: 'memory-lesson',
  machine: 'machine',
  soc: 'soc',
};
/** Views that read the data of another engine's exercise without starting their own. */
export const CONSULT_VIEWS: Readonly<Record<ControllerId, readonly ExperienceId[]>> = {
  '8086': ['memory'],
  'memory-lesson': [],
  machine: [],
  soc: [],
};
export const CONTROLLER_LABEL: Readonly<Record<ControllerId, string>> = {
  '8086': '8086',
  'memory-lesson': 'Memoria',
  machine: 'PC',
  soc: 'SoC',
};
export const UNIT_LABEL: Readonly<Record<AdvanceUnit, string>> = {
  instruction: 'Instrucción',
  phase: 'Fase',
  transfer: 'Transferencia',
  access: 'Acceso',
};
/** Which view chapter a section of the app belongs to; the atrium and the retired chronoscope own none. */
export function experienceOf(section: string): ExperienceId | undefined {
  if (section === '8086' || section === 'memory' || section === 'machine') return section;
  if (section === 'apple' || section === 'soc') return 'soc';
  return undefined;
}
