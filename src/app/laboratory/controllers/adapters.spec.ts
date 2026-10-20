import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COURSE_PROGRAMS } from '../../content/course-programs';
import { LabSession } from '../lab-session.service';
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

  it('PC: recorre las ocho transferencias y reinicia', async () => {
    coordinator.activate('machine');
    session.resetMachine();
    for (let n = 1; n <= 8; n++) await coordinator.step();
    expect(coordinator.transport()).toMatchObject({ status: 'finished', step: 8, canNext: false, units: ['transfer'] });
    await coordinator.restart();
    expect(coordinator.transport()).toMatchObject({ status: 'ready', step: 0 });
  });

  it('SoC: las tres etapas de la dependencia CPU → GPU → CPU', async () => {
    coordinator.activate('soc');
    await coordinator.restart();
    await coordinator.step();
    await coordinator.step();
    expect(coordinator.transport()).toMatchObject({ status: 'finished', step: 2 });
    expect(session.bufferView().completed).toBe(true);
    await coordinator.restart();
    expect(session.bufferView().completed).toBe(false);
  });

  it('Memoria: las predicciones son el paso; el transporte lo explica y no ofrece Play', async () => {
    coordinator.activate('memory-lesson');
    await coordinator.restart();
    const t = coordinator.transport()!;
    expect(t).toMatchObject({ status: 'waiting-input', canNext: false, reason: 'Predice acierto o fallo', units: ['access'] });
    coordinator.run();
    expect(coordinator.running()).toBe(false);
    session.predictCache(true);
    expect(coordinator.transport()!.step).toBe(1);
    await expect(coordinator.active()!.next('access')).rejects.toThrow('Predice');
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
