import { Component, inject } from '@angular/core';
import { TermDirective } from '../../../shared/term.directive';
import { LabSession } from '../../../laboratory/lab-session.service';
import { APPLE_UNITS } from '../../../content/apple-m5';

interface Unit {
  id: string;
  area: string;
  label: string;
  count: string;
  color: string;
}

/** Published M5 base units as a floor plan, plus the CPU → GPU → CPU buffer dependency. */
@Component({
  imports: [TermDirective],
  selector: 'app-apple-panel',
  templateUrl: './apple-panel.component.html',
  styleUrl: './apple-panel.component.scss',
})
export class ApplePanelComponent {
  readonly session = inject(LabSession);
  readonly units: Unit[] = APPLE_UNITS.map(({ id, area, label, count, color }) => ({ id, area, label, count, color }));
}
