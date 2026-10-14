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
  },
  {
    id: 'memory',
    slot: '2:15',
    station: 'memory',
    title: 'Memoria y direcciones',
    line: 'Segmento × 16 + offset: dos pares distintos pueden nombrar la misma celda.',
    piece: 'bank-even',
    memoryModel: 'classic',
  },
  {
    id: 'ddr4',
    slot: '3:00',
    station: 'memory',
    title: 'Otra generación',
    line: 'El módulo DDR4 sirve ocho bytes por ráfaga; no tiene bancos ni direcciones del 8086.',
    piece: 'spd',
    memoryModel: 'dimm',
  },
  {
    id: 'chronoscope',
    slot: '3:30',
    station: 'time',
    title: 'La cinta de pasos',
    line: 'Cada instrucción es un cuadro. Retrocede, edita y compara la rama alternativa.',
    piece: 'chrono-window',
  },
  {
    id: 'apple',
    slot: '4:30',
    station: 'apple',
    title: 'Memoria compartida',
    line: 'La GPU lee el mismo B0 y la CPU espera la señal de fin antes de leer B1.',
    piece: 'unified',
    open: true,
  },
  {
    id: 'machine',
    slot: '5:45',
    station: 'machine',
    title: 'La máquina',
    line: 'Dirección, control y datos: un solo bus se enciende por paso.',
    piece: 'ram',
  },
];

export function tourStation(step: TourStep): string {
  return '/' + step.station;
}
