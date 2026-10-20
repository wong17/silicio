import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SimulationCoordinator } from '../../laboratory/controllers/simulation-coordinator';
import {
  CONTROLLER_LABEL,
  SPEED_DELAY,
  UNIT_LABEL,
  type AdvanceUnit,
  type PlaybackStatus,
  type Speed,
} from '../../laboratory/controllers/simulation-controller';
import { LessonContext } from '../../laboratory/lesson-context.service';

const STATUS_LABEL: Record<PlaybackStatus, string> = {
  ready: 'LISTO',
  running: 'EJECUTANDO',
  paused: 'EN PAUSA',
  'waiting-input': 'ESPERANDO',
  finished: 'FINALIZADO',
  error: 'ERROR',
};
const SPEEDS: readonly { id: Speed; label: string }[] = [
  { id: 'slow', label: 'Lento' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Rápido' },
];

/**
 * The one bar that drives the simulation of the exercise on screen: restart, back, step, run and the
 * didactic speed, with the reason when the exercise cannot go on. It owns no clock; the coordinator does.
 */
@Component({
  selector: 'app-simulation-transport',
  templateUrl: './simulation-transport.component.html',
  styleUrl: './simulation-transport.component.scss',
})
export class SimulationTransportComponent {
  readonly coordinator = inject(SimulationCoordinator);
  readonly lesson = inject(LessonContext);
  private readonly router = inject(Router);
  readonly speeds = SPEEDS;
  readonly state = this.coordinator.transport;
  readonly statusLabel = computed(() => STATUS_LABEL[this.state()?.status ?? 'ready']);
  readonly running = this.coordinator.running;
  readonly unitOptions = computed(() => (this.state()?.units ?? []).map((id) => ({ id, label: UNIT_LABEL[id] })));
  readonly speedHint = computed(() => SPEED_DELAY[this.coordinator.speed()] + ' ms entre pasos');
  readonly owner = computed(() => {
    const id = this.coordinator.activeId();
    return id ? CONTROLLER_LABEL[id] : '';
  });

  step(): void {
    void this.coordinator.step();
  }
  back(): void {
    void this.coordinator.back();
  }
  restart(): void {
    void this.coordinator.restart();
  }
  toggle(): void {
    this.coordinator.toggle();
  }
  setSpeed(event: Event): void {
    this.coordinator.setSpeed((event.target as HTMLSelectElement).value as Speed);
  }
  setGrain(event: Event): void {
    this.coordinator.setGrain((event.target as HTMLSelectElement).value as AdvanceUnit);
  }
  /** «Volver al paso»: back to the view that holds the exercise. */
  backToStep(): void {
    const home = this.lesson.home();
    if (home) void this.router.navigateByUrl('/' + home);
  }
}
