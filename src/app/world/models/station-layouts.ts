export interface Part {
  id: string;
  label: string;
  color: string;
  x: number;
  z: number;
  w: number;
  d: number;
}
export const CPU_PARTS: Part[] = [
  { id: 'alu', label: 'ALU · 16 BIT', color: '#b27e47', x: -0.95, z: 0.55, w: 1.5, d: 0.8 },
  { id: 'registers', label: 'AX BX CX DX', color: '#477c70', x: -0.95, z: -0.5, w: 1.5, d: 0.85 },
  { id: 'control', label: 'CONTROL · EU', color: '#6b7790', x: 0.9, z: 0.6, w: 1.6, d: 0.7 },
  { id: 'biu', label: 'BIU · BUS', color: '#9d684c', x: 0.9, z: -0.6, w: 1.6, d: 0.7 },
  { id: 'queue', label: 'COLA · 6 BYTES', color: '#70638c', x: 0, z: -1.55, w: 3.4, d: 0.45 },
];
export const APPLE_PARTS: Part[] = [
  {
    id: 'performance',
    label: 'CPU · RENDIMIENTO',
    color: '#ae8356',
    x: -1.15,
    z: -0.8,
    w: 1.55,
    d: 1.15,
  },
  {
    id: 'efficiency',
    label: 'CPU · EFICIENCIA',
    color: '#688d73',
    x: -1.15,
    z: 0.65,
    w: 1.55,
    d: 0.95,
  },
  { id: 'gpu', label: 'GPU', color: '#68869d', x: 0.85, z: -0.6, w: 1.95, d: 1.6 },
  { id: 'neural', label: 'NEURAL ENGINE', color: '#9477a1', x: 0.8, z: 0.95, w: 1.9, d: 0.75 },
  { id: 'unified', label: 'MEMORIA UNIFICADA', color: '#a9aa79', x: 0, z: 2.05, w: 4, d: 0.65 },
];
