import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationCoordinator } from './simulation-coordinator';
import {
  RUN_STEP_LIMIT,
  type AdvanceUnit,
  type ControllerId,
  type PlaybackStatus,
  type SimulationController,
  type TransportState,
} from './simulation-controller';

class Fake implements SimulationController {
  status: PlaybackStatus = 'ready';
  step = 0;
  limit = Infinity;
  calls: string[] = [];
  gate?: { resolve: () => void };
  hold = false;
  paused = 0;
  constructor(readonly id: ControllerId) {}
  state(): TransportState {
    return {
      status: this.status,
      units: ['instruction', 'phase'],
      canNext: this.status !== 'waiting-input' && this.status !== 'finished' && this.step < this.limit,
      canBack: this.step > 0,
      step: this.step,
    };
  }
  async next(unit: AdvanceUnit): Promise<void> {
    this.calls.push('next:' + unit);
    if (this.hold) await new Promise<void>((resolve) => (this.gate = { resolve }));
    this.step++;
  }
  async back(unit: AdvanceUnit): Promise<void> {
    this.calls.push('back:' + unit);
    this.step--;
  }
  async restart(): Promise<void> {
    this.calls.push('restart');
    this.step = 0;
  }
  pause(): void {
    this.paused++;
  }
}

describe('SimulationCoordinator', () => {
  let c: SimulationCoordinator;
  let cpu: Fake;
  let machine: Fake;
  beforeEach(() => {
    vi.useFakeTimers();
    c = TestBed.inject(SimulationCoordinator);
    cpu = new Fake('8086');
    machine = new Fake('machine');
    c.register(cpu);
    c.register(machine);
  });
  afterEach(() => {
    c.pause();
    vi.useRealTimers();
  });

  it('doble Play no crea dos relojes', async () => {
    c.activate('8086');
    c.run();
    c.run();
    c.run();
    await vi.advanceTimersByTimeAsync(0);
    expect(cpu.calls).toEqual(['next:instruction']);
    await vi.advanceTimersByTimeAsync(450 * 3);
    // One tick every 450 ms: the first at 0 and three more, never doubled.
    expect(cpu.calls.length).toBe(4);
  });

  it('el siguiente paso espera a que responda el anterior', async () => {
    c.activate('8086');
    cpu.hold = true;
    c.run();
    await vi.advanceTimersByTimeAsync(5000);
    expect(cpu.calls).toEqual(['next:instruction']);
    cpu.gate!.resolve();
    cpu.hold = false;
    await vi.advanceTimersByTimeAsync(0);
    expect(cpu.step).toBe(1);
    await vi.advanceTimersByTimeAsync(450);
    expect(cpu.calls.length).toBe(2);
  });

  it('cambiar de modelo con un next pendiente descarta la respuesta vieja', async () => {
    c.activate('8086');
    cpu.hold = true;
    c.run();
    await vi.advanceTimersByTimeAsync(0);
    c.activate('machine');
    expect(cpu.paused).toBeGreaterThan(0);
    expect(c.running()).toBe(false);
    cpu.hold = false;
    cpu.gate!.resolve();
    await vi.advanceTimersByTimeAsync(5000);
    expect(machine.calls).toEqual([]);
    expect(cpu.calls).toEqual(['next:instruction']);
    expect(c.activeId()).toBe('machine');
    expect(c.running()).toBe(false);
  });

  it('volver a un modelo pausado no lo reanuda', async () => {
    c.activate('8086');
    c.run();
    await vi.advanceTimersByTimeAsync(0);
    c.activate('machine');
    c.activate('8086');
    await vi.advanceTimersByTimeAsync(5000);
    expect(cpu.calls.length).toBe(1);
    expect(c.running()).toBe(false);
  });

  it('consultar la memoria desde el 8086 conserva propietario y paso; otro capítulo cambia el motor', async () => {
    c.changeView('8086');
    await c.step();
    await c.step();
    expect(cpu.step).toBe(2);
    c.changeView('memory', 'bank-even');
    expect(c.activeId()).toBe('8086');
    expect(c.view()).toBe('memory');
    expect(c.focusPiece()).toBe('bank-even');
    expect(c.transport()!.step).toBe(2);
    expect(cpu.paused).toBe(0);
    c.changeView('8086');
    expect(c.activeId()).toBe('8086');
    c.changeView('machine');
    expect(c.activeId()).toBe('machine');
    expect(cpu.paused).toBeGreaterThan(0);
    expect(cpu.step).toBe(2);
  });

  it('esperar teclado detiene la ejecución sin reanudarla sola', async () => {
    c.activate('8086');
    c.run();
    await vi.advanceTimersByTimeAsync(450);
    cpu.status = 'waiting-input';
    await vi.advanceTimersByTimeAsync(5000);
    const calls = cpu.calls.length;
    expect(c.running()).toBe(false);
    cpu.status = 'ready';
    await vi.advanceTimersByTimeAsync(5000);
    expect(cpu.calls.length).toBe(calls);
  });

  it('muestra el motivo de la espera y el estado de ejecución', async () => {
    c.activate('8086');
    c.run();
    await vi.advanceTimersByTimeAsync(0);
    expect(c.transport()!.status).toBe('running');
    expect(c.transport()!.label).toBe('8086 · Instrucción');
    c.pause();
    expect(c.transport()!.status).toBe('ready');
  });

  it('se detiene en el límite de pasos y lo explica', async () => {
    c.activate('8086');
    c.setSpeed('fast');
    c.run();
    await vi.advanceTimersByTimeAsync(120 * (RUN_STEP_LIMIT + 10));
    expect(cpu.step).toBe(RUN_STEP_LIMIT);
    expect(c.running()).toBe(false);
    expect(c.transport()!.reason).toContain('límite de ' + RUN_STEP_LIMIT);
  });

  it('se detiene sola al terminar el programa', async () => {
    c.activate('8086');
    cpu.limit = 3;
    c.run();
    await vi.advanceTimersByTimeAsync(5000);
    expect(cpu.step).toBe(3);
    expect(c.running()).toBe(false);
  });

  it('la velocidad cambia el ritmo, no el trabajo por paso', async () => {
    c.activate('8086');
    c.setSpeed('slow');
    c.run();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(899);
    expect(cpu.calls.length).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(cpu.calls.length).toBe(2);
  });

  it('un paso manual no corre mientras hay una ejecución', async () => {
    c.activate('8086');
    c.run();
    await vi.advanceTimersByTimeAsync(0);
    await c.step();
    expect(cpu.calls.length).toBe(1);
  });

  it('Atrás pausa; Reiniciar restaura; el grano elegido se respeta', async () => {
    c.activate('8086');
    await c.step();
    await c.step();
    c.setGrain('phase');
    await c.step();
    expect(cpu.calls.at(-1)).toBe('next:phase');
    c.run();
    await vi.advanceTimersByTimeAsync(0);
    await c.back();
    expect(c.running()).toBe(false);
    expect(cpu.calls.at(-1)).toBe('back:phase');
    await c.restart();
    expect(cpu.step).toBe(0);
  });

  it('un error del motor detiene la ejecución con su mensaje', async () => {
    c.activate('8086');
    cpu.next = async () => {
      throw Error('Opcode no admitido');
    };
    c.run();
    await vi.advanceTimersByTimeAsync(0);
    expect(c.running()).toBe(false);
    expect(c.transport()!.reason).toBe('Opcode no admitido');
  });
});
