import type { AdvanceUnit, SimulationController, TransportState } from './simulation-controller';

export interface SocHost {
  /** 0 = CPU prepares, 1 = GPU processes, 2 = CPU receives. */
  readonly stage: () => number;
  readonly lastStage: number;
  advance(): void;
  reset(): void;
}

/** Adapter of the shared-buffer dependency: one hand-over between CPU and GPU per step. */
export class SocController implements SimulationController {
  readonly id = 'soc' as const;
  constructor(private readonly host: SocHost) {}

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
    /* no history in the buffer exercise */
  }

  async restart(): Promise<void> {
    this.host.reset();
  }

  pause(): void {
    /* synchronous steps */
  }
}
