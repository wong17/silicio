import { Component, computed, input, output, signal } from '@angular/core';

/**
 * Editor of the 8×8 mosaic of gray levels (0–255) shared by the PC and the SoC. It emits the 64 values only
 * when every cell is valid, so the machine never sees a half-edited image.
 */
@Component({
  selector: 'app-tile-editor',
  templateUrl: './tile-editor.component.html',
  styleUrl: './tile-editor.component.scss',
})
export class TileEditorComponent {
  /** Values to show (64, row by row). */
  readonly values = input.required<readonly number[]>();
  readonly label = input('Mosaico de 8 × 8 niveles de gris');
  readonly disabled = input(false);
  readonly changed = output<number[]>();
  private readonly draft = signal<Record<number, string>>({});
  readonly cells = computed(() =>
    Array.from({ length: 64 }, (_, i) => {
      const typed = this.draft()[i];
      const text = typed ?? String(this.values()[i] ?? 0);
      const n = Number(text);
      return { index: i, row: Math.floor(i / 8) + 1, col: (i % 8) + 1, text, valid: /^\d{1,3}$/.test(text) && n >= 0 && n <= 255, gray: Math.min(255, Math.max(0, n || 0)) };
    }),
  );
  readonly invalid = computed(() => this.cells().filter((c) => !c.valid).length);

  edit(index: number, text: string): void {
    this.draft.update((d) => ({ ...d, [index]: text }));
    const all = this.cells();
    if (all.every((c) => c.valid)) {
      this.changed.emit(all.map((c) => Number(c.text)));
      this.draft.set({});
    }
  }

  /** The gray of a cell, with the text color that stays legible over it. */
  ink(gray: number): string {
    return gray > 140 ? '#101314' : '#f2efe6';
  }
}
