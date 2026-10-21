import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, untracked } from '@angular/core';
import { LabSession } from '../../laboratory/lab-session.service';
import { timeline8086, timelinePc, type StepCard, type StepTimeline } from '../../laboratory/step-timeline';

const ROLES = {
  processing: 'Procesamiento',
  storage: 'Almacenamiento',
  transfer: 'Transferencia',
  control: 'Control',
} as const;
const BUS = { address: 'Dirección', data: 'Dato', control: 'Control' } as const;

/**
 * «Paso a paso»: the step on screen as a list of cards, each with everything it needs (what happens, the route
 * and bus lines, what changed and the whole state right after it). The active card is open and follows the
 * simulation; choosing another card shows it without executing anything. One viewer serves the 8086 and the PC.
 */
@Component({
  selector: 'app-step-viewer',
  templateUrl: './step-viewer.component.html',
  styleUrl: './step-viewer.component.scss',
})
export class StepViewerComponent {
  readonly session = inject(LabSession);
  private readonly pc = this.session.pc;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private stateTimer?: ReturnType<typeof setTimeout>;
  readonly roles = ROLES;
  readonly bus = BUS;
  /** The student scrolled by hand: the viewer stops following until the next step. */
  readonly paused = signal(false);

  readonly timeline = computed<StepTimeline | undefined>(() => {
    if (this.session.section() === 'machine') {
      this.pc.revision();
      const events = this.pc.events();
      if (!events.length) return undefined;
      return timelinePc(this.pc.before() ?? this.pc.state(), this.pc.state(), events, 'Paso ' + this.pc.stepCount());
    }
    const presentation = this.session.presentation();
    return presentation ? timeline8086(presentation, 'Instrucción ' + (this.session.cursor() + 1)) : undefined;
  });

  /** The card the simulation is showing: a chosen phase or transfer, or the last one once the step is whole. */
  readonly active = computed(() => {
    const t = this.timeline();
    if (!t) return -1;
    const chosen = this.session.section() === 'machine' ? this.pc.focus() : this.session.explaining();
    return Math.min(chosen ?? t.cards.length - 1, t.cards.length - 1);
  });

  readonly waiting = computed(() => (this.session.section() === 'machine' ? this.pc.waiting() : this.session.waitingInput()));
  readonly next = computed(() => {
    const t = this.timeline();
    const at = this.active();
    if (!t) return '';
    return at < t.cards.length - 1 ? 'Siguiente: ' + t.cards[at + 1].title : 'Siguiente: la instrucción que sigue';
  });
  readonly announcement = computed(() => {
    const t = this.timeline();
    const card = t?.cards[this.active()];
    return t && card ? t.title + ', paso ' + card.number + ': ' + card.title + '. ' + card.text : '';
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    const injector = inject(Injector);
    const hold = () => this.paused.set(true);
    afterNextRender(() => {
      const el = this.host.nativeElement;
      el.addEventListener('wheel', hold, { passive: true });
      el.addEventListener('touchmove', hold, { passive: true });
      destroyRef.onDestroy(() => {
        clearTimeout(this.stateTimer);
        el.removeEventListener('wheel', hold);
        el.removeEventListener('touchmove', hold);
      });
    });
    // A new step or a different card brings the viewer back to following.
    effect(() => {
      this.timeline();
      this.active();
      untracked(() => {
        this.paused.set(false);
        // The cards open and close while this change renders; follow once the new layout is in place.
        afterNextRender(() => this.follow(), { injector });
      });
    });
  }

  /** Brings the active card to a steady place in the scrolling area that holds the viewer. */
  follow(): void {
    this.paused.set(false);
    const card = this.host.nativeElement.querySelector<HTMLElement>('[aria-current="step"]');
    if (!card) return;
    const behavior = this.session.reduced() ? 'auto' : 'smooth';
    const scroller = scrollParent(card);
    if (scroller) {
      const head = this.host.nativeElement.querySelector<HTMLElement>('.head')?.offsetHeight ?? 0;
      const at = card.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTo({ top: Math.max(0, at - head - 8), behavior });
    }
    // The state column redraws as the phase changes; move it once that has settled so the scroll is not cut short.
    clearTimeout(this.stateTimer);
    this.stateTimer = setTimeout(() => this.followState(behavior), 150);
  }

  /**
   * The state column goes where this step looks: the ALU while the operation runs, the register that changed
   * while the result is stored, the block of the component that acts on the PC. Only when that column scrolls on
   * its own (wide desk); stacked, the panel is one page and moving it would pull the steps out of sight.
   */
  private followState(behavior: ScrollBehavior): void {
    const t = this.timeline();
    const card = t?.cards[this.active()];
    const column = this.host.nativeElement.querySelector<HTMLElement>('.col.right');
    if (!t || !card || !column) return;
    const style = getComputedStyle(column);
    if (!(style.overflowY === 'auto' || style.overflowY === 'scroll') || column.scrollHeight <= column.clientHeight) return;
    const target = t.kind === 'machine' ? pcTarget(column, card) : cpuTarget(column, card);
    const at = target ? target.getBoundingClientRect().top - column.getBoundingClientRect().top + column.scrollTop : 0;
    slideTo(column, Math.max(0, at - 8), behavior === 'auto');
  }

  choose(card: StepCard): void {
    if (this.session.section() === 'machine') this.pc.follow(card.index);
    else this.session.explainAt(card.index);
  }

  status(index: number): 'done' | 'active' | 'pending' {
    const at = this.active();
    return index < at ? 'done' : index === at ? 'active' : 'pending';
  }

  /** One line for a finished card: its first change, or nothing. */
  summary(card: StepCard): string {
    const c = card.changes[0];
    return c ? c.label + ' ' + c.before + ' a ' + c.after : '';
  }
}

/** Moves a scroll area to `top` over a quarter of a second (the native smooth scroll is cut short by the redraws). */
function slideTo(el: HTMLElement, top: number, instant: boolean): void {
  const from = el.scrollTop;
  if (instant || Math.abs(top - from) < 2) {
    el.scrollTop = top;
    return;
  }
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / 250);
    el.scrollTop = from + (top - from) * (1 - Math.pow(1 - t, 3));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function cpuTarget(column: HTMLElement, card: StepCard): HTMLElement | null {
  switch (card.id) {
    case 'exec-run':
      return column.querySelector('app-alu-panel');
    case 'fetch-increment':
    case 'exec-store':
      return column.querySelector('.cell.changed') ?? column.querySelector('app-register-panel');
    default:
      return column.querySelector('app-register-panel');
  }
}

function pcTarget(column: HTMLElement, card: StepCard): HTMLElement | null {
  const block = (name: string) => column.querySelector<HTMLElement>('[data-block="' + name + '"]');
  const pieces = card.pieces;
  if (pieces.some((p) => p === 'monitor' || p === 'display-engine')) return block('monitor');
  if (pieces.some((p) => p === 'ssd' || p === 'storage-controller')) return block('ssd');
  if (pieces.some((p) => p === 'keyboard' || p === 'keyboard-controller' || p === 'interrupt-controller')) return block('irq');
  if (pieces.some((p) => p === 'ram' || p === 'rom' || p === 'memory-controller')) return block('ram');
  return block('cpu');
}

function scrollParent(from: HTMLElement): HTMLElement | undefined {
  for (let el = from.parentElement; el; el = el.parentElement) {
    const overflow = getComputedStyle(el).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) return el;
  }
  return undefined;
}
