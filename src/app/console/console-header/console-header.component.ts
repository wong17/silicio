import { Component, computed, inject, input } from '@angular/core';
import { LabSession } from '../../laboratory/lab-session.service';
import type { Section } from '../../world/scene-inputs';

const TITLES: Record<Section, string> = {
  atrium: 'Estaciones',
  '8086': 'Monitor 8086',
  memory: 'Memoria',
  time: 'Cronoscopio',
  apple: 'Memoria compartida',
  machine: 'Sistema',
};

/** Station title and the machine status LED shared by every experience. */
@Component({
  selector: 'app-console-header',
  templateUrl: './console-header.component.html',
  styleUrl: './console-header.component.scss',
})
export class ConsoleHeaderComponent {
  readonly session = inject(LabSession);
  readonly section = input<Section>('atrium');
  readonly title = computed(() => TITLES[this.section()]);
  readonly status = computed(() =>
    this.session.running() ? 'EJECUTANDO' : this.session.state().halted ? 'HLT' : 'EN PAUSA',
  );
}
