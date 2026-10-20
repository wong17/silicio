import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { App } from '../../app';
import { LabSession } from '../../laboratory/lab-session.service';
import { AtriumSceneComponent } from '../../world/atrium-scene.component';
import { WorkspaceComponent } from './workspace.component';
import { WORKSPACE_STORAGE_KEY, WorkspaceService } from './workspace.service';

@Component({
  imports: [WorkspaceComponent],
  template: `
    <app-workspace [templates]="{ program: program, state: state }">
      <section workspaceStage class="stage">escena</section>
    </app-workspace>
    <ng-template #program><div class="long" style="height: 2000px">programa {{ text() }}</div></ng-template>
    <ng-template #state><p class="regs">registros</p></ng-template>
  `,
})
class Host {
  readonly text = signal('MOV AX, 7');
}

describe('WorkspaceComponent', () => {
  beforeEach(() => localStorage.removeItem(WORKSPACE_STORAGE_KEY));
  afterEach(() => {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    TestBed.inject(LabSession).dispose();
    vi.restoreAllMocks();
  });

  it('mover un panel a la derecha y volver abajo conserva el mismo elemento y su scroll', async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const ws = TestBed.inject(WorkspaceService);
    ws.setExperience('8086');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const window = root.querySelector('app-instrument-window[data-panel="program"]')!;
    const body = window.querySelector<HTMLElement>('.body')!;
    body.scrollTop = 120;
    ws.dock('program', 'right');
    fixture.detectChanges();
    expect(window.getAttribute('data-zone')).toBe('right');
    ws.dock('program', 'bottom');
    fixture.detectChanges();
    expect(root.querySelector('app-instrument-window[data-panel="program"]')).toBe(window);
    expect(body.isConnected).toBe(true);
    expect(body.scrollTop).toBe(120);
  });

  it('minimizar deja un botón que lo restaura', async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    const ws = TestBed.inject(WorkspaceService);
    ws.setExperience('8086');
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('app-instrument-window[data-panel="state"] button[aria-label="Minimizar Estado"]')!.click();
    fixture.detectChanges();
    expect(root.querySelector('app-instrument-window[data-panel="state"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('.tray button[aria-label="Restaurar Estado"]')!.click();
    fixture.detectChanges();
    expect(root.querySelector('app-instrument-window[data-panel="state"]')).not.toBeNull();
  });
});

describe('Escritorio del 8086 en el shell', () => {
  beforeEach(async () => {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    vi.spyOn(App.prototype, 'ngAfterViewInit').mockImplementation(() => {});
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] })
      .overrideComponent(AtriumSceneComponent, { set: { template: '', styles: [] } })
      .compileComponents();
  });
  afterEach(() => {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    TestBed.inject(LabSession).dispose();
    vi.restoreAllMocks();
  });

  it('muestra Programa y Estado a la vez, sin pestañas excluyentes', () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(LabSession).section.set('8086');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-panel="program"] app-program-panel')).not.toBeNull();
    expect(root.querySelector('[data-panel="state"] app-register-panel')).not.toBeNull();
    expect(root.querySelector('app-workspace [role="tablist"]')).toBeNull();
  });

  it('cerrar y reabrir Programa conserva el código editado', async () => {
    const fixture = TestBed.createComponent(App);
    const session = TestBed.inject(LabSession);
    const ws = TestBed.inject(WorkspaceService);
    session.section.set('8086');
    fixture.detectChanges();
    session.source = 'MOV AX, 42\nHLT';
    ws.close('program');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-panel="program"]')).toBeNull();
    ws.open('program');
    fixture.detectChanges();
    await fixture.whenStable();
    const editor = (fixture.nativeElement as HTMLElement).querySelector<HTMLTextAreaElement>('[data-panel="program"] textarea')!;
    expect(editor.value).toBe('MOV AX, 42\nHLT');
  });
});
