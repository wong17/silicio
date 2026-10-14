import { Component, computed, inject, signal } from '@angular/core';
import { readScope, scopePath, T_STATES, type Channel, type ScopeReading } from '../../../content/scope';
import { LabSession } from '../../../laboratory/lab-session.service';

const CHANNELS = ['ALE', 'RD', 'WR'] as const;

/** Didactic capture of the bus lines for the last instruction. Shapes are steps, not measured timings. */
@Component({
  selector: 'app-signal-panel',
  templateUrl: './signal-panel.component.html',
  styleUrl: './signal-panel.component.scss',
})
export class SignalPanelComponent {
  readonly session = inject(LabSession);
  readonly channels = CHANNELS;
  readonly states = T_STATES;
  /** Step the cursor reads, 0 to 3. */
  readonly cursor = signal(0);
  /** A frozen copy of the trace, to compare with the next instruction. */
  readonly captured = signal<{ channel: Channel; path: string; step: ScopeReading; label: string } | null>(null);
  readonly trace = computed(() =>
    scopePath(this.session.signalChannel() as Channel, this.session.lastReads(), this.session.lastWrites()),
  );
  readonly reading = computed(() =>
    readScope(
      this.session.signalChannel() as Channel,
      this.session.lastReads(),
      this.session.lastWrites(),
      this.cursor(),
    ),
  );
  /** Horizontal position of the cursor line over the scope. */
  readonly cursorX = computed(() => 20 + this.cursor() * 70 + 35);

  capture(): void {
    this.captured.set({
      channel: this.session.signalChannel() as Channel,
      path: this.trace(),
      step: this.reading(),
      label: this.session.laboratory().instruction?.text ?? 'sin instrucción',
    });
  }

  clearCapture(): void {
    this.captured.set(null);
  }

  setCursor(value: string): void {
    this.cursor.set(Math.min(3, Math.max(0, Number(value) || 0)));
  }
}
