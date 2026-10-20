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

/** Driver.js, loaded the first time a guide starts so it costs nothing before that. */
export class DriverRenderer implements GuideRenderer {
  private driver?: { highlight(step: object): void; destroy(): void };
  private styled = false;

  async show(o: GuideShow): Promise<void> {
    const element = document.querySelector(o.step.anchor);
    if (!element) throw Error('Anclaje ausente: ' + o.step.anchor);
    const { driver } = await import('driver.js');
    this.loadStyle();
    this.driver?.destroy();
    this.driver = driver({ animate: !o.reducedMotion, smoothScroll: !o.reducedMotion, allowClose: true, overlayClickBehavior: () => undefined });
    this.driver.highlight({
      element,
      popover: {
        title: o.step.title,
        description: o.step.text + '  (' + (o.index + 1) + '/' + o.total + ')',
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
