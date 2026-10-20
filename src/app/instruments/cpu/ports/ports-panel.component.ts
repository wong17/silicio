import { Component, computed, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';
import {
  PPI_CONTROL,
  PPI_PORT_A,
  PPI_PORT_B,
  PPI_PORT_C,
  SEGMENTS,
  digitOf,
  isConfigured,
  segmentsOn,
} from '../../../simulation/x86/ppi8255';

/**
 * The 8255 trainer in 2D: eight LEDs on port A, eight switches on port B and a seven-segment display on
 * port C. It shows the same ports the scene shows; without WebGL the switches are operated from here.
 */
@Component({
  selector: 'app-ports-panel',
  templateUrl: './ports-panel.component.html',
  styleUrl: './ports-panel.component.scss',
})
export class PortsPanelComponent {
  readonly session = inject(LabSession);
  /** Bits from the most significant (7) to the least (0), as they are written on a trainer. */
  readonly bits = [7, 6, 5, 4, 3, 2, 1, 0] as const;
  readonly segments = SEGMENTS;
  readonly ports = computed(() => this.session.io().ports);
  readonly configured = computed(() => isConfigured(this.ports()));
  readonly a = computed(() => this.ports()?.[PPI_PORT_A] ?? 0);
  readonly b = computed(() => this.session.io().ports?.[PPI_PORT_B] ?? this.session.switches());
  readonly c = computed(() => this.ports()?.[PPI_PORT_C] ?? 0);
  readonly control = computed(() => this.ports()?.[PPI_CONTROL]);
  readonly lit = computed(() => segmentsOn(this.c()));
  readonly digit = computed(() => digitOf(this.c()));

  h(value: number | undefined): string {
    return value === undefined ? '—' : value.toString(16).toUpperCase().padStart(2, '0') + 'h';
  }

  on(value: number, bit: number): boolean {
    return ((value >> bit) & 1) === 1;
  }

  toggle(bit: number): void {
    this.session.setSwitches(this.session.switches() ^ (1 << bit));
  }

  segmentOn(name: string): boolean {
    return (this.lit() as readonly string[]).includes(name);
  }
}
