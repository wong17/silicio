import type { AdvanceUnit, SimulationController, TransportState } from './simulation-controller';

export interface MemoryLessonHost {
  /** Reads of the cache sequence already revealed, and how many there are. */
  readonly revealed: () => number;
  readonly total: () => number;
  reset(): void;
}

/**
 * Adapter of the memory exercise. Its steps are the student's own predictions («Acierto»/«Fallo»), which stay
 * next to the data, so the transport never advances it: it shows the wait and offers to start over.
 */
export class MemoryLessonController implements SimulationController {
  readonly id = 'memory-lesson' as const;
  constructor(private readonly host: MemoryLessonHost) {}

  state(): TransportState {
    const total = this.host.total();
    const revealed = this.host.revealed();
    const done = total === 0 || revealed >= total;
    return {
      status: done ? (total === 0 ? 'ready' : 'finished') : 'waiting-input',
      units: ['access'],
      canNext: false,
      canBack: false,
      step: revealed,
      ...(!done ? { reason: 'Predice acierto o fallo' } : {}),
    };
  }

  async next(_unit: AdvanceUnit): Promise<void> {
    throw Error('Predice la lectura con «Acierto» o «Fallo»: cada predicción es el siguiente paso.');
  }

  async back(): Promise<void> {
    /* predictions cannot be taken back */
  }

  async restart(): Promise<void> {
    this.host.reset();
  }

  pause(): void {
    /* nothing runs on its own */
  }
}
