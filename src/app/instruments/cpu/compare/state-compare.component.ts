import { Component, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';

/**
 * Compares two states of the 8086 that the student saved on purpose: what differs in registers, flags and memory.
 * It replaces the chronoscope's ribbon: no full list of events, only the two states and their difference.
 */
@Component({
  selector: 'app-state-compare',
  templateUrl: './state-compare.component.html',
  styleUrl: './state-compare.component.scss',
})
export class StateCompareComponent {
  readonly session = inject(LabSession);
}
