import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { findTerm } from '../content/glossary';

/**
 * Marks an abbreviation as a glossary term: dotted underline, a definition on hover or focus (CSS reads
 * `data-term`), and a spoken description. It is focusable, so the definition is reachable by keyboard.
 */
@Directive({
  selector: '[appTerm]',
  host: { class: 'term', tabindex: '0' },
})
export class TermDirective {
  readonly appTerm = input.required<string>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => {
      const term = findTerm(this.appTerm());
      const el = this.element.nativeElement;
      if (!term) {
        el.removeAttribute('data-term');
        el.removeAttribute('aria-description');
        return;
      }
      const text = `${term.name}. ${term.definition}`;
      el.setAttribute('data-term', text);
      el.setAttribute('aria-description', text);
    });
  }
}
