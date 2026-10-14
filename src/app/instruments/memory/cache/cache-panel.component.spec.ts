import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { CachePanelComponent } from './cache-panel.component';
import { LabSession } from '../../../laboratory/lab-session.service';

async function create() {
  await TestBed.configureTestingModule({ imports: [CachePanelComponent] }).compileComponents();
  const session = TestBed.inject(LabSession);
  const fixture = TestBed.createComponent(CachePanelComponent);
  fixture.detectChanges();
  return { fixture, session, root: fixture.nativeElement as HTMLElement };
}

describe('panel de caché', () => {
  it('hides_outcomes_until_predicted', async () => {
    const { root } = await create();
    expect(root.textContent).toContain('por predecir');
    expect(root.textContent).not.toContain('acierto en');
    expect(root.querySelectorAll('.predict button')).toHaveLength(2);
  });

  it('predicting_everything_right_solves_it_and_shows_both_costs', async () => {
    const { fixture, root } = await create();
    const click = (label: string) => {
      const button = [...root.querySelectorAll<HTMLButtonElement>('.predict button')].find((b) => b.textContent?.trim() === label)!;
      button.click();
      fixture.detectChanges();
    };
    for (const label of ['Fallo', 'Acierto', 'Fallo', 'Fallo']) click(label);
    expect(root.querySelector('.verdict.solved')).not.toBeNull();
    expect(root.textContent).toContain('34');
    expect(root.textContent).toContain('24');
  });

  it('reset_clears_the_predictions', async () => {
    const { fixture, session, root } = await create();
    session.predictCache(false);
    fixture.detectChanges();
    session.resetCache();
    fixture.detectChanges();
    expect(root.textContent).toContain('Lectura 1 de 4');
  });
});
