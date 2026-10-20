import { Component, computed, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';
import { COURSE_PHASES } from '../../../laboratory/step-presentation';

/**
 * The instruction on screen explained with its real values: one sentence, the seven steps of the cycle and
 * what changed (before → after). Choosing a step shows its detail; nothing is executed again.
 */
@Component({
  selector: 'app-phases',
  templateUrl: './phases.component.html',
  styleUrl: './phases.component.scss',
})
export class PhasesComponent {
  readonly session = inject(LabSession);
  readonly step = this.session.presentation;
  readonly phases = COURSE_PHASES;
  readonly current = computed(() => {
    const at = this.session.explaining();
    return at === undefined ? undefined : this.step()?.phases[at];
  });
  readonly label = computed(() => 'Instrucción ' + (this.session.cursor() + 1));

  show(index: number): void {
    this.session.explainAt(index);
  }
}
