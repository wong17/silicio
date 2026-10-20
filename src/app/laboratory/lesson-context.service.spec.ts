import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SimulationCoordinator } from './controllers/simulation-coordinator';
import type { SimulationController } from './controllers/simulation-controller';
import { LessonContext } from './lesson-context.service';
import { createArtifact } from '../simulation/learning-artifact';

const fake = (id: SimulationController['id'], step = 0): SimulationController => ({
  id,
  state: () => ({ status: 'ready', units: ['instruction'], canNext: true, canBack: step > 0, step }),
  next: async () => {},
  back: async () => {},
  restart: async () => {},
  pause: () => {},
});

describe('LessonContext', () => {
  let coordinator: SimulationCoordinator;
  let context: LessonContext;
  beforeEach(() => {
    coordinator = TestBed.inject(SimulationCoordinator);
    context = TestBed.inject(LessonContext);
    coordinator.register(fake('8086', 4));
    coordinator.register(fake('machine'));
    coordinator.register(fake('soc'));
  });

  it('cambiar solo de vista mantiene propietario, ejercicio y paso', () => {
    context.begin('suma', '8086');
    coordinator.changeView('8086');
    expect(context.currentStep()).toBe(4);
    coordinator.changeView('memory', 'bank-even');
    expect(context.controllerId()).toBe('8086');
    expect(context.lessonId()).toBe('suma');
    expect(context.currentStep()).toBe(4);
    expect(context.view()).toBe('memory');
    expect(context.consulting()).toBe(true);
    expect(context.home()).toBe('8086');
    coordinator.changeView('8086');
    expect(context.consulting()).toBe(false);
  });

  it('iniciar otro ejercicio es una acción explícita que cambia de propietario', () => {
    context.begin('suma', '8086');
    context.begin('mosaico', 'machine');
    expect(context.controllerId()).toBe('machine');
    expect(context.lessonId()).toBe('mosaico');
  });

  it('transfiere un mosaico validado y rechaza el tipo equivocado sin cambiar nada', () => {
    context.begin('mosaico', 'machine');
    context.offer(createArtifact('tile-image', 'machine', { width: 8, height: 8, pixels: Array(64).fill(10) }));
    expect(context.receive('tile-image', 'soc').pixels[0]).toBe(10);
    expect(() => context.receive('word-task', 'soc')).toThrow('No hay un resultado');
    expect(context.controllerId()).toBe('machine');
  });
});
