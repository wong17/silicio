import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabSession } from '../../../laboratory/lab-session.service';
import type { Registers } from '../../../simulation/cpu8086';

/** Register groups for the selector; labels follow the 8086 programmer's model. */
export const REGISTER_GROUPS: { label: string; names: (keyof Registers)[] }[] = [
  { label: 'Datos', names: ['AX', 'BX', 'CX', 'DX'] },
  { label: 'Punteros e índices', names: ['SP', 'BP', 'SI', 'DI'] },
  { label: 'Segmentos', names: ['CS', 'DS', 'SS', 'ES'] },
  { label: 'Control', names: ['IP'] },
];
export const REGISTER_TITLES: Record<string, string> = {
  AX: 'Acumulador', BX: 'Base', CX: 'Contador', DX: 'Datos',
  SP: 'Puntero de pila', BP: 'Puntero base', SI: 'Índice fuente', DI: 'Índice destino',
  CS: 'Segmento de código', DS: 'Segmento de datos', SS: 'Segmento de pila', ES: 'Segmento extra',
  IP: 'Puntero de instrucción',
};
/** Sixteen-bit register as a row of switchable LEDs; changed bits flash when a step moves them. */
@Component({
  selector: 'app-register-panel',
  imports: [FormsModule],
  templateUrl: './register-panel.component.html',
  styleUrl: './register-panel.component.scss',
})
export class RegisterPanelComponent {
  readonly groups = REGISTER_GROUPS;
  readonly titles = REGISTER_TITLES;
  readonly session = inject(LabSession);
  readonly selected = signal<keyof Registers>('AX');
  readonly selectedBit = signal(0);
  readonly names = this.session.registerNames;
  readonly view = computed(() => {
    this.session.revision();
    return this.session.laboratory().registers.find((r) => r.name === this.selected())!;
  });
  /** Bit positions from most significant (15) to least significant (0), grouped by nibble. */
  readonly positions = Array.from({ length: 16 }, (_, i) => 15 - i);
  readonly delta = computed(() => {
    const view = this.view();
    const cursor = this.session.cursor();
    const before = cursor >= 0 ? this.session.trace()[cursor]?.before.registers[view.name] : undefined;
    if (before === undefined) return undefined;
    return view.value - before;
  });

  bitOn(position: number): boolean {
    return ((this.view().value >>> position) & 1) === 1;
  }

  changed(position: number): boolean {
    return ((this.view().changedMask >>> position) & 1) === 1;
  }

  selectBit(position: number): void {
    this.selectedBit.set(position);
  }

  /** Clicking a LED flips that bit in the 8086 state, like setting a switch on the bench. */
  toggleBit(position: number): void {
    this.selectedBit.set(position);
    const next = (this.view().value ^ (1 << position)) & 0xffff;
    this.session.editRegister(this.selected(), next.toString(16).padStart(4, '0'));
  }

  signed(value: number): string {
    return (value > 0 ? '+' : '') + value;
  }
}
