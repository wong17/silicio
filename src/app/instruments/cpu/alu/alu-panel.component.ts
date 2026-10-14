import { Component, computed, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';
import { hex } from '../../../simulation/cpu8086';
import { explainFlag, FLAG_INFO, type FlagName } from '../../../content/flags';

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
  readonly flags = FLAG_INFO;
  /** Reason each flag holds its value after the last executed step. */
  readonly reasons = computed<Record<string, string>>(() => {
    const view = this.session.laboratory();
    const state = this.session.state();
    const cursor = this.session.cursor();
    const event = cursor >= 0 ? this.session.trace()[cursor] : undefined;
    const out: Record<string, string> = {};
    for (const f of FLAG_INFO)
      out[f.name] = explainFlag(f.name as FlagName, {
        value: state.flags[f.name],
        before: event?.before.flags[f.name],
        result: view.operation?.result,
        operands: view.operation?.operands,
        op: view.instruction?.op,
      });
    return out;
  });
  readonly carry = computed(() => this.session.state().flags.CF);
  readonly overflow = computed(() => this.session.state().flags.OF);

  h(value: number | undefined): string {
    return value === undefined ? '—' : hex(value);
  }
}
