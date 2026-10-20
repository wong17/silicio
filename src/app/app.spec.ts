import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { App } from './app';
import { LabSession } from './laboratory/lab-session.service';
import { AtriumSceneComponent } from './world/atrium-scene.component';

/** The renderer needs WebGL, which the test runner does not provide; the console is tested without it. */
function create(): { fixture: ReturnType<typeof TestBed.createComponent<App>>; app: App; session: LabSession } {
  const fixture = TestBed.createComponent(App);
  return { fixture, app: fixture.componentInstance, session: TestBed.inject(LabSession) };
}

describe('SILICIO / shell y consola', () => {
  beforeEach(async () => {
    vi.spyOn(App.prototype, 'ngAfterViewInit').mockImplementation(() => {});
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] })
      .overrideComponent(AtriumSceneComponent, { set: { template: '', styles: [] } })
      .compileComponents();
  });

  afterEach(() => {
    TestBed.inject(LabSession).dispose();
    vi.restoreAllMocks();
  });

  it('expone cuatro capítulos en el orden del recorrido, sin Cronoscopio', () => {
    const { fixture } = create();
    fixture.detectChanges();
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav.links')!;
    const links = [...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/8086', '/memory', '/machine', '/soc']);
    expect(nav.textContent).not.toContain('Cronoscopio');
  });

  it('la Ayuda está arriba a la derecha y el antiguo acordeón de sesión ya no existe', () => {
    const { fixture, session } = create();
    session.section.set('8086');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-experience-nav app-help-dialog button.trigger')).not.toBeNull();
    expect(root.querySelector('app-experience-nav app-panels-menu')).not.toBeNull();
    expect(root.textContent).not.toContain('Sesión, gráficos y atajos');
    expect(root.querySelector('app-session-panel')).toBeNull();
  });

  it('ejecuta una suma y recupera el estado anterior con el cronoscopio', () => {
    const { session } = create();
    session.step();
    expect(session.state().registers.AX).toBe(12);
    session.restore(-1);
    expect(session.state().registers.AX).toBe(7);
    expect(session.state().registers.IP).toBe(0x100);
  });

  it('impide ejecutar código editado que aún no se compiló', () => {
    const { session } = create();
    session.source = 'MOV AX,42';
    session.step();
    expect(session.error()).toContain('Compila');
    expect(session.state().registers.AX).toBe(7);
  });

  it('branching_preserves_previous_future', () => {
    const { session } = create();
    session.step();
    session.step();
    session.restore(-1);
    session.step();
    expect(session.branches()).toHaveLength(1);
    expect(session.branches()[0].trace).toHaveLength(2);
    session.restoreBranch(session.branches()[0].id);
    expect(session.trace()).toHaveLength(2);
  });

  it('console_expansion_preserves_selection_and_session', () => {
    const { app, session } = create();
    session.part('alu');
    session.step();
    app.setLayout('instrument');
    expect(session.state().registers.AX).toBe(12);
    expect(app.layout()).toBe('instrument');
  });

  it('la vista 3D tiene su barra de herramientas con el control de material y malla', () => {
    const { fixture } = create();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-scene-toolbar')).not.toBeNull();
    expect(el.querySelector('app-scene-toolbar button[aria-label="Malla y material"]')).not.toBeNull();
    expect(el.querySelector('.console button[aria-label="Malla y material"]')).toBeNull();
  });

  it('empty_alu_waits_for_first_instruction', () => {
    const { fixture, session } = create();
    session.section.set('8086');
    expect(() => fixture.detectChanges()).not.toThrow();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ejecuta un paso');
  });

  it('aliases_share_physical_address', () => {
    const { session } = create();
    session.segmentText = '2000';
    session.offsetText = '000A';
    session.setAddress();
    const alias = session.aliasAddress();
    expect((alias.segment * 16 + alias.offset) % 1048576).toBe(session.physical());
  });

  it('restoring_branch_archives_current_branch', () => {
    const { session } = create();
    session.step();
    session.step();
    session.restore(-1);
    session.step();
    const branchA = session.branches()[0].id;
    session.restoreBranch(branchA);
    const branchB = session.branches().find((b) => b.id !== branchA);
    expect(branchB).toBeDefined();
    session.restoreBranch(branchB!.id);
    expect(session.trace()).toHaveLength(1);
    expect(session.state().halted).toBe(false);
  });

  it('recapturing_baseline_clears_previous_differences', () => {
    const { session } = create();
    session.capture();
    session.step();
    expect(session.comparison().length).toBeGreaterThan(0);
    session.capture();
    expect(session.comparison()).toEqual([]);
  });

  it('selecting_an_internal_piece_opens_the_chip', () => {
    const { session } = create();
    session.exploded.set(false);
    session.part('alu');
    expect(session.exploded()).toBe(true);
    expect(session.activePart()).toBe('alu');
  });

  it('quality_change_preserves_academic_actions', () => {
    const { session } = create();
    session.setQuality('low');
    session.step();
    expect(session.state().registers.AX).toBe(12);
    session.setQuality('balanced');
    session.restore(-1);
    expect(session.state().registers.AX).toBe(7);
  });

  it('shortcuts_do_not_fire_from_fields_menus_or_dialogs', () => {
    const { fixture, session } = create();
    session.section.set('8086');
    fixture.detectChanges();
    const before = session.exploded();
    const press = (host: HTMLElement) => {
      document.body.append(host);
      host.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
      host.remove();
    };
    press(document.createElement('textarea'));
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    const item = document.createElement('button');
    menu.append(item);
    document.body.append(menu);
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
    menu.remove();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const inner = document.createElement('button');
    dialog.append(inner);
    document.body.append(dialog);
    inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
    dialog.remove();
    expect(session.exploded()).toBe(before);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true }));
    expect(session.exploded()).toBe(!before);
  });

  it('webgl_unavailable_preserves_lab_controls', () => {
    const { fixture, session } = create();
    session.section.set('8086');
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('app-simulation-transport button[aria-label="Ejecutar un paso"]')!
      .click();
    expect(session.state().registers.AX).toBe(12);
  });

  it('renderer_failure_keeps_accessible_pin_catalog', () => {
    const { fixture, session } = create();
    session.section.set('8086');
    session.setHud({ tray: true });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const family = [...root.querySelectorAll<HTMLButtonElement>('app-piece-tray [role="option"]')].find((b) =>
      b.getAttribute('aria-label')?.startsWith('Terminales'),
    );
    expect(family).toBeDefined();
    family!.click();
    fixture.detectChanges();
    const option = root.querySelector('app-piece-tray .selector button[aria-label^="Pin 25"]');
    expect(option).not.toBeNull();
    session.part('pin-25');
    expect(session.selectedDescription()).toContain('ALE');
  });

  it('dimm_gallery_does_not_present_8086_banks_or_addresses', () => {
    const { fixture, session } = create();
    session.section.set('memory');
    session.memoryLesson.select('ram');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.address')).toBeNull();
    expect(root.textContent).not.toContain('Banco par · D0–D7');
    session.setHud({ tray: true });
    fixture.detectChanges();
    expect(root.querySelector('app-piece-tray')?.textContent).not.toContain('Bytes');
    expect(session.state().memory[0x2000a]).toBe(5);
  });
});
