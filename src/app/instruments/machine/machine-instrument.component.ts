import { Component, computed, inject, signal } from '@angular/core';
import { LabSession } from '../../laboratory/lab-session.service';
import { MachineExperiment } from '../machine-experiment';

/** Conceptual machine: read a value, add five, write it back and send it to the output. */
@Component({
  selector: 'app-machine-instrument',
  templateUrl: './machine-instrument.component.html',
  styleUrl: './machine-instrument.component.scss',
})
export class MachineInstrumentComponent {
  readonly session = inject(LabSession);
  readonly experiment = new MachineExperiment();
  private readonly revision = signal(0);
  readonly steps = [
    'En espera',
    'Seleccionar dirección 0000h',
    'Activar lectura',
    'RAM → CPU: 0007h',
    'ALU: 7 + 5 = 12',
    'Seleccionar dirección 0001h',
    'Activar escritura',
    'CPU → RAM: 000Ch',
    'RAM → salida: 000Ch',
  ];
  /** Bus line that carries the value at each stage; empty when nothing moves. */
  readonly channels = ['', 'address', 'control', 'data', 'data', 'address', 'control', 'data', 'control'];
  readonly stage = computed(() => {
    this.revision();
    return this.experiment.stage;
  });
  readonly activeChannel = computed(() => this.channels[this.stage()] || '');

  h(n: number): string {
    return n.toString(16).toUpperCase().padStart(4, '0');
  }

  advance(): void {
    this.experiment.advance();
    this.revision.update((v) => v + 1);
    this.session.transferBus(this.channels[this.stage()] || 'address');
  }

  reset(): void {
    this.experiment.reset();
    this.revision.update((v) => v + 1);
  }
}
