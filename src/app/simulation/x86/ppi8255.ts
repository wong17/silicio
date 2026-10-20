/**
 * The didactic 8255: three 8-bit ports and a control register, at four consecutive port addresses. Mode 0
 * only, configured as the course's trainer does it: A drives eight LEDs, B reads eight switches and C drives
 * a seven-segment display. A real 8255 has more modes; this one keeps the part a student wires up.
 */
export const PPI_BASE = 0xa0;
export const PPI_PORT_A = PPI_BASE;
export const PPI_PORT_B = PPI_BASE + 1;
export const PPI_PORT_C = PPI_BASE + 2;
export const PPI_CONTROL = PPI_BASE + 3;
/** Control word: group A and port C in mode 0 as outputs, port B in mode 0 as input. */
export const PPI_CONTROL_WORD = 0x82;

export type Ports = Readonly<Record<number, number>>;

export const portName = (port: number): string =>
  ({ [PPI_PORT_A]: 'A (LEDs)', [PPI_PORT_B]: 'B (interruptores)', [PPI_PORT_C]: 'C (siete segmentos)', [PPI_CONTROL]: 'de control' })[port] ?? '';

const h2 = (v: number) => v.toString(16).toUpperCase().padStart(2, '0') + 'h';

export const isConfigured = (ports: Ports | undefined): boolean => ports?.[PPI_CONTROL] === PPI_CONTROL_WORD;

/** Result of `OUT port, value`: the new port state, or the reason the 8255 refuses it. */
export function writePort(ports: Ports | undefined, port: number, value: number): Ports {
  const current = ports ?? {};
  if (port < PPI_BASE || port > PPI_CONTROL)
    throw Error('Ningún dispositivo responde en el puerto ' + h2(port) + ': el 8255 didáctico ocupa de ' + h2(PPI_BASE) + ' a ' + h2(PPI_CONTROL) + '.');
  if (port === PPI_CONTROL) {
    if (value !== PPI_CONTROL_WORD)
      throw Error('La palabra de control ' + h2(value) + ' no está en el subconjunto: usa ' + h2(PPI_CONTROL_WORD) + ' (A y C salidas, B entrada).');
    return { ...current, [PPI_CONTROL]: value };
  }
  if (!isConfigured(current))
    throw Error('El 8255 no está configurado: escribe primero ' + h2(PPI_CONTROL_WORD) + ' en el puerto de control ' + h2(PPI_CONTROL) + '.');
  if (port === PPI_PORT_B) throw Error('El puerto B está configurado como entrada: no se puede escribir en él.');
  return { ...current, [port]: value & 255 };
}

/** Result of `IN port`: the value on the pins. Output ports return their latch, as the real chip does. */
export function readPort(ports: Ports | undefined, port: number): number {
  const current = ports ?? {};
  if (port < PPI_BASE || port > PPI_CONTROL)
    throw Error('Ningún dispositivo responde en el puerto ' + h2(port) + ': el 8255 didáctico ocupa de ' + h2(PPI_BASE) + ' a ' + h2(PPI_CONTROL) + '.');
  if (port === PPI_CONTROL) throw Error('El registro de control solo se escribe.');
  if (!isConfigured(current))
    throw Error('El 8255 no está configurado: escribe primero ' + h2(PPI_CONTROL_WORD) + ' en el puerto de control ' + h2(PPI_CONTROL) + '.');
  return current[port] ?? 0;
}

/** Switches the student set (by hand or in the scene); only the input port changes. */
export const setSwitches = (ports: Ports | undefined, value: number): Ports => ({ ...(ports ?? {}), [PPI_PORT_B]: value & 255 });

/** Segments a–g and the decimal point of a seven-segment display, from the bits of port C (bit 0 = a … bit 7 = dp). */
export const SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'] as const;
export const segmentsOn = (value: number): readonly (typeof SEGMENTS)[number][] =>
  SEGMENTS.filter((_, bit) => (value >> bit) & 1);

/** Digit shown by a pattern of segments, when it is one of the ten decimal digits. */
const DIGITS: Readonly<Record<number, string>> = {
  0x3f: '0', 0x06: '1', 0x5b: '2', 0x4f: '3', 0x66: '4', 0x6d: '5', 0x7d: '6', 0x07: '7', 0x7f: '8', 0x6f: '9',
};
export const digitOf = (value: number): string | undefined => DIGITS[value & 0x7f];
