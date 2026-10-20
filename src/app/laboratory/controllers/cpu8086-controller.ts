import type { AdvanceUnit, SimulationController, TransportState } from './simulation-controller';

/** What the 8086 engine of the laboratory shows and accepts; implemented by LabSession. */
export interface Cpu8086Host {
  step(): Promise<void>;
  back(): void;
  load(): void;
  cancelStep(): void;
  readonly halted: () => boolean;
  /** Index of the instruction on screen; -1 before the first one. */
  readonly cursor: () => number;
  readonly waitingInput: () => 0x01 | 0x0a | undefined;
  readonly error: () => string;
}

/** Adapter of the 8086 session to the common transport: one instruction per step. */
export class Cpu8086Controller implements SimulationController {
  readonly id = '8086' as const;
  constructor(private readonly host: Cpu8086Host) {}

  state(): TransportState {
    const waiting = this.host.waitingInput();
    const halted = this.host.halted();
    const failed = !!this.host.error();
    return {
      status: waiting ? 'waiting-input' : failed ? 'error' : halted ? 'finished' : this.host.cursor() < 0 ? 'ready' : 'paused',
      units: ['instruction'],
      canNext: !halted && !waiting,
      canBack: this.host.cursor() >= 0,
      step: this.host.cursor() + 1,
      ...(waiting ? { reason: 'Esperando teclado' } : {}),
    };
  }

  next(_unit: AdvanceUnit): Promise<void> {
    return this.host.step();
  }

  back(_unit: AdvanceUnit): Promise<void> {
    this.host.back();
    return Promise.resolve();
  }

  restart(): Promise<void> {
    this.host.load();
    return Promise.resolve();
  }

  pause(): void {
    this.host.cancelStep();
  }
}
