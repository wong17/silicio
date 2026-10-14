import type { Registers } from '../simulation/cpu8086';

export type RegisterName = keyof Registers;

export interface RegisterInfo {
  name: RegisterName;
  group: 'Datos' | 'Punteros e índices' | 'Segmentos' | 'Control';
  title: string;
  role: string;
}

/** The thirteen visible registers of the 8086, grouped as in the programmer's model. */
export const REGISTER_INFO: readonly RegisterInfo[] = [
  { name: 'AX', group: 'Datos', title: 'Acumulador', role: 'Operando y resultado implícito de multiplicar, dividir y de la entrada/salida' },
  { name: 'BX', group: 'Datos', title: 'Base', role: 'Puntero base para direccionar memoria' },
  { name: 'CX', group: 'Datos', title: 'Contador', role: 'Cuenta de LOOP, desplazamientos y repeticiones' },
  { name: 'DX', group: 'Datos', title: 'Datos', role: 'Mitad alta en multiplicar y dividir; puerto de entrada/salida' },
  { name: 'SP', group: 'Punteros e índices', title: 'Puntero de pila', role: 'Cima de la pila, dentro de SS' },
  { name: 'BP', group: 'Punteros e índices', title: 'Puntero base', role: 'Base del marco de pila; usa SS por defecto' },
  { name: 'SI', group: 'Punteros e índices', title: 'Índice fuente', role: 'Origen en operaciones de cadena' },
  { name: 'DI', group: 'Punteros e índices', title: 'Índice destino', role: 'Destino en operaciones de cadena' },
  { name: 'CS', group: 'Segmentos', title: 'Segmento de código', role: 'Con IP localiza la siguiente instrucción' },
  { name: 'DS', group: 'Segmentos', title: 'Segmento de datos', role: 'Segmento por defecto de los datos' },
  { name: 'SS', group: 'Segmentos', title: 'Segmento de pila', role: 'Segmento de SP y BP' },
  { name: 'ES', group: 'Segmentos', title: 'Segmento extra', role: 'Destino de las operaciones de cadena' },
  { name: 'IP', group: 'Control', title: 'Puntero de instrucción', role: 'Desplazamiento de la próxima instrucción en CS' },
];

export const REGISTER_GROUP_ORDER = ['Datos', 'Punteros e índices', 'Segmentos', 'Control'] as const;

/** Only AX to DX split into two eight-bit halves (AH/AL, BH/BL, CH/CL, DH/DL). */
export function hasHalves(name: string): boolean {
  return ['AX', 'BX', 'CX', 'DX'].includes(name);
}

/** High and low bytes of a sixteen-bit word. */
export function halves(value: number): { high: number; low: number } {
  const v = value & 0xffff;
  return { high: v >> 8, low: v & 0xff };
}

/** What a single bit contributes: its weight and whether it adds to the value. */
export function bitWeight(position: number, on: boolean): { weight: number; text: string } {
  const weight = 2 ** position;
  return { weight, text: `peso ${weight} · ${on ? 'suma ' + weight : 'sin aportación'}` };
}
