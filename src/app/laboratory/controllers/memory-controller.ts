import type { AdvanceUnit, SimulationController, TransportState } from './simulation-controller';

export interface MemoryLessonHost {
  /** Steps of the open activity already revealed, and how many there are. */
  readonly step: () => number;
  readonly total: () => number;
  /** Set while the activity waits for the student's own answer (the cache predictions). */
  readonly waiting: () => string | undefined;
  advance(): void;
  reset(): void;
}

/**
 * Adapter of the memory exercises. Their steps are small accesses (write a byte, build an address, reveal a
 * chip); the cache predictions are the student's own steps and stay next to the data, so the transport
 * explains the wait instead of advancing past them.
 */
export class MemoryLessonController implements SimulationController {
  readonly id = 'memory-lesson' as const;
  constructor(private readonly host: MemoryLessonHost) {}

  state(): TransportState {
    const total = this.host.total();
    const step = this.host.step();
    const waiting = this.host.waiting();
    const done = total === 0 || step >= total;
    return {
      status: waiting ? 'waiting-input' : done ? (total === 0 ? 'ready' : 'finished') : step === 0 ? 'ready' : 'paused',
      units: ['access'],
      canNext: !waiting && !done,
      canBack: false,
      step,
      ...(waiting ? { reason: waiting } : {}),
    };
  }

  async next(_unit: AdvanceUnit): Promise<void> {
    const waiting = this.host.waiting();
    if (waiting) throw Error('Predice la lectura con «Acierto» o «Fallo»: cada predicción es el siguiente paso.');
    this.host.advance();
  }

  async back(): Promise<void> {
    /* each access of the exercise is final until it is restarted */
  }

  async restart(): Promise<void> {
    this.host.reset();
  }

  pause(): void {
    /* nothing runs on its own */
  }
}
