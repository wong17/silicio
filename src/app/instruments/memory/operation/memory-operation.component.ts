import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabSession } from '../../../laboratory/lab-session.service';
import { SimulationCoordinator } from '../../../laboratory/controllers/simulation-coordinator';
import {
  ACTIVITIES,
  ACTIVITY_LEVEL,
  LEVELS,
  RAM_STEPS,
  type MemoryActivity,
} from '../../../laboratory/memory-lesson.service';
import { hex } from '../../../simulation/cpu8086';
import type { WordFormat } from '../../../simulation/memory-lesson';

const FORMATS: readonly { id: WordFormat; label: string }[] = [
  { id: 'hex', label: 'Hexadecimal' },
  { id: 'dec', label: 'Decimal' },
  { id: 'bin', label: 'Binario' },
  { id: 'ascii', label: 'ASCII' },
];

/**
 * «Operación» of the memory chapter: which exercise, on whose data, and the one action it asks for. The
 * orientation strip says at which level of the hierarchy the exercise works.
 */
@Component({
  selector: 'app-memory-operation',
  imports: [FormsModule],
  templateUrl: './memory-operation.component.html',
  styleUrl: './memory-operation.component.scss',
})
export class MemoryOperationComponent {
  readonly session = inject(LabSession);
  readonly lesson = this.session.memoryLesson;
  private readonly coordinator = inject(SimulationCoordinator);
  readonly activities = ACTIVITIES;
  readonly levels = LEVELS;
  readonly formats = FORMATS;
  readonly ramSteps = RAM_STEPS;
  readonly current = computed(() => ACTIVITIES.find((a) => a.id === this.lesson.activity())!);
  readonly working = computed(() => ACTIVITY_LEVEL[this.lesson.activity()]);
  readonly built = this.lesson.built;
  readonly sessionRegisters = computed(() => {
    const r = this.session.shownState().registers;
    return { BX: r.BX, BP: r.BP, SI: r.SI, DI: r.DI, DS: r.DS, SS: r.SS };
  });
  readonly uses = computed(() => {
    const mode = this.lesson.modes.find((m) => m.id === this.lesson.mode());
    return mode?.bases ?? [];
  });

  h(value: number, digits = 4): string {
    return hex(value, digits);
  }

  choose(activity: MemoryActivity): void {
    this.lesson.select(activity);
    this.session.memoryModel.set(activity === 'ram' ? 'dimm' : 'classic');
    this.session.part(activity === 'ram' ? 'dimm' : activity === 'cache' ? 'bank-even' : 'bank-even');
    if (activity === 'cache' && this.coordinator.activeId() !== '8086') void this.coordinator.restart();
  }

  /** Next step of the exercise; in the 8086 session the step is an explicit edit of its memory. */
  nextStep(): void {
    if (this.lesson.origin() === 'session') this.session.advanceMemory();
    else void this.coordinator.step();
  }

  restart(): void {
    if (this.lesson.origin() === 'session') this.session.memoryLesson.reset();
    else void this.coordinator.restart();
  }

  setFormat(event: Event): void {
    this.lesson.format.set((event.target as HTMLSelectElement).value as WordFormat);
  }

  atEnd(): boolean {
    return this.lesson.step() >= this.lesson.total();
  }
}
