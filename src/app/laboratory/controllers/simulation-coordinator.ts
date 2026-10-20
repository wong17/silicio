import { Injectable, computed, signal } from '@angular/core';
import {
  CONSULT_VIEWS,
  CONTROLLER_LABEL,
  DEFAULT_CONTROLLER,
  RUN_STEP_LIMIT,
  SPEED_DELAY,
  UNIT_LABEL,
  type AdvanceUnit,
  type ControllerId,
  type ExperienceId,
  type SimulationController,
  type Speed,
  type TransportState,
} from './simulation-controller';

/**
 * The only clock of the laboratory. It drives the controller that owns the exercise: one step at a time,
 * the next one only after the previous answer arrived, and never two clocks at once.
 */
@Injectable({ providedIn: 'root' })
export class SimulationCoordinator {
  private readonly controllers = new Map<ControllerId, SimulationController>();
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private wake?: () => void;
  /** Identifies the step being answered; a later owner never inherits the busy state of an earlier one. */
  private pending?: symbol;

  readonly activeId = signal<ControllerId | undefined>(undefined);
  readonly view = signal<ExperienceId | undefined>(undefined);
  readonly focusPiece = signal<string | undefined>(undefined);
  readonly running = signal(false);
  readonly speed = signal<Speed>('normal');
  /** Grain chosen by the student; undefined means the first unit the engine offers. */
  readonly grain = signal<AdvanceUnit | undefined>(undefined);
  /** Set when a run stopped by itself, with the reason to show next to the controls. */
  readonly stopReason = signal('');
  /** Bumped when a model change dropped a pending answer; read by tests and the transport. */
  readonly revision = signal(0);

  /** Registers the engines that can own an exercise. */
  register(controller: SimulationController): void {
    this.controllers.set(controller.id, controller);
  }

  readonly active = computed(() => {
    const id = this.activeId();
    return id ? this.controllers.get(id) : undefined;
  });

  /** State of the owner as the transport shows it: `running` wins over `ready`/`paused`. */
  readonly transport = computed<(TransportState & { label: string; unit: AdvanceUnit }) | undefined>(() => {
    const controller = this.active();
    if (!controller) return undefined;
    this.revision();
    const state = controller.state();
    const unit = this.unit(state);
    return {
      ...state,
      status: this.running() && state.status !== 'waiting-input' ? 'running' : state.status,
      reason: state.reason ?? (this.stopReason() || undefined),
      detail: state.detail,
      label: CONTROLLER_LABEL[controller.id] + ' · ' + UNIT_LABEL[unit],
      unit,
    };
  });

  private unit(state: TransportState): AdvanceUnit {
    const chosen = this.grain();
    return chosen && state.units.includes(chosen) ? chosen : state.units[0];
  }

  /** Makes `id` the owner. The previous one pauses, keeps its state and does not resume on its own. */
  activate(id: ControllerId): void {
    if (this.activeId() === id) return;
    this.pause();
    this.generation++;
    this.pending = undefined;
    this.revision.update((n) => n + 1);
    this.activeId.set(id);
    this.grain.set(undefined);
    this.stopReason.set('');
  }

  /**
   * Opens another view. Consulting a view of the running exercise (memory from the 8086) keeps the owner,
   * the data and the step; any other view hands the clock to its own engine.
   */
  changeView(view: ExperienceId, focusPiece?: string): void {
    this.view.set(view);
    this.focusPiece.set(focusPiece);
    const active = this.activeId();
    if (active && (DEFAULT_CONTROLLER[view] === active || CONSULT_VIEWS[active].includes(view))) return;
    this.activate(DEFAULT_CONTROLLER[view]);
  }

  setSpeed(value: Speed): void {
    this.speed.set(value);
  }

  setGrain(unit: AdvanceUnit): void {
    this.grain.set(unit);
  }

  /** One step. Ignored while another step is still being answered or a run is going. */
  async step(unit?: AdvanceUnit): Promise<void> {
    const controller = this.active();
    if (!controller || this.running() || this.pending) return;
    const state = controller.state();
    if (!state.canNext) return;
    this.stopReason.set('');
    await this.advance(controller, unit ?? this.unit(state), this.generation);
  }

  async back(unit?: AdvanceUnit): Promise<void> {
    const controller = this.active();
    if (!controller || this.pending) return;
    this.pause();
    const state = controller.state();
    if (!state.canBack) return;
    const token = (this.pending = Symbol('back'));
    try {
      await controller.back(unit ?? this.unit(state));
    } finally {
      if (this.pending === token) this.pending = undefined;
      this.revision.update((n) => n + 1);
    }
  }

  async restart(): Promise<void> {
    const controller = this.active();
    if (!controller) return;
    this.pause();
    this.stopReason.set('');
    await controller.restart();
    this.revision.update((n) => n + 1);
  }

  /** Starts the clock; a second call while it runs is ignored, so there is never a second clock. */
  run(unit?: AdvanceUnit): void {
    const controller = this.active();
    if (!controller || this.running() || this.pending) return;
    const state = controller.state();
    if (!state.canNext) return;
    this.stopReason.set('');
    this.running.set(true);
    const generation = ++this.generation;
    void this.loop(controller, unit ?? this.unit(state), generation);
  }

  /** Stops the clock and the owner; closing it again later never resumes by itself. */
  pause(): void {
    this.generation++;
    clearTimeout(this.timer);
    this.wake?.();
    this.wake = undefined;
    this.running.set(false);
    this.active()?.pause();
  }

  toggle(): void {
    if (this.running()) this.pause();
    else this.run();
  }

  private async advance(controller: SimulationController, unit: AdvanceUnit, generation: number): Promise<void> {
    const token = (this.pending = Symbol('next'));
    try {
      await controller.next(unit);
    } catch (e) {
      if (generation === this.generation) this.stopReason.set((e as Error).message);
      throw e;
    } finally {
      if (this.pending === token) this.pending = undefined;
      this.revision.update((n) => n + 1);
    }
  }

  private async loop(controller: SimulationController, unit: AdvanceUnit, generation: number): Promise<void> {
    let steps = 0;
    const alive = () => generation === this.generation;
    try {
      while (alive()) {
        const before = controller.state();
        if (!before.canNext || before.status === 'waiting-input' || before.status === 'error') break;
        // A breakpoint stops the run before its instruction; starting on it takes that one step first.
        if (before.breakpoint !== undefined && steps > 0) {
          this.stopReason.set('Punto de interrupción antes de la línea ' + before.breakpoint);
          break;
        }
        if (steps++ >= RUN_STEP_LIMIT) {
          this.stopReason.set('Pausa automática: límite de ' + RUN_STEP_LIMIT + ' pasos. Inspecciona el bucle.');
          break;
        }
        await this.advance(controller, unit, generation);
        if (!alive()) return;
        const after = controller.state();
        if (!after.canNext || after.status === 'waiting-input' || after.status === 'error') break;
        await new Promise<void>((resolve) => {
          this.wake = resolve;
          this.timer = setTimeout(resolve, SPEED_DELAY[this.speed()]);
        });
      }
    } catch {
      // `advance` already left the reason on the transport.
    }
    if (alive()) {
      this.running.set(false);
      controller.pause();
    }
  }
}
