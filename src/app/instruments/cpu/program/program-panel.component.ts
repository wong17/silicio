import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabSession } from '../../../laboratory/lab-session.service';
import { hex } from '../../../simulation/cpu8086';

/** Mission selector, editable source and the disassembly that the instruction pointer walks through. */
@Component({
  selector: 'app-program-panel',
  imports: [FormsModule],
  templateUrl: './program-panel.component.html',
  styleUrl: './program-panel.component.scss',
})
export class ProgramPanelComponent {
  readonly session = inject(LabSession);
  /** Editing on a narrow screen asks the shell to show the instrument column. */
  readonly editorFocus = output<void>();
  h(value: number, digits = 4): string {
    return hex(value, digits);
  }
}
