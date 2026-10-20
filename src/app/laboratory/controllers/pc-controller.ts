import type { AdvanceUnit, SimulationController, TransportState } from './simulation-controller';

/** What the PC exercise offers the transport; implemented by PcSession. */
export interface PcHost {
  step(): boolean;
  back(): boolean;
  nextTransfer(): boolean;
  backTransfer(): boolean;
  /** Transfer on show (0-based) and how many the last step had. */
  readonly focus: () => number | undefined;
  readonly eventCount: () => number;
  resetExercise(): void;
  readonly canBack: () => boolean;
  readonly stepCount: () => number;
  readonly halted: () => boolean;
  readonly powered: () => boolean;
  readonly waiting: () => boolean;
  readonly message: () => string;
}

/** Adapter of the PC to the common transport: switching on, then one instruction per step. */
export class PcController implements SimulationController {
  readonly id = 'machine' as const;
  constructor(private readonly host: PcHost) {}

  state(): TransportState {
    const waiting = this.host.waiting();
    const halted = this.host.halted();
    const fault = !waiting && !!this.host.message();
    return {
      status: waiting ? 'waiting-input' : fault ? 'error' : halted ? 'finished' : this.host.stepCount() === 0 ? 'ready' : 'paused',
      units: ['instruction', 'transfer'],
      canNext: (!halted || (this.host.focus() ?? 0) < this.host.eventCount() - 1) && !waiting,
      canBack: this.host.canBack(),
      step: this.host.stepCount(),
      ...(waiting ? { reason: 'Esperando teclado' } : {}),
      ...(this.host.focus() !== undefined ? { detail: 'Siguiendo la transferencia ' + (this.host.focus()! + 1) + ' de ' + this.host.eventCount() } : {}),
      ...(!this.host.powered() && !halted && !waiting && this.host.focus() === undefined ? { detail: 'Apagado: el primer paso enciende el PC' } : {}),
    };
  }

  async next(unit: AdvanceUnit): Promise<void> {
    if (unit === 'transfer') this.host.nextTransfer();
    else {
      this.host.step();
    }
  }

  async back(unit: AdvanceUnit): Promise<void> {
    if (unit === 'transfer') this.host.backTransfer();
    else this.host.back();
  }

  async restart(): Promise<void> {
    this.host.resetExercise();
  }

  pause(): void {
    /* every step is synchronous */
  }
}
