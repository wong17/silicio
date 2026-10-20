import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LabSession } from '../../laboratory/lab-session.service';
import { SimulationCoordinator } from '../../laboratory/controllers/simulation-coordinator';
import { LEARNING_PATHS, firstPending, type GuideContext } from '../../content/learning-paths';
import { GUIDE_RENDERER, type GuideRenderer, type GuideShow } from './guide-renderer';
import { LearningGuide } from './learning-guide.service';

class FakeRenderer implements GuideRenderer {
  shown: GuideShow[] = [];
  hidden = 0;
  async show(o: GuideShow): Promise<void> {
    this.shown.push(o);
  }
  hide(): void {
    this.hidden++;
  }
  get last() {
    return this.shown.at(-1)?.step.id;
  }
}

const anchors = ['program-panel', 'transport-step', 'register-panel', 'transport-grain', 'transport-run', 'mission-select', 'editor', 'assemble', 'screen-panel'];

describe('guías por acciones', () => {
  let guide: LearningGuide;
  let renderer: FakeRenderer;
  let session: LabSession;
  let coordinator: SimulationCoordinator;
  beforeEach(() => {
    renderer = new FakeRenderer();
    TestBed.configureTestingModule({ providers: [{ provide: GUIDE_RENDERER, useValue: renderer }] });
    for (const a of anchors) {
      const el = document.createElement('div');
      el.dataset['guide'] = a;
      document.body.append(el);
    }
    session = TestBed.inject(LabSession);
    coordinator = TestBed.inject(SimulationCoordinator);
    guide = TestBed.inject(LearningGuide);
    session.section.set('8086');
    session.source = 'ADD AX, [10]\nHLT';
    session.load();
    coordinator.activate('8086');
  });
  afterEach(() => {
    guide.cancel();
    document.querySelectorAll('[data-guide]').forEach((e) => e.remove());
  });

  const flush = async () => {
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 10));
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 10));
  };

  it('un paso informativo termina con el «Siguiente» del alumno y uno de acción espera al estado', async () => {
    await guide.start('8086-primer-paso');
    expect(renderer.last).toBe('programa');
    expect(renderer.shown.at(-1)!.manual).toBe(true);
    guide.next();
    await flush();
    expect(renderer.last).toBe('paso');
    expect(renderer.shown.at(-1)!.manual).toBe(false);
    // Pressing «Siguiente» is not an option for an action step: only the state moves it on.
    expect(guide.active()!.path.steps[guide.active()!.index].done).toBeDefined();
  });

  it('avanza por el estado real, no por contar clics: ejecutar un paso completa «Un paso» y «Qué cambió»', async () => {
    await guide.start('8086-primer-paso');
    guide.next();
    await flush();
    expect(renderer.last).toBe('paso');
    await coordinator.step();
    await flush();
    // AX = 12 completes the next step as well, so the guide lands on the first one still to do.
    expect(renderer.last).toBe('fases');
    coordinator.setGrain('phase');
    await flush();
    expect(guide.active()).toBeUndefined();
    expect(guide.notice()).toContain('Guía completada');
  });

  it('cancelar limpia el resaltado y devuelve el foco; repetir empieza de nuevo', async () => {
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    await guide.start('8086-primer-paso');
    guide.cancel();
    expect(guide.active()).toBeUndefined();
    expect(renderer.hidden).toBeGreaterThan(0);
    expect(document.activeElement).toBe(button);
    button.remove();
    renderer.shown = [];
    await guide.start('8086-primer-paso');
    expect(renderer.last).toBe('programa');
  });

  it('una ruta nueva sustituye a la anterior', async () => {
    await guide.start('8086-primer-paso');
    await guide.start('8086-emu8086');
    expect(guide.active()!.path.id).toBe('8086-emu8086');
  });

  it('un anclaje ausente salta el paso con un aviso', async () => {
    document.querySelector('[data-guide="transport-step"]')!.remove();
    vi.useFakeTimers();
    const run = guide.start('8086-primer-paso');
    await vi.advanceTimersByTimeAsync(0);
    guide.next();
    await vi.advanceTimersByTimeAsync(2000);
    await run;
    vi.useRealTimers();
    expect(guide.notice()).toContain('No encontré «Un paso»');
    expect(renderer.shown.map((s) => s.step.id)).not.toContain('paso');
  });

  it('no empieza durante el modo exposición', async () => {
    session.tourIndex.set(0);
    expect(await guide.start('8086-primer-paso')).toBe(false);
    expect(guide.active()).toBeUndefined();
    expect(guide.notice()).toContain('modo exposición');
    session.tourIndex.set(null);
  });

  it('con movimiento reducido el resaltado no anima', async () => {
    session.reduced.set(true);
    await guide.start('8086-primer-paso');
    expect(renderer.shown.at(-1)!.reducedMotion).toBe(true);
  });

  it('salir del capítulo termina la guía', async () => {
    await guide.start('8086-primer-paso');
    session.section.set('memory');
    await flush();
    expect(guide.active()).toBeUndefined();
  });

  it('una ruta inexistente no hace nada', async () => {
    expect(await guide.start('no-existe')).toBe(false);
  });
});

describe('rutas de aprendizaje', () => {
  const base: GuideContext = {
    section: '8086', missionNumber: 1, sourceEdited: false, assembled: true, executed: 0, halted: false, ax: 7, grain: 'instruction', screen: '',
    memoryActivity: 'store', memoryStep: 0, pcPowered: false, pcSteps: 0, pcHalted: false, pcMonitor: '', socStage: 0, socCompleted: false,
  };

  it('cada experiencia tiene una ruta inicial de hasta cinco pasos con anclaje y texto', () => {
    for (const experience of ['8086', 'memory', 'machine', 'apple'] as const) {
      const paths = LEARNING_PATHS.filter((p) => p.experience === experience);
      expect(paths.length, experience).toBeGreaterThan(0);
      for (const p of paths) {
        expect(p.steps.length).toBeLessThanOrEqual(5);
        for (const s of p.steps) expect(s.anchor.startsWith('[data-guide="') && s.text.length > 10 && s.title.length > 2, s.id).toBe(true);
      }
    }
  });

  it('el recorrido «De EMU8086 a SILICIO» sigue escribir, ensamblar, paso, registros y Pantalla', () => {
    const p = LEARNING_PATHS.find((x) => x.id === '8086-emu8086')!;
    expect(p.steps.map((s) => s.id)).toEqual(['elige', 'escribe', 'ensambla', 'ejecuta', 'pantalla']);
    expect(firstPending(p, base)).toBe(0);
    expect(firstPending(p, { ...base, missionNumber: 10 })).toBe(1);
    expect(firstPending(p, { ...base, missionNumber: 10, sourceEdited: true, assembled: false })).toBe(2);
    expect(firstPending(p, { ...base, missionNumber: 10, sourceEdited: true, assembled: true, halted: true, screen: 'x' })).toBe(5);
  });
});
