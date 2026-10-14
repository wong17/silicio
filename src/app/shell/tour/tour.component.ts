import { Component, computed, input, output } from '@angular/core';
import { TOUR, type TourStep } from '../../content/tour';

/** Exhibition mode card: where the talk is, the support line of the step and the way forward. */
@Component({
  selector: 'app-tour',
  template: `
    @if (step(); as s) {
      <aside class="tour" data-occludes role="dialog" aria-label="Modo exposición" aria-live="polite">
        <p class="meta">
          <span>{{ s.slot }}</span>
          <span>Paso {{ position() + 1 }} de {{ total }}</span>
        </p>
        <h2>{{ s.title }}</h2>
        <p class="line">{{ s.line }}</p>
        <div class="actions">
          <button type="button" [disabled]="position() === 0" (click)="previous.emit()">Anterior</button>
          <button type="button" class="primary" (click)="position() + 1 >= total ? close.emit() : next.emit()">
            {{ position() + 1 >= total ? 'Terminar' : 'Siguiente' }}
          </button>
          <button type="button" (click)="close.emit()">Salir</button>
        </div>
        <p class="keys">Flechas o barra espaciadora · Esc para salir</p>
      </aside>
    }
  `,
  styles: `
    .tour {
      position: absolute;
      left: 50%;
      bottom: 100px;
      z-index: 9;
      width: min(560px, calc(100% - 24px));
      transform: translateX(-50%);
      padding: 14px 16px;
      border: 1px solid #d7ac6f;
      border-radius: 12px;
      background: rgba(12, 14, 15, 0.95);
      color: #e3ded2;
      display: grid;
      gap: 8px;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      margin: 0;
      font: 500 11px 'IBM Plex Mono', monospace;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #a4aaa0;
    }
    h2 {
      margin: 0;
      font: 600 28px/1.05 'Barlow Condensed', sans-serif;
      color: #f0d29c;
    }
    .line {
      margin: 0;
      font-size: 16px;
      line-height: 1.5;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      button {
        min-height: 44px;
        min-width: 44px;
        padding: 8px 14px;
      }
      .primary {
        border-color: #d7ac6f;
        background: #3a3224;
        color: #f0d29c;
      }
    }
    .keys {
      margin: 0;
      font-size: 12px;
      color: #a4aaa0;
    }
  `,
})
export class TourComponent {
  readonly index = input<number | null>(null);
  readonly next = output<void>();
  readonly previous = output<void>();
  readonly close = output<void>();
  readonly total = TOUR.length;
  readonly position = computed(() => this.index() ?? 0);
  readonly step = computed<TourStep | undefined>(() => {
    const i = this.index();
    return i === null ? undefined : TOUR[i];
  });
}
