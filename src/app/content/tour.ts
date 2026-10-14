import type { Section } from '../world/scene-inputs';

export interface TourStep {
  id: string;
  /** Time slot of the eight-minute talk, as in the exhibition guide. */
  slot: string;
  station: Exclude<Section, 'atrium'>;
  title: string;
  /** One line of support text that stays on screen. */
  line: string;
  /** Piece to select and frame; it must exist in the station. */
  piece: string;
  /** Memory station only: which model the step needs. */
  memoryModel?: 'classic' | 'dimm';
  /** Console tab to show on the 8086 station. */
  tab?: 'state' | 'program' | 'trace';
  /** Whether the chip should be open. */
  open?: boolean;
  /** Camera for the step: a readable distance and angle instead of a tight fit to the piece. */
  view: { distance: number; azimuth: number; polar: number };
}

/** The exhibition guide as a walk: each step places the camera, selects a piece and states the point. */
export const TOUR: readonly TourStep[] = [
  {
    id: 'bench',
    slot: '0:00',
    station: '8086',
    title: 'Banco físico',
    line: 'Encapsulado cerámico, 40 terminales, tapa, zócalo y placa. Una maqueta didáctica, no un plano.',
    piece: 'lid',
    tab: 'state',
    open: false,
    view: { distance: 13, azimuth: 22, polar: 52 },
  },
  {
    id: 'ale',
    slot: '0:30',
    station: '8086',
    title: 'ALE y la multiplexación',
    line: 'El pin 25 avisa de que en las líneas AD hay una dirección; después llevarán datos.',
    piece: 'pin-25',
    tab: 'state',
    open: false,
    view: { distance: 7, azimuth: 12, polar: 50 },
  },
  {
    id: 'add',
    slot: '0:45',
    station: '8086',
    title: 'Una instrucción completa',
    line: 'Carga la misión de suma y recorre buscar, decodificar, ejecutar y escribir.',
    piece: 'alu',
    tab: 'program',
    open: true,
    view: { distance: 9.5, azimuth: 18, polar: 55 },
  },
  {
    id: 'memory',
    slot: '2:15',
    station: 'memory',
    title: 'Memoria y direcciones',
    line: 'Segmento × 16 + offset: dos pares distintos pueden nombrar la misma celda.',
    piece: 'bank-even',
    memoryModel: 'classic',
    open: false,
    view: { distance: 12, azimuth: 20, polar: 52 },
  },
  {
    id: 'ddr4',
    slot: '3:00',
    station: 'memory',
    title: 'Otra generación',
    line: 'El módulo DDR4 sirve ocho bytes por ráfaga; no tiene bancos ni direcciones del 8086.',
    piece: 'dimm',
    memoryModel: 'dimm',
    open: false,
    view: { distance: 11, azimuth: 8, polar: 68 },
  },
  {
    id: 'chronoscope',
    slot: '3:30',
    station: 'time',
    title: 'La cinta de pasos',
    line: 'Cada instrucción es un cuadro. Retrocede, edita y compara la rama alternativa.',
    piece: 'chrono-tape',
    view: { distance: 11, azimuth: 16, polar: 52 },
  },
  {
    id: 'apple',
    slot: '4:30',
    station: 'apple',
    title: 'Memoria compartida',
    line: 'La GPU lee el mismo B0 y la CPU espera la señal de fin antes de leer B1.',
    piece: 'unified',
    open: true,
    view: { distance: 11, azimuth: 18, polar: 50 },
  },
  {
    id: 'machine',
    slot: '5:45',
    station: 'machine',
    title: 'La máquina',
    line: 'Dirección, control y datos: un solo bus se enciende por paso.',
    piece: 'ram',
    view: { distance: 11, azimuth: 18, polar: 52 },
  },
];

export function tourStation(step: TourStep): string {
  return '/' + step.station;
}
