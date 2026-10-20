import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { WorkspaceService } from './workspace.service';
import { SceneViewportService } from './scene-viewport.service';
import { clampFloat, type Placement, type Rect } from './workspace-layout';

let nextId = 0;

/**
 * One instrument in the desk: title bar with minimize, maximize and a «Mover a» menu, and its content.
 * Its place comes from the arrangement; moving it only changes the style, so the content keeps its state.
 */
@Component({
  selector: 'app-instrument-window',
  templateUrl: './instrument-window.component.html',
  styleUrl: './instrument-window.component.scss',
  host: {
    '[attr.data-panel]': 'panelId()',
    '[attr.data-zone]': 'placement().zone',
    '[class.flow]': "mode() === 'flow'",
    '[class.maximized]': 'maximized()',
    '[class.dragging]': 'dragRect() !== null',
    '[style.left.px]': "mode() === 'absolute' ? rect().x : null",
    '[style.top.px]': "mode() === 'absolute' ? rect().y : null",
    '[style.width.px]': "mode() === 'absolute' ? rect().width : null",
    '[style.height.px]': "mode() === 'absolute' ? rect().height : null",
  },
})
export class InstrumentWindowComponent {
  readonly panelId = input.required<string>();
  readonly title = input.required<string>();
  readonly placement = input.required<Placement>();
  readonly mode = input<'absolute' | 'flow'>('absolute');
  readonly maximized = input(false);

  readonly ws = inject(WorkspaceService);
  private readonly viewport = inject(SceneViewportService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');

  readonly headingId = `window-title-${nextId++}`;
  readonly menuOpen = signal(false);
  /** Live rectangle while the title bar is dragged; committed to the layout on release. */
  readonly dragRect = signal<Rect | null>(null);
  readonly rect = computed(() => this.dragRect() ?? this.placement().rect);
  readonly floating = computed(() => this.placement().zone === 'float' && this.mode() === 'absolute');
  readonly canFloat = computed(() => this.mode() === 'absolute');
  private drag?: { pointer: number; startX: number; startY: number; origin: Rect; resize: boolean };

  constructor() {
    effect(() => {
      const request = this.ws.focusRequest();
      if (request?.id !== untracked(this.panelId)) return;
      setTimeout(() => this.frame().nativeElement.focus({ preventScroll: true }), 0);
    });
    // A floating window covers the scene: the camera has to know where it is.
    effect((onCleanup) => {
      if (!this.floating()) return;
      untracked(() => this.viewport.register(this.host));
      onCleanup(() => this.viewport.unregister(this.host));
    });
    effect(() => {
      this.rect();
      untracked(() => this.viewport.refresh());
    });
  }

  minimize(): void {
    this.menuOpen.set(false);
    this.ws.minimize(this.panelId());
  }

  toggleMaximize(): void {
    this.ws.maximize(this.maximized() ? null : this.panelId());
  }

  moveTo(zone: 'bottom' | 'right' | 'float'): void {
    this.menuOpen.set(false);
    if (zone === 'float') this.ws.float(this.panelId());
    else this.ws.dock(this.panelId(), zone);
    this.ws.focusRequest.set({ id: this.panelId(), seq: Date.now() });
  }

  close(): void {
    this.menuOpen.set(false);
    this.ws.close(this.panelId());
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    if (this.menuOpen()) setTimeout(() => this.menu()?.nativeElement.querySelector<HTMLElement>('button')?.focus(), 0);
  }

  closeMenu(returnFocus = true): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (returnFocus) this.menuButton()?.nativeElement.focus();
  }

  @HostListener('keydown.escape', ['$event'])
  escape(event: Event): void {
    if (!this.menuOpen()) return;
    event.stopPropagation();
    this.closeMenu();
  }

  @HostListener('document:pointerdown', ['$event'])
  outside(event: PointerEvent): void {
    if (!this.menuOpen()) return;
    const target = event.target as Node | null;
    if (target && this.menu()?.nativeElement.contains(target)) return;
    if (target && this.menuButton()?.nativeElement.contains(target)) return;
    this.closeMenu(false);
  }

  /** Dragging the title bar of a floating window moves it; the corner grip resizes it. */
  pointerDown(event: PointerEvent, resize = false): void {
    if (!this.floating() || event.button !== 0) return;
    if (!resize && (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.drag = { pointer: event.pointerId, startX: event.clientX, startY: event.clientY, origin: this.rect(), resize };
    this.dragRect.set(this.rect());
  }

  pointerMove(event: PointerEvent): void {
    const d = this.drag;
    if (!d || d.pointer !== event.pointerId) return;
    const dx = event.clientX - d.startX,
      dy = event.clientY - d.startY;
    const next = d.resize
      ? { ...d.origin, width: d.origin.width + dx, height: d.origin.height + dy }
      : { ...d.origin, x: d.origin.x + dx, y: d.origin.y + dy };
    this.dragRect.set(clampFloat(next, this.ws.area()));
  }

  pointerUp(event: PointerEvent): void {
    const d = this.drag;
    if (!d || d.pointer !== event.pointerId) return;
    this.drag = undefined;
    const rect = this.dragRect();
    this.dragRect.set(null);
    if (rect) this.ws.float(this.panelId(), rect);
  }

  /** Keyboard alternative to dragging: arrows move by 16 px, Shift+arrows resize. */
  handleKey(event: KeyboardEvent): void {
    const step = 16;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const r = this.rect();
    const next = event.shiftKey
      ? { ...r, width: r.width + move[0], height: r.height + move[1] }
      : { ...r, x: r.x + move[0], y: r.y + move[1] };
    this.ws.float(this.panelId(), clampFloat(next, this.ws.area()));
  }
}
