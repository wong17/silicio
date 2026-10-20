import { Injectable, computed, inject, signal } from '@angular/core';
import { SimulationCoordinator } from './controllers/simulation-coordinator';
import {
  ADDRESSING_MODES,
  ExerciseMemory,
  buildAddress,
  type BaseRegister,
  type BuiltAddress,
  type WordFormat,
} from '../simulation/memory-lesson';

export type MemoryActivity = 'store' | 'addresses' | 'cache' | 'ram';
/** Where the data of the activity lives: its own bytes, the 8086 session, or the PC's RAM (T06). */
export type MemoryOrigin = 'exercise' | 'session' | 'pc';

export const ACTIVITIES: readonly { id: MemoryActivity; label: string; question: string }[] = [
  { id: 'store', label: 'Guardar y leer', question: '¿Dónde quedan los dos bytes de una palabra?' },
  { id: 'addresses', label: 'Direcciones 8086', question: '¿Qué dirección física alcanza un operando?' },
  { id: 'cache', label: 'Caché', question: '¿Acierto o fallo? Predice cada lectura.' },
  { id: 'ram', label: 'Cómo se organiza la RAM', question: '¿Cómo forman ocho chips un ancho de 64 bits?' },
];

/** Levels of the hierarchy, from the processor outward; no latency figures without a source. */
export const LEVELS = ['Registros', 'Caché', 'RAM', 'Almacenamiento'] as const;
export const ACTIVITY_LEVEL: Readonly<Record<MemoryActivity, readonly (typeof LEVELS)[number][]>> = {
  store: ['RAM'],
  addresses: ['Registros', 'RAM'],
  cache: ['Caché', 'RAM'],
  ram: ['RAM'],
};

export const STEPS_OF: Readonly<Record<MemoryActivity, number>> = { store: 3, addresses: 4, cache: 0, ram: 3 };

export const RAM_STEPS = [
  'Cada chip DDR4 de la galería aporta 8 bits: es un componente de 1G×8.',
  'Los ocho componentes trabajan a la vez y forman un ancho de 64 bits (un rango).',
  'La palabra de 16 bits del procesador, el ancho de 64 bits del canal y la ráfaga de 8 transferencias son tres cosas distintas: una ráfaga completa mueve 64 bytes.',
] as const;

/**
 * The memory exercises: which activity is open, the isolated memory of the exercise, the inputs of each
 * activity and how far its steps have been revealed. The 8086 session and the PC are read, never copied.
 */
@Injectable({ providedIn: 'root' })
export class MemoryLessonService {
  private readonly coordinator = inject(SimulationCoordinator);
  readonly activity = signal<MemoryActivity>('store');
  readonly format = signal<WordFormat>('hex');
  /** Bytes of the isolated exercise. */
  readonly exercise = new ExerciseMemory();
  readonly revision = signal(0);
  /** Revealed steps of each activity. */
  readonly progress = signal<Record<MemoryActivity, number>>({ store: 0, addresses: 0, cache: 0, ram: 0 });

  /** Inputs of «Direcciones 8086» (hexadecimal text, as typed). */
  readonly mode = signal('bx+si');
  readonly regBX = signal('0010');
  readonly regBP = signal('0000');
  readonly regSI = signal('0002');
  readonly regDI = signal('0000');
  readonly displacement = signal('0004');
  readonly segDS = signal('1000');
  readonly segSS = signal('3000');
  /** Value of the word to store, in hexadecimal. */
  readonly value = signal('1234');

  readonly modes = ADDRESSING_MODES;

  /** Which memory the activity works on follows who owns the clock. */
  readonly origin = computed<MemoryOrigin>(() => {
    const owner = this.coordinator.activeId();
    return owner === '8086' ? 'session' : owner === 'machine' ? 'pc' : 'exercise';
  });

  readonly step = computed(() => this.progress()[this.activity()]);
  readonly total = computed(() => STEPS_OF[this.activity()]);

  private parse(text: string): number | undefined {
    return /^[0-9a-f]{1,4}$/i.test(text.trim()) ? parseInt(text, 16) : undefined;
  }

  /** The address of the operand, built from the typed registers; undefined while a field is not valid hexadecimal. */
  readonly built = computed<BuiltAddress | undefined>(() => {
    const read = (s: string) => this.parse(s);
    const [bx, bp, si, di, disp, ds, ss] = [
      read(this.regBX()),
      read(this.regBP()),
      read(this.regSI()),
      read(this.regDI()),
      read(this.displacement()),
      read(this.segDS()),
      read(this.segSS()),
    ];
    if ([bx, bp, si, di, disp, ds, ss].some((v) => v === undefined)) return undefined;
    return buildAddress({
      mode: this.mode(),
      registers: { BX: bx!, BP: bp!, SI: si!, DI: di! } as Record<BaseRegister, number>,
      displacement: disp!,
      segments: { DS: ds!, SS: ss! },
    });
  });

  /** Text the cache predictions are waiting for, if any; supplied by the session's cache lesson. */
  waiting: () => string | undefined = () => undefined;

  select(activity: MemoryActivity): void {
    this.activity.set(activity);
  }

  advance(): void {
    const a = this.activity();
    if (this.progress()[a] >= STEPS_OF[a]) return;
    this.progress.update((p) => ({ ...p, [a]: p[a] + 1 }));
  }

  reset(): void {
    const a = this.activity();
    this.progress.update((p) => ({ ...p, [a]: 0 }));
    this.revision.update((n) => n + 1);
  }

  /** Loads the exercise values: the registers of the example in the plan. */
  useExample(): void {
    this.mode.set('bx+si');
    this.regBX.set('0010');
    this.regSI.set('0002');
    this.regBP.set('0000');
    this.regDI.set('0000');
    this.displacement.set('0004');
    this.segDS.set('1000');
    this.segSS.set('3000');
    this.progress.update((p) => ({ ...p, addresses: 0 }));
  }

  /** Switches to the exercise's own memory: hands the clock to it and pauses whoever had it. */
  startExercise(): void {
    this.coordinator.activate('memory-lesson');
  }

  /** Back to the 8086 session: its program, step and history are where the student left them. */
  useSession(): void {
    this.coordinator.activate('8086');
  }
}
