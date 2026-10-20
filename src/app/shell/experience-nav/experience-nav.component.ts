import { Component, effect, ElementRef, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CHAPTERS } from '../../content/experiences';
import type { Section } from '../../world/scene-inputs';

/** Brand and experience links. Narrow screens scroll this row, keeping the active link and the next one in view. */
@Component({
  selector: 'app-experience-nav',
  imports: [RouterLink],
  templateUrl: './experience-nav.component.html',
  styleUrl: './experience-nav.component.scss',
})
export class ExperienceNavComponent {
  readonly active = input<Section>('atrium');
  readonly experiences = CHAPTERS;
  private readonly links = viewChild<ElementRef<HTMLElement>>('links');

  constructor() {
    effect(() => {
      this.active();
      // The links render after this tick; the current one slides in with the next one peeking.
      setTimeout(() => this.reveal(), 0);
    });
  }

  /** Fades the left edge only once the row has scrolled, so the first link is never cut. */
  onScroll(): void {
    const el = this.links()?.nativeElement;
    if (el) el.classList.toggle('scrolled', el.scrollLeft > 4);
  }

  private reveal(): void {
    const row = this.links()?.nativeElement;
    const current = row?.querySelector<HTMLElement>('a.active');
    if (!row || !current || row.scrollWidth <= row.clientWidth) return;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Keep a sliver of the previous link, so the row reads as a strip that moves rather than a jump.
    const left = Math.max(0, current.offsetLeft - 44);
    row.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
  }
}
