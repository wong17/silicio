import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LabSession } from '../../laboratory/lab-session.service';
import { SceneToolbarComponent, type SceneCommand } from './scene-toolbar.component';

function create(inputs: Partial<SceneToolbarComponent> = {}) {
  const fixture = TestBed.createComponent(SceneToolbarComponent);
  Object.assign(fixture.componentInstance, inputs);
  fixture.detectChanges();
  return fixture;
}

describe('barra de herramientas de la escena', () => {
  it('cierra el menú móvil antes de emitir el comando', async () => {
    await TestBed.configureTestingModule({ imports: [SceneToolbarComponent] }).compileComponents();
    const fixture = create({ section: '8086' });
    const menu = (fixture.nativeElement as HTMLElement).querySelector('details')!;
    menu.open = true;
    let openWhenEmitted: boolean | undefined;
    fixture.componentInstance.command.subscribe((command: SceneCommand) => {
      if (command === 'explode') openWhenEmitted = menu.open;
    });
    const chip = [...menu.querySelectorAll<HTMLButtonElement>('.more-grid button')].find((b) =>
      b.textContent?.includes('chip'),
    )!;
    chip.click();
    expect(openWhenEmitted).toBe(false);
  });

  it('ofrece el control de chip solo en las estaciones que tienen chip', async () => {
    await TestBed.configureTestingModule({ imports: [SceneToolbarComponent] }).compileComponents();
    const onChip = create({ section: '8086' });
    expect(
      (onChip.nativeElement as HTMLElement).querySelector('button[aria-label="Abrir o cerrar chip"]'),
    ).not.toBeNull();
    const onMemory = create({ section: 'memory' });
    expect(
      (onMemory.nativeElement as HTMLElement).querySelector('button[aria-label="Abrir o cerrar chip"]'),
    ).toBeNull();
  });

  it('refleja los estados de alternancia con aria-pressed', async () => {
    await TestBed.configureTestingModule({ imports: [SceneToolbarComponent] }).compileComponents();
    const on = create({ lampOn: true, inspection: false, viewMode: 'material' }).nativeElement as HTMLElement;
    expect(on.querySelector('button[aria-label="Lámpara encendida"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(on.querySelector('button[aria-label="Inspección cercana"]')!.getAttribute('aria-pressed')).toBe('false');
    const off = create({ lampOn: false, inspection: true }).nativeElement as HTMLElement;
    expect(off.querySelector('button[aria-label="Lámpara encendida"]')!.getAttribute('aria-pressed')).toBe('false');
    expect(off.querySelector('button[aria-label="Inspección cercana"]')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('todas las herramientas tienen nombre accesible y atajo documentado cuando lo tienen', async () => {
    await TestBed.configureTestingModule({ imports: [SceneToolbarComponent] }).compileComponents();
    const fixture = create({ section: '8086' });
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.bar > [role="group"] button')];
    expect(buttons.length).toBeGreaterThan(10);
    for (const b of buttons) expect(b.getAttribute('aria-label')).toBeTruthy();
    expect(buttons.find((b) => b.getAttribute('aria-label') === 'Acercar')?.textContent).toContain('+');
  });

  it('agrupa Cámara, Inspección y Vistas en una sola barra', async () => {
    await TestBed.configureTestingModule({ imports: [SceneToolbarComponent] }).compileComponents();
    const el = create({ section: '8086' }).nativeElement as HTMLElement;
    const groups = [...el.querySelectorAll('.bar > [role="group"]')].map((g) => g.getAttribute('aria-label'));
    expect(groups).toEqual(['Cámara', 'Inspección', 'Vistas']);
    expect(el.querySelector('.dock')).toBeNull();
    expect(el.querySelector('.bar .tip')?.textContent).toContain('Girar a la izquierda');
  });

  it('Piezas, Mapa y Gráficos son herramientas de la barra con su estado', async () => {
    await TestBed.configureTestingModule({ imports: [SceneToolbarComponent] }).compileComponents();
    const session = TestBed.inject(LabSession);
    session.setHud({ tray: true, map: false });
    const el = create({ section: '8086' }).nativeElement as HTMLElement;
    const views = [...el.querySelectorAll<HTMLButtonElement>('.bar [aria-label="Vistas"] button')];
    expect(views.map((b) => b.getAttribute('aria-label'))).toEqual(['Piezas', 'Mapa', 'Gráficos']);
    for (const b of views) expect(b.classList).toContain('tool');
    expect(views[0].getAttribute('aria-pressed')).toBe('true');
    expect(views[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('Gráficos abre una única elección de calidad que cambia la sesión', async () => {
    await TestBed.configureTestingModule({ imports: [SceneToolbarComponent] }).compileComponents();
    const session = TestBed.inject(LabSession);
    const fixture = create({ section: '8086' });
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.bar button[aria-label="Gráficos"]')!.click();
    fixture.detectChanges();
    const options = el.querySelectorAll<HTMLButtonElement>('[role="radiogroup"][aria-label="Calidad gráfica"] [role="radio"]');
    expect(options).toHaveLength(3);
    options[2].click();
    fixture.detectChanges();
    expect(session.quality()).toBe('low');
    expect(el.querySelector('[role="radiogroup"][aria-label="Calidad gráfica"]')).toBeNull();
  });

  it('el menú Más reúne las herramientas que no caben en la barra', async () => {
    await TestBed.configureTestingModule({ imports: [SceneToolbarComponent] }).compileComponents();
    const el = create({ section: '8086' }).nativeElement as HTMLElement;
    const items = [...el.querySelectorAll<HTMLElement>('details.more .more-grid button')];
    const groups = new Set(items.map((b) => b.dataset['group']));
    expect(groups).toEqual(new Set(['camera', 'inspect']));
    expect(items.some((b) => b.textContent?.includes('Rotular piezas'))).toBe(true);
  });
});
