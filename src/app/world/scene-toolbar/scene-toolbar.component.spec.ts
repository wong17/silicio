import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
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
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.bar button')];
    expect(buttons.length).toBeGreaterThan(10);
    for (const b of buttons) expect(b.getAttribute('aria-label')).toBeTruthy();
    expect(buttons.find((b) => b.getAttribute('aria-label') === 'Acercar')?.textContent).toContain('+');
  });

  it('la barra ancha se muestra bajo la escena y el dock compacto queda oculto cuando cabe', async () => {
    await TestBed.configureTestingModule({ imports: [SceneToolbarComponent] }).compileComponents();
    const fixture = create({ section: '8086' });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.bar')).not.toBeNull();
    expect(el.querySelector('.dock')).not.toBeNull();
    expect(el.querySelector('.bar .tip')?.textContent).toContain('Girar a la izquierda');
  });
});
