import type { AdvanceUnit, SimulationController, TransportState } from './simulation-controller';

/** What the 8086 engine of the laboratory shows and accepts; implemented by LabSession. */
export interface Cpu8086Host {
  nextInstruction(): Promise<void>;
  nextPhase(): Promise<void>;
  back(): void;
  backPhase(): void;
  /** Step of the cycle on show (0–6), or undefined when the confirmed state is shown. */
  readonly explaining: () => number | undefined;
  /** Line of the breakpoint that holds the next instruction, if any. */
  readonly breakpointLine: () => number | undefined;
  load(): void;
  cancelStep(): void;
  readonly halted: () => boolean;
  readonly phaseLabel: (index: number) => string;
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
    const at = this.host.explaining();
    const breakpoint = this.host.breakpointLine();
    return {
      status: waiting ? 'waiting-input' : failed ? 'error' : halted && (at === undefined || at >= 6) ? 'finished' : this.host.cursor() < 0 ? 'ready' : 'paused',
      units: ['instruction', 'phase'],
      // The seventh step of the last instruction can still be shown after HLT.
      canNext: (!halted || (at !== undefined && at < 6)) && !waiting,
      canBack: this.host.cursor() >= 0,
      step: this.host.cursor() + 1,
      ...(waiting ? { reason: 'Esperando teclado' } : {}),
      ...(at !== undefined ? { detail: 'Explicando instrucción ' + (this.host.cursor() + 1) + ' · ' + this.host.phaseLabel(at) } : {}),
      ...(breakpoint !== undefined ? { breakpoint } : {}),
    };
  }

  next(unit: AdvanceUnit): Promise<void> {
    return unit === 'phase' ? this.host.nextPhase() : this.host.nextInstruction();
  }

  back(unit: AdvanceUnit): Promise<void> {
    if (unit === 'phase') this.host.backPhase();
    else this.host.back();
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
