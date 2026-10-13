import { Component, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';
import { hex } from '../../../simulation/cpu8086';

/** Timeline of executed steps: click a node to restore it, compare with a saved state, or revisit a branch. */
@Component({
  selector: 'app-trace-panel',
  templateUrl: './trace-panel.component.html',
  styleUrl: './trace-panel.component.scss',
})
export class TracePanelComponent {
  readonly session = inject(LabSession);
  h(value: number, digits = 4): string {
    return hex(value, digits);
  }
  editDs(text: string): void {
    this.session.editRegister('DS', text);
  }
}
