import { TestBed } from '@angular/core/testing';
import { LabSession } from '../../laboratory/lab-session.service';
import { WORKSPACE_STORAGE_KEY, WorkspaceService } from './workspace.service';

describe('WorkspaceService', () => {
  beforeEach(() => {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    TestBed.configureTestingModule({});
  });
  afterEach(() => {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    TestBed.inject(LabSession).dispose();
  });

  it('en el 8086 abre Programa y Estado juntos', () => {
    const ws = TestBed.inject(WorkspaceService);
    ws.setExperience('8086');
    ws.setArea({ width: 1366, height: 674 });
    expect(ws.arrangement().placements.map((p) => p.id)).toEqual(['program', 'state']);
  });

  it('1920 → 1024 → 390 → 1920 recupera la distribución de escritorio', () => {
    const ws = TestBed.inject(WorkspaceService);
    ws.setExperience('8086');
    ws.setArea({ width: 1920, height: 950 });
    ws.dock('state', 'right');
    ws.setArea({ width: 1024, height: 700 });
    expect(ws.arrangement().placements.every((p) => p.rect.x + p.rect.width <= 1024)).toBe(true);
    ws.setArea({ width: 390, height: 700 });
    expect(ws.arrangement().mode).toBe('flow');
    ws.setArea({ width: 1920, height: 950 });
    expect(ws.arrangement().placements.find((p) => p.id === 'state')!.zone).toBe('right');
  });

  it('la distribución se guarda y otra instancia la recupera', () => {
    const ws = TestBed.inject(WorkspaceService);
    ws.setExperience('8086');
    ws.setArea({ width: 1366, height: 674 });
    ws.float('program');
    const again = new WorkspaceService();
    again.setExperience('8086');
    again.setArea({ width: 1366, height: 674 });
    expect(again.arrangement().placements.find((p) => p.id === 'program')!.zone).toBe('float');
  });

  it('un guardado corrupto vuelve a Estudiar sin tocar la sesión', () => {
    const session = TestBed.inject(LabSession);
    session.step();
    localStorage.setItem(WORKSPACE_STORAGE_KEY, '{"version":1,"layouts":{"8086|wide":{"version":7}}');
    const ws = TestBed.inject(WorkspaceService);
    ws.setExperience('8086');
    ws.setArea({ width: 1366, height: 674 });
    expect(ws.layout().preset).toBe('study');
    expect(ws.arrangement().placements.map((p) => p.zone)).toEqual(['bottom', 'bottom']);
    expect(session.state().registers.AX).toBe(12);
  });

  it('cerrar devuelve el foco a quien abrió el panel', () => {
    const ws = TestBed.inject(WorkspaceService);
    ws.setExperience('8086');
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    ws.open('inspector');
    expect(ws.focusRequest()?.id).toBe('inspector');
    (document.activeElement as HTMLElement | null)?.blur();
    ws.close('inspector');
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('avisa cuando tuvo que mover un panel para conservar los mínimos', () => {
    const ws = TestBed.inject(WorkspaceService);
    ws.setExperience('8086');
    ws.setArea({ width: 820, height: 600 });
    expect(ws.notice()).toBeNull();
    ws.open('inspector');
    expect(ws.notice()).toContain('flota');
  });
});
