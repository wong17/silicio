import { Component, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';

/** Step, back and run controls for the 8086 timeline, with the machine state as a LED. */
@Component({
  selector: 'app-transport',
  templateUrl: './transport.component.html',
  styleUrl: './transport.component.scss',
})
export class TransportComponent {
  readonly session = inject(LabSession);
}
