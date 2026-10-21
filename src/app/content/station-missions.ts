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
  /** Text on the PC's monitor and the content of resultado.txt on its SSD. */
  pcMonitor: string;
  pcResultFile: string;
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
    goal: 'Recorre la dependencia CPU, GPU y CPU con memoria unificada, sin la referencia de memoria separada.',
    hint: 'El buffer B0 no se mueve: la GPU se enlaza al mismo. La CPU lee B1 solo tras la señal de fin.',
    check: (c) => c.bufferStage === 2 && c.bufferCompleted && c.bufferVersion >= 1 && !c.separateMemory,
  },
  {
    id: 'M05',
    station: 'machine',
    title: 'Un archivo hasta el monitor',
    goal: 'Ejecuta «Sumar un archivo»: los valores 1, 2, 3 y 4 van del SSD a la RAM, la CPU los suma y el 10 llega al monitor y a resultado.txt.',
    hint: 'Elige el ejercicio, enciende el PC y pulsa Ejecutar. Abre el SSD y la RAM para ver dónde está cada dato en cada momento.',
    check: (c) => c.pcMonitor === '10' && c.pcResultFile === '10',
  },
];

export function missionFor(station: Section): StationMission | undefined {
  return STATION_MISSIONS.find((m) => m.station === station);
}
