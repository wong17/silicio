import { Component, computed, inject } from '@angular/core';
import { LabSession } from '../../../laboratory/lab-session.service';
import { HIT_COST, MISS_COST } from '../../../simulation/cache-model';

const h = (n: number, d = 4) => n.toString(16).toUpperCase().padStart(d, '0');

/**
 * Two direct-mapped caches side by side (four and eight lines) over the same reads. The mission asks the
 * student to predict each hit or miss before it is shown; the costs are those of the model, not a product.
 */
@Component({
  selector: 'app-cache-panel',
  templateUrl: './cache-panel.component.html',
  styleUrl: './cache-panel.component.scss',
})
export class CachePanelComponent {
  readonly session = inject(LabSession);
  readonly hitCost = HIT_COST;
  readonly missCost = MISS_COST;
  readonly lesson = computed(() => {
    this.session.cacheRevision();
    return this.session.cacheLesson;
  });
  readonly rows = computed(() => {
    const l = this.lesson();
    return l.four.accesses.map((a, i) => {
      const revealed = i < l.revealed;
      const other = l.eight.accesses[i];
      return {
        n: i + 1,
        address: h(a.address) + 'h',
        block: a.block,
        revealed,
        four: revealed ? { index: a.index, tag: a.tag, hit: a.hit } : undefined,
        eight: revealed && other ? { index: other.index, tag: other.tag, hit: other.hit } : undefined,
        guess: l.guesses[i],
      };
    });
  });
  readonly costFour = computed(() =>
    this.lesson()
      .four.accesses.slice(0, this.lesson().revealed)
      .reduce((n, a) => n + a.cost, 0),
  );
  readonly costEight = computed(() =>
    this.lesson()
      .eight.accesses.slice(0, this.lesson().revealed)
      .reduce((n, a) => n + a.cost, 0),
  );

  predict(hit: boolean): void {
    this.session.predictCache(hit);
  }

  reset(): void {
    this.session.resetCache();
  }

  setSource(source: 'mission' | 'last'): void {
    this.session.setCacheSource(source);
  }
}
