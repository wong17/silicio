import { Component, computed, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';
import { hex } from '../../../simulation/cpu8086';

const FLAG_MEANING: Record<string, string> = {
  CF: 'Acarreo o préstamo sin signo: el resultado no cupo en 16 bits.',
  PF: 'Paridad: 1 si el byte bajo tiene un número par de unos.',
  AF: 'Acarreo auxiliar entre los nibbles bajos (bits 3 y 4).',
  ZF: 'Cero: el resultado vale exactamente 0000h.',
  SF: 'Signo: copia del bit 15 del resultado.',
  OF: 'Desbordamiento con signo: el resultado cambió de signo de forma incorrecta.',
};

/** Operands, operation and result of the last instruction, plus the arithmetic flags. */
@Component({
  selector: 'app-alu-panel',
  templateUrl: './alu-panel.component.html',
  styleUrl: './alu-panel.component.scss',
})
export class AluPanelComponent {
  readonly session = inject(LabSession);
  readonly op = computed(() => this.session.laboratory().operation);
  readonly instruction = computed(() => this.session.laboratory().instruction);
  readonly flags = this.session.flagNames;
  readonly meaning = FLAG_MEANING;
  readonly carry = computed(() => this.session.state().flags.CF);
  readonly overflow = computed(() => this.session.state().flags.OF);

  h(value: number | undefined): string {
    return value === undefined ? '—' : hex(value);
  }
}
