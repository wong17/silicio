import { Component, inject } from '@angular/core';
import { TermDirective } from '../../../shared/term.directive';
import { LabSession } from '../../../laboratory/lab-session.service';

/** The DDR4 gallery module: eight 1G×8 components form one 64-bit rank. It is not wired to the 8086. */
@Component({
  imports: [TermDirective],
  selector: 'app-dimm-panel',
  templateUrl: './dimm-panel.component.html',
  styleUrl: './dimm-panel.component.scss',
})
export class DimmPanelComponent {
  readonly session = inject(LabSession);
  readonly chips = [0, 1, 2, 3, 4, 5, 6, 7];
}
