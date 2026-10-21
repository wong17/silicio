import type { Section } from '../world/scene-inputs';
import { TUTORIALS } from './tutorials';

/**
 * What a guide may look at: the real state of the laboratory. Steps advance when this satisfies them, never
 * because the student pressed «Siguiente» a number of times.
 */
export interface GuideContext {
  section: Section;
  /** 8086 */
  missionNumber: number;
  sourceEdited: boolean;
  assembled: boolean;
  executed: number;
  halted: boolean;
  ax: number;
  grain: 'instruction' | 'phase' | 'transfer' | 'access' | undefined;
  screen: string;
  /** Memory */
  memoryActivity: string;
  memoryStep: number;
  /** PC */
  pcPowered: boolean;
  pcSteps: number;
  pcHalted: boolean;
  pcMonitor: string;
  /** SoC */
  socStage: number;
  socCompleted: boolean;
}

export interface GuideStep {
  id: string;
  /** CSS selector of the element to highlight; a missing one skips the step with a notice. */
  anchor: string;
  /** Desk panel that has to be open before the highlight. */
  panel?: string;
  title: string;
  /** What to do, in one or two sentences. */
  text: string;
  /** A small drawing for the popover, only where it makes clear something that is on screen. */
  visual?: 'transport' | 'panels' | 'help' | 'phases';
  /** The state that completes the step. Without it the step is informative and has its own «Siguiente». */
  done?: (c: GuideContext) => boolean;
}

export interface LearningPath {
  id: string;
  experience: Section;
  title: string;
  /** What the student will have done at the end. */
  goal: string;
  steps: readonly GuideStep[];
}

export const LEARNING_PATHS: readonly LearningPath[] = [
  ...TUTORIALS,
  {
    id: '8086-primer-paso',
    experience: '8086',
    title: 'Tu primera instrucción',
    goal: 'Ejecutar ADD AX,[10] y ver qué cambió, sin leer nada antes.',
    steps: [
      {
        id: 'programa',
        anchor: '[data-guide="editor"]',
        panel: 'program',
        title: 'El programa',
        text: 'Aquí está el programa de la misión 01: una suma de la memoria a AX. La línea marcada es la próxima instrucción.',
      },
      {
        id: 'paso',
        anchor: '[data-guide="transport-step"]',
        title: 'Un paso',
        text: 'Pulsa Paso para ejecutar una instrucción.',
        done: (c) => c.executed >= 1,
      },
      {
        id: 'estado',
        anchor: '[data-guide="register-bank"]',
        panel: 'state',
        title: 'Qué cambió',
        text: 'AX pasó de 7 a 12: sumó el 5 que había en memoria. Los registros que cambian se marcan.',
        done: (c) => c.ax === 12,
      },
      {
        id: 'fases',
        anchor: '[data-guide="transport-grain"]',
        title: 'Por dentro',
        text: 'Cambia «Avanzar por» a Fase y pulsa Atrás y Paso: verás las siete fases de la misma instrucción.',
        done: (c) => c.grain === 'phase',
      },
    ],
  },
  {
    id: '8086-emu8086',
    experience: '8086',
    title: 'De EMU8086 a SILICIO',
    goal: 'Escribir, ensamblar y ejecutar un programa que escribe en la Pantalla.',
    steps: [
      {
        id: 'elige',
        anchor: '[data-guide="mission-select"]',
        panel: 'program',
        title: 'Elige un ejercicio',
        text: 'Elige «10 / Hola mundo» en Entrada y salida.',
        done: (c) => c.missionNumber === 10,
      },
      {
        id: 'escribe',
        anchor: '[data-guide="editor"]',
        title: 'Escribe',
        text: 'Cambia el texto de la cadena en el editor (por ejemplo, tu nombre antes del $).',
        done: (c) => c.sourceEdited,
      },
      {
        id: 'ensambla',
        anchor: '[data-guide="assemble"]',
        title: 'Ensambla',
        text: 'Pulsa «Ensamblar y reiniciar»: es el «compile» de EMU8086. Si hay un error, la línea se marca.',
        done: (c) => c.sourceEdited && c.assembled,
      },
      {
        id: 'ejecuta',
        anchor: '[data-guide="transport-run"]',
        title: 'Ejecuta',
        text: 'Pulsa Ejecutar. Los registros se ven en Estado.',
        done: (c) => c.halted,
      },
      {
        id: 'pantalla',
        anchor: '[data-guide="screen-display"]',
        panel: 'screen',
        title: 'La Pantalla',
        text: 'Aquí aparece lo que escribió INT 21h: el equivalente de la ventana «emulator screen».',
        done: (c) => c.screen.length > 0,
      },
    ],
  },
  {
    id: 'memoria-direccion',
    experience: 'memory',
    title: 'Una dirección por pasos',
    goal: 'Construir la dirección física de [BX+SI+4].',
    steps: [
      {
        id: 'actividad',
        anchor: '[data-guide="memory-tabs"]',
        panel: 'operation',
        title: 'Elige la actividad',
        text: 'Abre «Direcciones 8086».',
        done: (c) => c.memoryActivity === 'addresses',
      },
      {
        id: 'pasos',
        anchor: '[data-guide="memory-next"]',
        title: 'Cuatro pasos',
        text: 'Calcula cada paso a mano y pulsa «Siguiente paso» para comprobarlo.',
        done: (c) => c.memoryActivity === 'addresses' && c.memoryStep >= 4,
      },
      {
        id: 'resultado',
        anchor: '[data-guide="memory-steps"]',
        panel: 'result',
        title: 'La dirección física',
        text: 'La física es segmento × 16 + dirección efectiva. Aquí ves también la ventana de la placa.',
      },
    ],
  },
  {
    id: 'maquina-archivo',
    experience: 'machine',
    title: 'Un archivo hasta el monitor',
    goal: 'Seguir 1,2,3,4 del SSD a la RAM, sumarlos y ver el 10 en el monitor.',
    steps: [
      {
        id: 'ejercicio',
        anchor: '[data-guide="pc-exercise"]',
        panel: 'pc-program',
        title: 'Elige el ejercicio',
        text: 'Elige «Sumar un archivo».',
      },
      {
        id: 'enciende',
        anchor: '[data-guide="pc-power"]',
        title: 'Enciende',
        text: 'Pulsa «Encender y arrancar»: el cargador de la ROM copia el programa del SSD a la RAM.',
        done: (c) => c.pcPowered,
      },
      {
        id: 'ejecuta',
        anchor: '[data-guide="transport-run"]',
        title: 'Ejecuta',
        text: 'Pulsa Ejecutar y mira las transferencias de cada paso.',
        done: (c) => c.pcHalted,
      },
      {
        id: 'salida',
        anchor: '[data-guide="pc-monitor"]',
        panel: 'pc-components',
        title: 'La salida',
        text: 'El monitor muestra 10, y resultado.txt quedó guardado en el SSD.',
        done: (c) => c.pcMonitor === '10',
      },
    ],
  },
  {
    id: 'soc-mosaico',
    experience: 'apple',
    title: 'Memoria unificada',
    goal: 'Recorrer la dependencia CPU, GPU y CPU y ver la imagen invertida.',
    steps: [
      {
        id: 'modo',
        anchor: '[data-guide="soc-mode"]',
        panel: 'instruments',
        title: 'Elige la memoria',
        text: 'Empieza con memoria compartida.',
      },
      {
        id: 'recorre',
        anchor: '[data-guide="transport-step"]',
        title: 'Recorre la dependencia',
        text: 'Pulsa Paso dos veces: la CPU prepara, la GPU procesa y la CPU recibe.',
        done: (c) => c.socCompleted,
      },
    ],
  },
];

export const pathsFor = (section: Section): LearningPath[] => LEARNING_PATHS.filter((p) => p.experience === section);

export function pathById(id: string): LearningPath | undefined {
  return LEARNING_PATHS.find((p) => p.id === id);
}

/** Index of the first step the state does not complete yet, starting from `from`; steps without a condition wait. */
export function firstPending(path: LearningPath, context: GuideContext, from = 0): number {
  for (let i = from; i < path.steps.length; i++) {
    const done = path.steps[i].done;
    if (!done || !done(context)) return i;
  }
  return path.steps.length;
}
