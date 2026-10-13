import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabSession } from '../../../laboratory/lab-session.service';
import { hex } from '../../../simulation/cpu8086';

/** Segment and offset arithmetic on the classic 2164A board, with the bytes shown in little-endian order. */
@Component({
  selector: 'app-memory-panel',
  imports: [FormsModule],
  templateUrl: './memory-panel.component.html',
  styleUrl: './memory-panel.component.scss',
})
export class MemoryPanelComponent {
  readonly session = inject(LabSession);
  readonly low = computed(() => this.session.state().memory[this.session.physical()] || 0);
  readonly high = computed(
    () => this.session.state().memory[(this.session.physical() + 1) % 1048576] || 0,
  );
  readonly word = computed(() => this.low() + 256 * this.high());

  h(value: number, digits = 4): string {
    return hex(value, digits);
  }

  heat(value: number): string {
    return String(value / 255);
  }
}
