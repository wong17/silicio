import { Component, ElementRef, computed, effect, inject, viewChild } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';
import { SCREEN_COLUMNS, SCREEN_ROWS } from '../../../simulation/x86/text-screen';

/**
 * The emulated 80×25 screen and keyboard of INT 21h. The capture field takes the keys; while the program
 * waits for one, it receives the focus. The screen follows what is shown, so stepping back erases text.
 */
@Component({
  selector: 'app-screen-panel',
  templateUrl: './screen-panel.component.html',
  styleUrl: './screen-panel.component.scss',
})
export class ScreenPanelComponent {
  readonly session = inject(LabSession);
  private readonly capture = viewChild<ElementRef<HTMLInputElement>>('capture');
  readonly columns = SCREEN_COLUMNS;
  readonly rows = computed(() => {
    const io = this.session.io();
    const lines = io.screen.split('\n');
    return Array.from({ length: SCREEN_ROWS }, (_, n) => (lines[n] ?? '').padEnd(SCREEN_COLUMNS, ' '));
  });
  readonly cursor = computed(() => {
    const at = this.session.io().cursor;
    return { row: Math.floor(at / SCREEN_COLUMNS), col: at % SCREEN_COLUMNS };
  });
  readonly waiting = this.session.waitingInput;
  readonly queued = computed(() => this.session.io().keyboard.length);
  readonly sample = computed(() => this.session.missions[this.session.missionIndex()].keys);

  constructor() {
    // A program that waits for a key takes the student straight to the keyboard.
    effect(() => {
      if (this.waiting()) queueMicrotask(() => this.capture()?.nativeElement.focus());
    });
  }

  /** Enter is the key of its own; every other character arrives through `input`, which also covers on-screen keyboards. */
  onKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    this.session.typeKeys('\n');
  }

  onInput(event: Event): void {
    const field = event.target as HTMLInputElement;
    this.session.typeKeys(field.value);
    field.value = '';
  }

  typeSample(): void {
    const keys = this.sample();
    if (keys) this.session.typeKeys(keys);
  }
}
