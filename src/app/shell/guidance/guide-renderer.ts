import { InjectionToken } from '@angular/core';
import type { GuideStep } from '../../content/learning-paths';

export interface GuideShow {
  step: GuideStep;
  index: number;
  total: number;
  /** Informative steps end with the student's own «Siguiente»; the others wait for the state. */
  manual: boolean;
  reducedMotion: boolean;
  onNext(): void;
  onExit(): void;
}

/** What the guide needs of a highlighter; Driver.js is one implementation, a fake is another. */
export interface GuideRenderer {
  show(options: GuideShow): Promise<void>;
  hide(): void;
}

export const GUIDE_RENDERER = new InjectionToken<GuideRenderer>('GUIDE_RENDERER', {
  providedIn: 'root',
  factory: () => new DriverRenderer(),
});

const GLYPHS = {
  reset: 'M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5',
  back: 'M19 12H6m5-5-5 5 5 5',
  step: 'M6 5l9 7-9 7zM19 5v14',
  play: 'M7 5l12 7-12 7z',
  panels: 'M4 5h16v14H4zM4 13h16M12 13v6',
  help: 'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
};
const chip = (path: string, label: string, circle = false) =>
  '<span class="gv-chip"><svg viewBox="0 0 24 24" aria-hidden="true">' + (circle ? '<circle cx="12" cy="12" r="9" />' : '') + '<path d="' + path + '" /></svg><em>' + label + '</em></span>';

/** The drawing a step may carry: the very glyphs of the buttons it talks about, or the seven phases by group. */
export function visualHtml(kind: GuideStep['visual']): string {
  switch (kind) {
    case 'transport':
      return '<div class="gv">' + chip(GLYPHS.reset, 'Reiniciar') + chip(GLYPHS.back, 'Atrás') + chip(GLYPHS.step, 'Paso') + chip(GLYPHS.play, 'Ejecutar') + '</div>';
    case 'panels':
      return '<div class="gv">' + chip(GLYPHS.panels, 'Paneles') + '</div>';
    case 'help':
      return '<div class="gv">' + chip(GLYPHS.help, 'Ayuda', true) + '</div>';
    case 'phases':
      return (
        '<div class="gv gv-phases" role="img" aria-label="Fases 1 a 3, búsqueda; fases 4 a 7, ejecución">' +
        [1, 2, 3, 4, 5, 6, 7].map((n) => '<span class="' + (n < 4 ? 'a' : 'b') + '">' + n + '</span>').join('') +
        '<em>Búsqueda · Ejecución</em></div>'
      );
    default:
      return '';
  }
}

/** Driver.js, loaded the first time a guide starts so it costs nothing before that. */
export class DriverRenderer implements GuideRenderer {
  private driver?: { highlight(step: object): void; destroy(): void };
  private styled = false;

  async show(o: GuideShow): Promise<void> {
    const element = document.querySelector(o.step.anchor);
    if (!element) throw Error('Anclaje ausente: ' + o.step.anchor);
    const { driver } = await import('driver.js');
    this.loadStyle();
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    await new Promise<void>((done) => requestAnimationFrame(() => done()));
    this.driver?.destroy();
    this.driver = driver({ animate: !o.reducedMotion, smoothScroll: !o.reducedMotion, allowClose: true, overlayClickBehavior: () => undefined });
    this.driver.highlight({
      element,
      popover: {
        title: o.step.title,
        description: '<p>' + o.step.text + '</p>' + visualHtml(o.step.visual) + '<small class="gv-count">' + (o.index + 1) + ' de ' + o.total + '</small>',
        showButtons: o.manual ? ['next', 'close'] : ['close'],
        nextBtnText: o.index + 1 === o.total ? 'Listo' : 'Siguiente',
        doneBtnText: 'Listo',
        onNextClick: () => o.onNext(),
        onCloseClick: () => o.onExit(),
      },
    });
  }

  hide(): void {
    this.driver?.destroy();
    this.driver = undefined;
  }

  /** The stylesheet of the highlighter travels with it, not with the first page. */
  private loadStyle(): void {
    if (this.styled || typeof document === 'undefined') return;
    this.styled = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'driver.css';
    document.head.append(link);
  }
}
