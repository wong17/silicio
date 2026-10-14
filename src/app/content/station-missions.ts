import type { Section } from '../world/scene-inputs';

/** The real session state a mission may inspect; nothing here is a copy that the student can edit. */
export interface MissionContext {
  segment: number;
  offset: number;
  physical: number;
  /** Executed steps, oldest first: the registers that changed and the cursor. */
  trace: { changed: string[] }[];
  cursor: number;
  bufferStage: number;
  bufferCompleted: boolean;
  bufferVersion: number;
  separateMemory: boolean;
  machineStage: number;
  machineOutput: number;
}

export interface StationMission {
  id: string;
  station: Exclude<Section, 'atrium' | '8086'>;
  title: string;
  goal: string;
  hint: string;
  /** True when the real state satisfies the mission. */
  check(ctx: MissionContext): boolean;
}

export const TARGET_CELL = 0x2000a;

export const STATION_MISSIONS: readonly StationMission[] = [
  {
    id: 'M04',
    station: 'memory',
    title: 'Dos direcciones, un mismo lugar',
    goal: 'La celda 2000Ah está en la mitad del banco par. Elige un segmento y un offset distintos de 2000:000A que apunten a esa misma celda.',
    hint: 'Suma 1 al segmento y réstale 16 al offset: segmento × 16 + offset no cambia.',
    check: (c) => c.physical === TARGET_CELL && !(c.segment === 0x2000 && c.offset === 0x000a),
  },
  {
    id: 'M06',
    station: 'time',
    title: 'El paso que cambió AX',
    goal: 'Ejecuta un programa con varios pasos y deja el cursor en el primer paso que modificó AX.',
    hint: 'Retrocede con la flecha y mira qué cuadro de la cinta marca AX como registro cambiado.',
    check: (c) => {
      const first = c.trace.findIndex((t) => t.changed.includes('AX'));
      return c.trace.length >= 3 && first >= 0 && c.cursor === first;
    },
  },
  {
    id: 'M07',
    station: 'apple',
    title: 'Compartir sin copiar',
    goal: 'Recorre la dependencia CPU → GPU → CPU con memoria unificada, sin la referencia de memoria separada.',
    hint: 'El buffer B0 no se mueve: la GPU se enlaza al mismo. La CPU lee B1 solo tras la señal de fin.',
    check: (c) => c.bufferStage === 2 && c.bufferCompleted && c.bufferVersion >= 1 && !c.separateMemory,
  },
  {
    id: 'M05',
    station: 'machine',
    title: 'Un dato hasta la salida',
    goal: 'Sigue el dato 0007h: léelo de la RAM, súmale 5, escríbelo de vuelta y llévalo a la salida.',
    hint: 'Son ocho pasos; en cada uno se enciende un solo bus. El valor final en la salida es 000Ch.',
    check: (c) => c.machineStage === 8 && c.machineOutput === 12,
  },
];

export function missionFor(station: Section): StationMission | undefined {
  return STATION_MISSIONS.find((m) => m.station === station);
}
