import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LabSession } from './lab-session.service';
import { LessonContext } from './lesson-context.service';
import { SimulationCoordinator } from './controllers/simulation-coordinator';
import { createArtifact } from '../simulation/learning-artifact';
import { readLabSession } from '../simulation/lab-session-codec';

const file = (text: string) => ({ size: text.length, text: async () => text }) as unknown as File;
const legacy = (source: string, steps: number) => {
  const probe = TestBed.inject(LabSession);
  const keep = probe.serializeSession();
  probe.source = source;
  probe.load();
  for (let n = 0; n < steps; n++) probe.step();
  const v2 = JSON.parse(probe.serializeSession()).cpu;
  void keep;
  return JSON.stringify(v2);
};

describe('sesión v3 y migración', () => {
  let session: LabSession;
  let lesson: LessonContext;
  let coordinator: SimulationCoordinator;
  beforeEach(() => {
    session = TestBed.inject(LabSession);
    lesson = TestBed.inject(LessonContext);
    coordinator = TestBed.inject(SimulationCoordinator);
    localStorage.clear();
  });
  afterEach(() => {
    coordinator.pause();
    vi.restoreAllMocks();
  });

  const populate = () => {
    session.source = 'MOV AX, 5\nADD AX, [10]\nHLT';
    session.load();
    session.step();
    session.step();
    session.memoryLesson.exercise.writeByte(0x10020, 0x34);
    session.memoryLesson.select('addresses');
    session.memoryLesson.progress.update((p) => ({ ...p, addresses: 2 }));
    session.pc.choose('editar-guardar');
    session.pc.importText('nota.txt', 'hola mundo');
    for (let n = 0; n < 12; n++) session.pc.step();
    session.setBufferMode('separate');
    session.setBufferTile(Array.from({ length: 64 }, (_, i) => i));
    session.nextBuffer();
    lesson.offer(createArtifact('word-task', '8086', { accumulator: 7, word: 5 }));
  };

  it('v3 guarda y recupera todos los ejercicios', async () => {
    populate();
    const text = session.serializeSession();
    expect(JSON.parse(text).version).toBe(3);
    const before = {
      cpu: JSON.stringify(session.state()),
      pc: JSON.stringify(session.pc.state()),
      memory: JSON.stringify(session.memoryLesson.toPart()),
      soc: session.bufferView().stage,
    };
    // Change everything, then import the saved file.
    session.source = 'HLT';
    session.load();
    session.pc.choose('suma-archivo');
    session.memoryLesson.exercise.clear();
    session.setBufferMode('shared');
    await session.importSession(file(text));
    expect(session.error()).toBe('');
    expect(JSON.stringify(session.state())).toBe(before.cpu);
    expect(JSON.stringify(session.pc.state())).toBe(before.pc);
    expect(session.pc.programId()).toBe('editar-guardar');
    expect(JSON.stringify(session.memoryLesson.toPart())).toBe(before.memory);
    expect(session.separateMemory()).toBe(true);
    expect(session.bufferView().stage).toBe(before.soc);
    expect(session.bufferCopies.toDevice).toBe(64);
    expect(lesson.receive('word-task', 'soc')).toEqual({ accumulator: 7, word: 5 });
    expect(session.trace()).toHaveLength(2);
  });

  it('un archivo v1/v2 reemplaza solo el 8086 y conserva Memoria, PC (SSD incluido) y SoC', async () => {
    populate();
    const old = legacy('MOV BX, 9\nHLT', 1);
    populate();
    const keep = {
      pc: JSON.stringify(session.pc.state()),
      ssd: session.pc.fileText('nota.txt'),
      memory: JSON.stringify(session.memoryLesson.toPart()),
      soc: JSON.stringify([session.separateMemory(), session.bufferView().input.values, session.bufferView().stage]),
    };
    await session.importSession(file(old));
    expect(session.error()).toBe('');
    expect(session.state().registers.BX).toBe(9);
    expect(session.source).toBe('MOV BX, 9\nHLT');
    expect(JSON.stringify(session.pc.state())).toBe(keep.pc);
    expect(session.pc.fileText('nota.txt')).toBe(keep.ssd);
    expect(JSON.stringify(session.memoryLesson.toPart())).toBe(keep.memory);
    expect(JSON.stringify([session.separateMemory(), session.bufferView().input.values, session.bufferView().stage])).toBe(keep.soc);
    // The views tied to the 8086 session follow the imported state.
    expect(session.cells().length).toBe(32);
    expect(session.cursor()).toBe(0);
  });

  it('las ramas archivadas sobreviven a una sesión v3', async () => {
    session.source = 'MOV AX, 1\nMOV BX, 2\nMOV CX, 3\nHLT';
    session.load();
    session.step();
    session.step();
    session.restore(0);
    session.step();
    expect(session.branches().length).toBeGreaterThan(0);
    const text = session.serializeSession();
    session.source = 'HLT';
    session.load();
    await session.importSession(file(text));
    expect(session.branches().length).toBeGreaterThan(0);
    expect(session.state().registers.BX).toBe(2);
  });

  it('un archivo dañado, de versión desconocida o incompleto da un error y no cambia nada', async () => {
    populate();
    const good = JSON.parse(session.serializeSession());
    const snapshot = () => JSON.stringify([session.state(), session.pc.state(), session.memoryLesson.toPart(), session.bufferView()]);
    const before = snapshot();
    const bad: string[] = [
      '{"version": 9}',
      'no es json',
      JSON.stringify({ ...good, pc: undefined }),
      JSON.stringify({ ...good, soc: { ...good.soc, tile: [1, 2, 3] } }),
      JSON.stringify({ ...good, pc: { ...good.pc, state: { ...good.pc.state, regs: [1] } } }),
      JSON.stringify({ ...good, pc: { ...good.pc, state: { ...good.pc.state, ssd: { 'raro.bin': [1] } } } }),
      JSON.stringify({ ...good, memory: { ...good.memory, exercise: { '5': 999 } } }),
      JSON.stringify({ ...good, lesson: { ...good.lesson, artifactId: 'no-existe' } }),
      JSON.stringify({ ...good, lesson: { ...good.lesson, controllerId: 'gpu' } }),
      JSON.stringify({ ...good, cpu: { version: 2, current: null, branches: [] } }),
    ];
    for (const text of bad) {
      session.error.set('');
      await session.importSession(file(text));
      expect(session.error(), text.slice(0, 40)).not.toBe('');
      expect(snapshot()).toBe(before);
    }
  });

  it('un archivo que pasa del límite se rechaza sin leerlo', async () => {
    populate();
    const before = JSON.stringify(session.pc.state());
    const big = { size: 13_000_000, text: async () => '' } as unknown as File;
    await session.importSession(big);
    expect(session.error()).toContain('12 MB');
    expect(() => readLabSession('x'.repeat(12_000_001))).toThrow('12 MB');
    expect(JSON.stringify(session.pc.state())).toBe(before);
  });

  it('importar pausa los controladores y no reanuda solo', async () => {
    populate();
    const text = session.serializeSession();
    session.source = 'MOV CX, 5\nl: DEC CX\nJNZ l\nHLT';
    session.load();
    coordinator.activate('8086');
    vi.useFakeTimers();
    coordinator.run();
    await vi.advanceTimersByTimeAsync(0);
    expect(coordinator.running()).toBe(true);
    const done = session.importSession(file(text));
    await vi.advanceTimersByTimeAsync(0);
    await done;
    expect(coordinator.running()).toBe(false);
    const steps = session.trace().length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(session.trace().length).toBe(steps);
    vi.useRealTimers();
  });

  it('recargar: el autoguardado v3 devuelve la sesión completa', () => {
    populate();
    const text = session.serializeSession();
    localStorage.setItem('silicio.autosave', text);
    session.source = 'HLT';
    session.load();
    session.pc.choose('suma-archivo');
    expect(session.restoreAutosave()).toBe(true);
    expect(session.pc.programId()).toBe('editar-guardar');
    expect(session.state().registers.AX).toBe(10);
  });

  it('con la cuota agotada el autoguardado falla en silencio y la sesión sigue intacta', () => {
    vi.useFakeTimers();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cuota', 'QuotaExceededError');
    });
    populate();
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
    expect(session.error()).toBe('');
    expect(session.trace()).toHaveLength(2);
    vi.useRealTimers();
  });

  it('un autoguardado dañado se descarta con aviso', () => {
    localStorage.setItem('silicio.autosave', '{"version":3,"cpu":1}');
    expect(session.restoreAutosave()).toBe(false);
    expect(session.notice()).toContain('descartó');
    expect(localStorage.getItem('silicio.autosave')).toBeNull();
  });

  it('la comparación enfrenta dos estados guardados, no la cinta completa', () => {
    session.source = 'MOV AX, 1\nMOV BX, 2\nMOV CX, 3\nHLT';
    session.load();
    session.capture();
    session.step();
    session.captureB();
    session.step();
    const names = session.comparison().map((d) => d.name);
    expect(names).toContain('AX');
    expect(names).not.toContain('BX');
    session.clearComparison();
    expect(session.comparison()).toEqual([]);
    expect(session.baseline()).toBeUndefined();
  });
});
