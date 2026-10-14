import { Component, computed, inject, output, signal } from '@angular/core';
import { INSTRUMENT_PARTS, LabSession } from '../../laboratory/lab-session.service';

/** How long an action reads as busy: the camera or chip transition it starts takes about this long. */
export const ACTION_BUSY_MS = 700;

/**
 * Card of the selected piece: its name, what it is for and the actions that apply to it. Choosing which
 * piece is selected happens in the piece tray, the bench map or the 3D view; all of them write the same
 * `activePart`, so this card only reads it.
 */
@Component({
  selector: 'app-piece-inspector',
  templateUrl: './piece-inspector.component.html',
  styleUrl: './piece-inspector.component.scss',
})
export class PieceInspectorComponent {
  readonly session = inject(LabSession);
  readonly focus = output<void>();
  readonly aim = output<void>();
  /** Name of the action in progress; a second activation of any action is ignored until it ends. */
  readonly busy = signal<string | null>(null);
  readonly name = computed(() => {
    const id = this.session.activePart();
    return this.session.catalogPieces().find((p) => p.id === id)?.name ?? id.replaceAll('-', ' ');
  });
  /** An internal piece lives under the lid, so its card offers to open the chip. */
  readonly internal = computed(() => INSTRUMENT_PARTS.includes(this.session.activePart()));
  readonly chipStation = computed(() => ['8086', 'apple'].includes(this.session.section()));
  readonly chipOpen = computed(() => this.session.exploded() && this.session.explodeAmount() > 0);

  act(action: 'focus' | 'aim' | 'chip'): void {
    if (this.busy()) return;
    this.busy.set(action);
    if (action === 'focus') this.focus.emit();
    else if (action === 'aim') this.aim.emit();
    else this.toggleChip();
    setTimeout(() => this.busy.set(null), this.session.reduced() ? 0 : ACTION_BUSY_MS);
  }

  toggleChip(): void {
    if (this.chipOpen()) {
      this.session.exploded.set(false);
    } else {
      this.session.exploded.set(true);
      if (this.session.explodeAmount() === 0) this.session.explodeAmount.set(100);
    }
  }

  setAmount(value: string): void {
    const amount = Math.min(100, Math.max(0, Number(value) || 0));
    this.session.explodeAmount.set(amount);
    this.session.exploded.set(amount > 0);
  }
}
