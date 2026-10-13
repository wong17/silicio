import { Component, EventEmitter, Output, signal } from '@angular/core';
import { MachineExperiment } from './machine-experiment';
@Component({
  selector: 'app-machine-instrument',
  templateUrl: './machine-instrument.html',
  styleUrl: './machine-instrument.scss',
})
export class MachineInstrumentComponent {
  @Output() transfer = new EventEmitter<string>();
  readonly experiment = new MachineExperiment();
  readonly revision = signal(0);
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
  readonly channels = [
    '',
    'address',
    'control',
    'data',
    'data',
    'address',
    'control',
    'data',
    'control',
  ];
  get stage() {
    this.revision();
    return this.experiment.stage;
  }
  h(n: number) {
    return n.toString(16).toUpperCase().padStart(4, '0');
  }
  advance() {
    this.experiment.advance();
    this.revision.update((v) => v + 1);
    this.transfer.emit(this.channels[this.stage] || 'address');
  }
  reset() {
    this.experiment.reset();
    this.revision.update((v) => v + 1);
  }
}
