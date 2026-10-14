import { Component, computed, effect, inject, input, OnDestroy, output, signal, untracked } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';
import type { PieceDefinition } from '../../interaction-registry';
import { groupPieces, type TrayFamily, type TrayItem } from '../../piece-families';

/** Renders one piece to a small picture; null means the scene cannot (no WebGL, or the piece is not drawn). */
export type Thumbnailer = (id: string, size: number) => Promise<Blob | null>;

/** The 40 DIP pins as two rows: the top row runs 40..21, the bottom row 1..20, as seen from above. */
export function dipRows(members: PieceDefinition[]): { top: PieceDefinition[]; bottom: PieceDefinition[] } {
  const byIndex = [...members].sort((a, b) => (a.family?.index ?? 0) - (b.family?.index ?? 0));
  const half = Math.ceil(byIndex.length / 2);
  return { bottom: byIndex.slice(0, half), top: byIndex.slice(half).reverse() };
}

/**
 * Drawer of pieces: model or bench, repeated pieces folded into a family card that opens a selector with
 * the real shape. Every card is a button with a Spanish name, so it works without the 3D view.
 */
@Component({
  selector: 'app-piece-tray',
  templateUrl: './piece-tray.component.html',
  styleUrl: './piece-tray.component.scss',
})
export class PieceTrayComponent implements OnDestroy {
  readonly session = inject(LabSession);
  readonly thumbnailer = input<Thumbnailer | null>(null);
  readonly picked = output<string>();
  readonly focused = output<string>();
  readonly scope = signal<'model' | 'bench'>('model');
  readonly openFamily = signal<string | null>(null);
  /** Object URLs of rendered thumbnails by piece id; empty means every card shows its glyph. */
  readonly pictures = signal<Record<string, string>>({});
  private requested = new Set<string>();
  private urls: string[] = [];
  private generation = 0;

  readonly pieces = computed(() =>
    this.session.catalogPieces().filter((p) => (p.scope ?? 'model') === this.scope()),
  );
  readonly items = computed<TrayItem[]>(() => groupPieces(this.pieces() as PieceDefinition[]));
  readonly family = computed<TrayFamily | undefined>(() => {
    const id = this.openFamily();
    return this.items().find((i): i is TrayFamily => i.kind === 'family' && i.id === id);
  });
  readonly rows = computed(() => {
    const f = this.family();
    return f && f.layout === 'dip40' ? dipRows(f.members) : undefined;
  });

  constructor() {
    // A different station or catalogue drops every picture: nothing outlives the model it came from.
    effect(() => {
      this.session.section();
      this.session.catalogPieces();
      untracked(() => this.release());
    });
    effect(() => {
      const load = this.thumbnailer();
      const reduced = this.session.reduced();
      const items = this.items();
      untracked(() => {
        if (!load || reduced) return;
        const generation = this.generation;
        for (const item of items) {
          const id = item.kind === 'piece' ? item.piece.id : item.members[0].id;
          if (this.requested.has(id)) continue;
          this.requested.add(id);
          void load(id, 128).then((blob) => {
            if (!blob || generation !== this.generation) return;
            const url = URL.createObjectURL(blob);
            this.urls.push(url);
            this.pictures.update((p) => ({ ...p, [id]: url }));
          });
        }
      });
    });
  }

  private release(): void {
    this.generation++;
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls = [];
    this.requested.clear();
    this.pictures.set({});
    this.openFamily.set(null);
  }

  ngOnDestroy(): void {
    this.release();
  }

  pictureOf(item: TrayItem): string | undefined {
    const id = item.kind === 'piece' ? item.piece.id : item.members[0].id;
    return this.pictures()[id];
  }

  nameOf(item: TrayItem): string {
    return item.kind === 'piece' ? item.piece.name : item.label;
  }

  /** Two letters for the glyph shown when there is no picture. */
  initials(name: string): string {
    const words = name
      .replace(/[^\p{L}\p{N} ]/gu, '')
      .split(' ')
      .filter(Boolean);
    return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
  }

  isSelected(item: TrayItem): boolean {
    const active = this.session.activePart();
    return item.kind === 'piece' ? item.piece.id === active : item.members.some((m) => m.id === active);
  }

  choose(item: TrayItem): void {
    if (item.kind === 'family') {
      this.openFamily.set(this.openFamily() === item.id ? null : item.id);
      return;
    }
    this.picked.emit(item.piece.id);
  }

  pickMember(id: string): void {
    this.picked.emit(id);
  }

  /** Arrow keys move between cards; there is a single tab stop for the whole list. */
  arrow(event: KeyboardEvent): void {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    if (!keys.includes(event.key)) return;
    const host = event.currentTarget as HTMLElement;
    const cards = [...host.querySelectorAll<HTMLElement>('[role="option"]')];
    const at = cards.indexOf(document.activeElement as HTMLElement);
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const next = cards[(Math.max(0, at) + step + cards.length) % cards.length];
    if (!next) return;
    event.preventDefault();
    next.focus();
  }

  /** Number shown on a member button of a family selector. */
  label(m: PieceDefinition): string {
    const index = m.family?.index ?? 0;
    return m.family?.layout === 'dip40' || m.family?.layout === 'timeline' ? String(index + 1) : String(index);
  }
}
