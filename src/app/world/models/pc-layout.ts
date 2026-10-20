import type { Bus } from '../../laboratory/pc-activity';

/** Board of the conceptual PC, in bench units; x to the right, z toward the viewer. */
export const PC_BOARD = { width: 8.8, depth: 5.8 } as const;
export const PC_TOP = 0.16;

export interface Placement {
  id: string;
  label: string;
  color: string;
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Sub-blocks of the processor: the registers of the cycle (PC, IR, MAR, MDR), R0–R3, the ALU and the control unit. */
export const CPU_BLOCKS: readonly Placement[] = [
  { id: 'cpu-pc', label: 'PC', color: '#a97d45', x: -3.35, z: -0.95, w: 0.95, d: 0.5 },
  { id: 'cpu-ir', label: 'IR', color: '#9d7450', x: -2.25, z: -0.95, w: 0.95, d: 0.5 },
  { id: 'cpu-mar', label: 'MAR', color: '#6e687e', x: -3.35, z: -0.3, w: 0.95, d: 0.5 },
  { id: 'cpu-mdr', label: 'MDR', color: '#70638c', x: -2.25, z: -0.3, w: 0.95, d: 0.5 },
  { id: 'cpu-regs', label: 'R0 R1 R2 R3', color: '#496a5a', x: -2.8, z: 0.4, w: 2.05, d: 0.55 },
  { id: 'alu', label: 'ALU', color: '#b27e47', x: -3.35, z: 1.1, w: 0.95, d: 0.5 },
  { id: 'control-unit', label: 'UNIDAD DE CONTROL', color: '#6b7790', x: -2.25, z: 1.1, w: 0.95, d: 0.5 },
];
export const CPU_PACKAGE = { id: 'cpu', label: 'PROCESADOR · 32 BIT', color: '#3a3f44', x: -2.8, z: 0.1, w: 2.7, d: 3.1 };

/** Chips and modules around the processor. */
export const PC_PARTS: readonly Placement[] = [
  { id: 'rom', label: 'ROM · CARGADOR', color: '#6b6f5a', x: -0.35, z: -1.9, w: 1.3, d: 0.8 },
  { id: 'memory-controller', label: 'CONTROLADOR DE MEMORIA', color: '#68869d', x: 1.15, z: -1.9, w: 1.4, d: 0.8 },
  { id: 'ram', label: 'RAM', color: '#477c70', x: 3.1, z: -1.9, w: 2.2, d: 0.95 },
  { id: 'keyboard-controller', label: 'TECLADO', color: '#8f7a52', x: -0.5, z: 1.35, w: 1.2, d: 0.75 },
  { id: 'interrupt-controller', label: 'INTERRUPCIONES', color: '#a46a5a', x: 0.9, z: 1.35, w: 1.3, d: 0.75 },
  { id: 'storage-controller', label: 'ALMACENAMIENTO', color: '#5f7f9a', x: 2.3, z: 1.35, w: 1.3, d: 0.75 },
  { id: 'display-engine', label: 'MOTOR DE PANTALLA', color: '#7d6a9a', x: 3.65, z: 1.35, w: 1.2, d: 0.75 },
  { id: 'ssd', label: 'SSD', color: '#2f4d62', x: 2.3, z: 2.35, w: 2.5, d: 0.75 },
];

/** Peripherals outside the case. */
export const KEYBOARD = { id: 'keyboard', label: 'TECLADO', x: -0.5, z: 4.1, w: 3.4, d: 1.2 };
export const MONITOR = { id: 'monitor', label: 'MONITOR', x: 2.2, z: -4.7, w: 3.6, d: 0.3, h: 2.5 };

/** Z of the three rails of the bus, between the top row (ROM, memory) and the bottom row (controllers). */
export const RAIL_Z: Readonly<Record<Bus, number>> = { address: -0.5, data: -0.3, control: -0.1 };
/** First x of the rails: the right edge of the processor. */
export const RAIL_START = CPU_PACKAGE.x + CPU_PACKAGE.w / 2;
export const RAIL_END = 4.4;
/** Sideways shift of the stub of each line, so the three lines of one component run side by side. */
export const LANE_X: Readonly<Record<Bus, number>> = { address: -0.15, data: 0, control: 0.15 };

type Point = [number, number];
const byId = new Map<string, Placement>([...CPU_BLOCKS, ...PC_PARTS, CPU_PACKAGE].map((p) => [p.id, p]));
const isCpu = (id: string) => id === 'cpu' || id.startsWith('cpu-') || id === 'alu' || id === 'control-unit';

/** Where a piece plugs into the bus: the edge facing the rails. */
function plug(id: string, bus: Bus): Point {
  const p = byId.get(id);
  if (!p) throw Error('Pieza sin lugar en el banco: ' + id);
  if (isCpu(id)) return [RAIL_START, RAIL_Z[bus]];
  const x = p.x + LANE_X[bus];
  return [x, p.z < RAIL_Z.address ? p.z + p.d / 2 : p.z - p.d / 2];
}

/** The route of a packet along one line, as the corner points a model draws and an animation follows. */
export function routeOf(from: string, to: string, bus: Bus): Point[] {
  if (from === to) return [centre(from), centre(to)];
  // Neighbours with a direct link: the memory controller beside the RAM, the SSD under its controller.
  const pair = new Set([from, to]);
  if (pair.has('ram') && pair.has('memory-controller')) return from === 'ram' ? [centre('ram'), centre('memory-controller')] : [centre('memory-controller'), centre('ram')];
  if (pair.has('ssd') && pair.has('storage-controller')) return from === 'ssd' ? [centre('ssd'), centre('storage-controller')] : [centre('storage-controller'), centre('ssd')];
  // Inside the processor a transfer runs between its blocks, not along the board.
  if (isCpu(from) && isCpu(to)) return [centre(from), [centre(from)[0], centre(to)[1]], centre(to)];
  const out: Point[] = [];
  const periph = (id: string) => id === 'keyboard' || id === 'monitor' || id === 'power';
  if (periph(from) || periph(to)) {
    const device = periph(from) ? from : to;
    const other = periph(from) ? to : from;
    const cable = cableRoute(device, other);
    return periph(from) ? [...cable].reverse() : cable;
  }
  const a = plug(from, bus);
  const b = plug(to, bus);
  const start = byId.get(from)!;
  out.push(centre(from));
  if (!isCpu(from)) out.push([start.x + LANE_X[bus], start.z]);
  if (isCpu(from)) out.push([RAIL_START, centre(from)[1]]);
  out.push(a, [a[0], RAIL_Z[bus]]);
  out.push([b[0], RAIL_Z[bus]], b);
  const end = byId.get(to)!;
  if (isCpu(to)) out.push([RAIL_START, centre(to)[1]], centre(to));
  else out.push([end.x + LANE_X[bus], end.z], centre(to));
  return dedupe(out);
}

/** From the controller's edge to the device. */
function cableRoute(device: string, controller: string): Point[] {
  const c = byId.get(controller);
  if (!c) throw Error('Pieza sin lugar en el banco: ' + controller);
  if (device === 'keyboard') return [[c.x, c.z + c.d / 2], [c.x, KEYBOARD.z - KEYBOARD.d / 2], [KEYBOARD.x, KEYBOARD.z - KEYBOARD.d / 2]];
  if (device === 'monitor') return [[c.x + c.w / 2, c.z], [PC_BOARD.width / 2 + 0.3, c.z], [PC_BOARD.width / 2 + 0.3, MONITOR.z], [MONITOR.x, MONITOR.z]];
  return [[c.x, c.z]];
}

export function centre(id: string): Point {
  if (id === 'keyboard') return [KEYBOARD.x, KEYBOARD.z];
  if (id === 'monitor') return [MONITOR.x, MONITOR.z];
  const p = byId.get(id);
  if (!p) throw Error('Pieza sin lugar en el banco: ' + id);
  return [p.x, p.z];
}

const dedupe = (path: Point[]): Point[] => path.filter((p, i) => i === 0 || p[0] !== path[i - 1][0] || p[1] !== path[i - 1][1]);

/** Point at fraction `u` along a polyline. */
export function along(path: Point[], u: number): Point {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = lengths.reduce((n, l) => n + l, 0);
  if (!total) return path[0];
  let remaining = Math.min(1, Math.max(0, u)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const k = lengths[i] === 0 ? 0 : remaining / lengths[i];
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k];
    }
    remaining -= lengths[i];
  }
  return path[path.length - 1];
}
