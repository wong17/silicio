import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { COURSE_MAP } from '../../content/course-map';
import { LabSession } from '../../laboratory/lab-session.service';
import { HelpDialogComponent } from './help-dialog.component';

async function create() {
  await TestBed.configureTestingModule({ imports: [HelpDialogComponent], providers: [provideRouter([])] }).compileComponents();
  const fixture = TestBed.createComponent(HelpDialogComponent);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, root, session: TestBed.inject(LabSession) };
}

function open(fixture: { detectChanges(): void }, root: HTMLElement): HTMLButtonElement {
  const trigger = root.querySelector<HTMLButtonElement>('button.trigger')!;
  trigger.focus();
  trigger.click();
  fixture.detectChanges();
  return trigger;
}

describe('Ayuda', () => {
  afterEach(() => {
    TestBed.inject(LabSession).dispose();
    vi.restoreAllMocks();
  });

  it('abre desde el botón Ayuda, pausa la simulación y devuelve el foco al cerrar', async () => {
    const { fixture, root, session } = await create();
    const pause = vi.spyOn(session, 'pause');
    const trigger = open(fixture, root);
    const dialog = root.querySelector('dialog')!;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(pause).toHaveBeenCalled();
    root.querySelector<HTMLButtonElement>('dialog button[aria-label="Cerrar ayuda"]')!.click();
    fixture.detectChanges();
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('Esc cierra la ayuda', async () => {
    const { fixture, root } = await create();
    open(fixture, root);
    const dialog = root.querySelector('dialog')!;
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('conserva sesión, preferencias y gráficos del antiguo panel', async () => {
    const { fixture, root, session } = await create();
    open(fixture, root);
    const show = (name: string) => {
      root.querySelector<HTMLButtonElement>(`dialog [role="tab"][data-section="${name}"]`)!.click();
      fixture.detectChanges();
    };
    show('session');
    expect(root.querySelector('dialog input[type="file"]')).not.toBeNull();
    const exported = vi.spyOn(session, 'exportSession').mockImplementation(() => {});
    [...root.querySelectorAll<HTMLButtonElement>('dialog button')].find((b) => b.textContent?.includes('Exportar'))!.click();
    expect(exported).toHaveBeenCalled();
    show('preferences');
    expect(root.querySelector('dialog input[type="checkbox"]')).not.toBeNull();
    const radios = root.querySelectorAll<HTMLButtonElement>('dialog [role="radiogroup"][aria-label="Calidad gráfica"] [role="radio"]');
    expect(radios).toHaveLength(3);
    radios[2].click();
    expect(session.quality()).toBe('low');
    show('shortcuts');
    expect(root.querySelector('dialog kbd')).not.toBeNull();
    show('glossary');
    expect(root.querySelector('dialog input[type="search"]')).not.toBeNull();
  });

  it('Temas del curso lista cada entrada con su estado', async () => {
    const { fixture, root } = await create();
    open(fixture, root);
    root.querySelector<HTMLButtonElement>('dialog [role="tab"][data-section="course"]')!.click();
    fixture.detectChanges();
    const rows = root.querySelectorAll('dialog .topic');
    expect(rows).toHaveLength(COURSE_MAP.length);
    expect(rows[0].querySelector('.status')?.textContent?.trim()).toBeTruthy();
  });
});
