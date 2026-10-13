import { Component, computed, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';

const CHANNELS = ['ALE', 'RD', 'WR'] as const;

/** Didactic capture of the bus lines for the last instruction. Shapes are steps, not measured timings. */
@Component({
  selector: 'app-signal-panel',
  templateUrl: './signal-panel.component.html',
  styleUrl: './signal-panel.component.scss',
})
export class SignalPanelComponent {
  readonly session = inject(LabSession);
  readonly channels = CHANNELS;
  readonly trace = computed(() => {
    const channel = this.session.signalChannel();
    if (channel === 'ALE') return 'M20 70h20V25h50v45h210';
    if (channel === 'RD' && this.session.lastReads()) return 'M20 25h110v45h80V25h90';
    if (channel === 'WR' && this.session.lastWrites()) return 'M20 25h110v45h80V25h90';
    return 'M20 25h280';
  });
}
