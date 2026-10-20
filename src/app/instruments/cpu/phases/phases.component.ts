import { Component, computed, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';
import { PHASE_LABEL, PHASES, type Phase } from '../../../laboratory/station-activity';

/** The four phases of the instruction on screen, with a sentence on what the machine does in each. */
@Component({
  selector: 'app-phases',
  templateUrl: './phases.component.html',
  styleUrl: './phases.component.scss',
})
export class PhasesComponent {
  readonly session = inject(LabSession);
  readonly phases = PHASES.map((id) => ({ id, label: PHASE_LABEL[id] }));
  readonly summary = computed(() => {
    const a = this.session.activity();
    const hexw = (n: number | undefined, d = 5) => (n === undefined ? '' : n.toString(16).toUpperCase().padStart(d, '0') + 'h');
    switch (a.phase) {
      case 'fetch':
        return `La BIU pone ${hexw(a.address)} en el bus y ALE lo retiene; trae ${a.bytes.length} byte(s) a la cola.`;
      case 'decode':
        return `El control reconoce ${a.mnemonic}.`;
      case 'execute':
        return `La ALU opera con los registros${a.changed.length ? ': cambia ' + a.changed.join(', ') : ''}.`;
      case 'write':
        return a.wr
          ? `WR escribe ${hexw(a.data, 2)} en ${hexw(a.address)}.`
          : a.rd
            ? `RD lee ${hexw(a.data, 2)} de ${hexw(a.address)}.`
            : 'Esta instrucción no accede a la memoria en esta fase.';
      default:
        return 'Ejecuta un paso y recorre sus fases.';
    }
  });

  show(phase: Phase): void {
    this.session.showPhase(phase);
  }
}
