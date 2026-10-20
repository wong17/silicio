import type { AdvanceUnit, SimulationController, TransportState } from './simulation-controller';

export interface MachineHost {
  /** Stage of the transfer, 0 (waiting) to the last one. */
  readonly stage: () => number;
  readonly lastStage: number;
  advance(): void;
  reset(): void;
}

/** Adapter of the conceptual machine: one bus transfer per step. */
export class MachineController implements SimulationController {
  readonly id = 'machine' as const;
  constructor(private readonly host: MachineHost) {}

  state(): TransportState {
    const stage = this.host.stage();
    const done = stage >= this.host.lastStage;
    return {
      status: done ? 'finished' : stage === 0 ? 'ready' : 'paused',
      units: ['transfer'],
      canNext: !done,
      canBack: false,
      step: stage,
    };
  }

  async next(_unit: AdvanceUnit): Promise<void> {
    if (this.host.stage() < this.host.lastStage) this.host.advance();
  }

  async back(): Promise<void> {
    /* The conceptual machine has no history yet; the PC engine of T06 restores its states. */
  }

  async restart(): Promise<void> {
    this.host.reset();
  }

  pause(): void {
    /* every step is synchronous: nothing is left pending */
  }
}
