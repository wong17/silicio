import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COURSE_PROGRAMS } from '../../content/course-programs';
import { LabSession } from '../lab-session.service';
import { LessonContext } from '../lesson-context.service';
import { createArtifact } from '../../simulation/learning-artifact';
import { SimulationCoordinator } from './simulation-coordinator';

describe('adaptadores de simulación sobre LabSession', () => {
  let session: LabSession;
  let coordinator: SimulationCoordinator;
  beforeEach(() => {
    vi.useFakeTimers();
    session = TestBed.inject(LabSession);
    coordinator = TestBed.inject(SimulationCoordinator);
  });
  afterEach(() => {
    coordinator.pause();
    vi.useRealTimers();
  });

  it('8086: un paso por instrucción, hasta finalizar, y reiniciar vuelve al inicio', async () => {
    session.source = 'MOV AX, 5\nHLT';
    session.load();
    coordinator.activate('8086');
    expect(coordinator.transport()).toMatchObject({ status: 'ready', canBack: false, canNext: true, step: 0, units: ['instruction', 'phase'] });
    await coordinator.step();
    expect(coordinator.transport()).toMatchObject({ status: 'paused', canBack: true, step: 1 });
    expect(session.state().registers.AX).toBe(5);
    await coordinator.step();
    expect(coordinator.transport()).toMatchObject({ status: 'finished', canNext: false, step: 2 });
    await coordinator.back();
    expect(session.state().halted).toBe(false);
    await coordinator.restart();
    expect(coordinator.transport()).toMatchObject({ status: 'ready', step: 0 });
    expect(session.state().registers.AX).toBe(7);
  });

  it('8086: Ejecutar recorre el programa con un solo reloj y se detiene en HLT', async () => {
    session.source = 'MOV CX, 3\notra: DEC CX\nJNZ otra\nHLT';
    session.load();
    coordinator.activate('8086');
    coordinator.run();
    coordinator.run();
    await vi.advanceTimersByTimeAsync(450 * 20);
    expect(session.state().halted).toBe(true);
    expect(session.trace()).toHaveLength(8);
    expect(coordinator.running()).toBe(false);
  });

  it('8086: esperar teclado se muestra con su motivo y detiene la ejecución; escribir la tecla permite seguir', async () => {
    const program = COURSE_PROGRAMS.find((p) => p.mission === 11)!;
    session.source = program.source;
    session.load();
    coordinator.activate('8086');
    coordinator.run();
    await vi.advanceTimersByTimeAsync(450 * 6);
    const t = coordinator.transport()!;
    expect(t.status).toBe('waiting-input');
    expect(t.reason).toBe('Esperando teclado');
    expect(t.canNext).toBe(false);
    expect(coordinator.running()).toBe(false);
    const steps = session.trace().length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(session.trace()).toHaveLength(steps);
  });

  it('cambiar de estación pausa el 8086 y conserva su paso', async () => {
    session.source = 'MOV AX, 5\nNOP\nNOP\nHLT';
    session.load();
    coordinator.changeView('8086');
    coordinator.run();
    await vi.advanceTimersByTimeAsync(450);
    const step = session.cursor();
    coordinator.changeView('machine');
    expect(coordinator.running()).toBe(false);
    await vi.advanceTimersByTimeAsync(5000);
    expect(session.cursor()).toBe(step);
    coordinator.changeView('8086');
    expect(coordinator.transport()!.step).toBe(step + 1);
    expect(coordinator.running()).toBe(false);
  });

  it('PC: el primer paso enciende, luego cada instrucción; Atrás y Reiniciar restauran la máquina', async () => {
    coordinator.activate('machine');
    session.pc.choose('suma-archivo');
    expect(coordinator.transport()).toMatchObject({ status: 'ready', step: 0, canNext: true, canBack: false, units: ['instruction', 'transfer'] });
    await coordinator.step();
    expect(session.pc.powered()).toBe(true);
    expect(session.pc.state().pc).toBe(0);
    await coordinator.step();
    await coordinator.step();
    expect(session.pc.state().pc).toBe(0x1000);
    expect(session.pc.state().ram.program[0]).not.toBe(0);
    await coordinator.back();
    expect(session.pc.state().pc).toBe(1);
    expect(session.pc.state().ram.program[0]).not.toBe(0);
    await coordinator.back();
    expect(session.pc.state().pc).toBe(0);
    expect(session.pc.state().ram.program[0]).toBe(0);
    await coordinator.restart();
    expect(coordinator.transport()).toMatchObject({ status: 'ready', step: 0 });
    expect(session.pc.powered()).toBe(false);
  });

  it('PC: Ejecutar recorre el programa hasta HALT y el resultado llega al monitor y al SSD', async () => {
    coordinator.activate('machine');
    session.pc.choose('suma-archivo');
    coordinator.run();
    await vi.advanceTimersByTimeAsync(450 * 300);
    expect(session.pc.halted()).toBe(true);
    expect(coordinator.running()).toBe(false);
    expect(session.pc.state().monitor.text).toBe('10');
    expect(session.pc.fileText('resultado.txt')).toBe('10');
    expect(coordinator.transport()!.status).toBe('finished');
  });

  it('PC: esperar el teclado detiene Ejecutar sin reanudarlo solo; escribir la tecla permite seguir', async () => {
    coordinator.activate('machine');
    session.pc.choose('hola-sondeo');
    coordinator.run();
    await vi.advanceTimersByTimeAsync(450 * 60);
    expect(coordinator.running()).toBe(true);
    session.pc.type('Hola\n');
    await vi.advanceTimersByTimeAsync(450 * 200);
    expect(session.pc.halted()).toBe(true);
    expect(session.pc.state().monitor.text.trim()).toBe('Hola');
  });

  it('PC: una entrada rechazada se explica y no cambia la máquina', () => {
    session.pc.choose('suma-archivo');
    const before = JSON.stringify(session.pc.state());
    session.pc.importText('datos.csv', '1,2,x');
    expect(session.pc.message()).toContain('Valor inválido');
    expect(JSON.stringify(session.pc.state())).toBe(before);
  });

  it('SoC: las tres etapas de la dependencia CPU, GPU y CPU', async () => {
    coordinator.activate('soc');
    await coordinator.restart();
    await coordinator.step();
    await coordinator.step();
    expect(coordinator.transport()).toMatchObject({ status: 'finished', step: 2 });
    expect(session.bufferView().completed).toBe(true);
    await coordinator.restart();
    expect(session.bufferView().completed).toBe(false);
  });

  it('Memoria (caché): las predicciones son el paso; el transporte lo explica y no ofrece Play', async () => {
    coordinator.activate('memory-lesson');
    session.memoryLesson.select('cache');
    await coordinator.restart();
    const t = coordinator.transport()!;
    expect(t).toMatchObject({ status: 'waiting-input', canNext: false, reason: 'Predice acierto o fallo', units: ['access'] });
    coordinator.run();
    expect(coordinator.running()).toBe(false);
    session.predictCache(true);
    expect(coordinator.transport()!.step).toBe(1);
    await expect(coordinator.active()!.next('access')).rejects.toThrow('Predice');
  });

  it('Memoria (guardar y leer): tres pasos escriben el byte bajo, el alto y leen la palabra, solo en el ejercicio', async () => {
    session.source = 'ADD AX, [10]\nHLT';
    session.load();
    coordinator.activate('memory-lesson');
    session.section.set('memory');
    session.memoryLesson.select('store');
    session.memoryLesson.value.set('1234');
    session.segment.set(0x1000);
    session.offset.set(0x20);
    const before = JSON.stringify(session.state());
    await coordinator.restart();
    expect(coordinator.transport()).toMatchObject({ status: 'ready', step: 0, canNext: true });
    await coordinator.step();
    expect(session.memoryLesson.exercise.byte(0x10020)).toBe(0x34);
    expect(session.memoryLesson.exercise.byte(0x10021)).toBe(0);
    await coordinator.step();
    expect(session.memoryLesson.exercise.byte(0x10021)).toBe(0x12);
    await coordinator.step();
    expect(session.wordAtAddress()).toBe(0x1234);
    expect(coordinator.transport()).toMatchObject({ status: 'finished', canNext: false, step: 3 });
    expect(JSON.stringify(session.state())).toBe(before);
    await coordinator.restart();
    expect(session.memoryLesson.exercise.byte(0x10020)).toBe(0);
  });

  it('Memoria: la sesión 8086 se consulta sin pausarla y editarla la pausa pero conserva el retroceso', async () => {
    session.source = 'MOV AX, 5\nNOP\nHLT';
    session.load();
    coordinator.changeView('8086');
    await coordinator.step();
    coordinator.changeView('memory');
    expect(session.memoryLesson.origin()).toBe('session');
    expect(coordinator.activeId()).toBe('8086');
    session.section.set('memory');
    session.memoryLesson.select('store');
    session.segment.set(0x2000);
    session.offset.set(0x40);
    session.memoryLesson.value.set('00ab');
    session.advanceMemory();
    session.advanceMemory();
    expect(session.state().memory[0x20040]).toBe(0xab);
    expect(session.trace()).toHaveLength(1);
    await coordinator.back();
    expect(session.cursor()).toBe(-1);
    expect(coordinator.activeId()).toBe('8086');
  });
});

describe('grano fase, puntos de interrupción y teclado', () => {
  let session: LabSession;
  let coordinator: SimulationCoordinator;
  beforeEach(() => {
    vi.useFakeTimers();
    session = TestBed.inject(LabSession);
    coordinator = TestBed.inject(SimulationCoordinator);
  });
  afterEach(() => {
    coordinator.pause();
    vi.useRealTimers();
  });

  it('las siete fases de una instrucción generan un solo evento y el mismo resultado que Paso instrucción', async () => {
    session.source = 'ADD AX, [10]\nHLT';
    session.load();
    coordinator.activate('8086');
    coordinator.setGrain('phase');
    const shown: number[] = [];
    for (let n = 0; n < 7; n++) {
      await coordinator.step();
      shown.push(session.shownState().registers.AX);
      expect(session.trace()).toHaveLength(1);
    }
    expect(shown).toEqual([7, 7, 7, 7, 7, 12, 12]);
    expect(session.explaining()).toBe(6);
    expect(coordinator.transport()!.detail).toBe('Explicando instrucción 1 · Ejecución 7/7');
    const phased = JSON.stringify(session.state());
    session.load();
    coordinator.setGrain('instruction');
    await coordinator.step();
    expect(JSON.stringify(session.state())).toBe(phased);
  });

  it('la octava pulsación ejecuta la siguiente instrucción y Atrás por fase retrocede una fase', async () => {
    session.source = 'MOV AX, 5\nMOV BX, 6\nHLT';
    session.load();
    coordinator.activate('8086');
    coordinator.setGrain('phase');
    for (let n = 0; n < 8; n++) await coordinator.step();
    expect(session.trace()).toHaveLength(2);
    expect(session.explaining()).toBe(0);
    await coordinator.back();
    expect(session.trace()).toHaveLength(2);
    expect(session.cursor()).toBe(0);
    expect(session.explaining()).toBe(6);
    await coordinator.back();
    expect(session.explaining()).toBe(5);
  });

  it('cambiar a grano instrucción abandona la explicación y muestra el estado confirmado', async () => {
    session.source = 'MOV AX, 5\nHLT';
    session.load();
    coordinator.activate('8086');
    coordinator.setGrain('phase');
    await coordinator.step();
    expect(session.shownState().registers.AX).toBe(7);
    coordinator.setGrain('instruction');
    await coordinator.step();
    expect(session.explaining()).toBeUndefined();
    expect(session.shownState().registers.AX).toBe(5);
    expect(session.state().halted).toBe(true);
  });

  it('un punto de interrupción detiene Ejecutar antes de su línea y continuar avanza una instrucción', async () => {
    session.source = 'MOV AX, 1\nMOV BX, 2\nMOV CX, 3\nMOV DX, 4\nHLT';
    session.load();
    session.toggleBreakpoint(3);
    coordinator.activate('8086');
    coordinator.run();
    await vi.advanceTimersByTimeAsync(450 * 10);
    expect(session.state().registers.CX).toBe(0);
    expect(session.state().registers.BX).toBe(2);
    expect(coordinator.running()).toBe(false);
    expect(coordinator.transport()!.reason).toBe('Punto de interrupción antes de la línea 3');
    coordinator.run();
    await vi.advanceTimersByTimeAsync(450 * 10);
    expect(session.state().halted).toBe(true);
    expect(session.state().registers.CX).toBe(3);
    session.toggleBreakpoint(3);
    expect(session.breakpoints().size).toBe(0);
  });

  it('un breakpoint en la primera línea no impide empezar y HLT no añade pasos', async () => {
    session.source = 'MOV AX, 9\nHLT';
    session.load();
    session.toggleBreakpoint(1);
    coordinator.activate('8086');
    coordinator.run();
    await vi.advanceTimersByTimeAsync(450 * 5);
    expect(session.state().halted).toBe(true);
    expect(session.trace()).toHaveLength(2);
    await coordinator.step();
    expect(session.trace()).toHaveLength(2);
  });

  it('escribir las teclas de la misión 11 reanuda el programa y la Pantalla muestra el resultado', async () => {
    const mission = session.missions.find((m) => m.number === 11)!;
    session.source = mission.source;
    session.load();
    coordinator.activate('8086');
    coordinator.run();
    await vi.advanceTimersByTimeAsync(450 * 5);
    expect(coordinator.transport()!.status).toBe('waiting-input');
    session.typeKeys('3');
    expect(coordinator.transport()!.status).not.toBe('waiting-input');
    coordinator.run();
    await vi.advanceTimersByTimeAsync(450 * 6);
    session.typeKeys('4');
    coordinator.run();
    await vi.advanceTimersByTimeAsync(450 * 30);
    expect(session.state().halted).toBe(true);
    expect(session.io().screen).toBe('34=7');
    expect(session.missionComplete()).toBe(false);
    session.missionIndex.set(session.missions.indexOf(mission));
    expect(session.missionComplete()).toBe(true);
  });

  it('Atrás en un programa con Pantalla devuelve el texto anterior', async () => {
    const mission = session.missions.find((m) => m.number === 10)!;
    session.missionIndex.set(session.missions.indexOf(mission));
    session.source = mission.source;
    session.load();
    coordinator.activate('8086');
    for (let n = 0; n < 3; n++) await coordinator.step();
    expect(session.io().screen).toBe('Hola mundo');
    await coordinator.back();
    expect(session.io().screen).toBe('');
  });
});

describe('de un modelo a otro mediante artefactos', () => {
  it('el mosaico del PC llega al SoC sin reescribirlo y el PC conserva su paso y sus datos', async () => {
    const session = TestBed.inject(LabSession);
    const lesson = TestBed.inject(LessonContext);
    session.pc.choose('imagen-inversa');
    for (let n = 0; n < 3000 && !session.pc.halted(); n++) session.pc.step();
    const before = JSON.stringify(session.pc.state());
    const artifact = session.pc.imageArtifact()!;
    lesson.offer(artifact);
    const tile = lesson.receive('tile-image', 'soc');
    session.setBufferTile(tile.pixels);
    session.nextBuffer();
    session.nextBuffer();
    expect(session.bufferView().output.values).toEqual(artifact.payload.result);
    expect(JSON.stringify(session.pc.state())).toBe(before);
  });

  it('un artefacto de otro tipo se rechaza sin cambiar el SoC', () => {
    const session = TestBed.inject(LabSession);
    const lesson = TestBed.inject(LessonContext);
    lesson.offer(createArtifact('word-task', '8086', { accumulator: 7, word: 5 }));
    const before = JSON.stringify(session.bufferView());
    expect(() => lesson.receive('tile-image', 'soc')).toThrow();
    expect(JSON.stringify(session.bufferView())).toBe(before);
    expect(lesson.receive('word-task', 'soc')).toEqual({ accumulator: 7, word: 5 });
  });
});
