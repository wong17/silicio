/** Published units of the base Apple M5, shared by the console panel and the 3D model. */
export interface AppleUnit {
  id: 'performance' | 'efficiency' | 'gpu' | 'neural' | 'unified';
  area: string;
  label: string;
  /** Number of individual cores drawn on the tile; 0 for the memory strip. */
  cores: number;
  /** Text shown in the console. */
  count: string;
  color: string;
}

export const APPLE_UNITS: readonly AppleUnit[] = [
  { id: 'performance', area: 'perf', label: 'CPU rendimiento', cores: 4, count: '4', color: '#ae8356' },
  { id: 'efficiency', area: 'eff', label: 'CPU eficiencia', cores: 6, count: '6', color: '#688d73' },
  { id: 'gpu', area: 'gpu', label: 'GPU', cores: 10, count: 'hasta 10', color: '#68869d' },
  { id: 'neural', area: 'neural', label: 'Neural', cores: 16, count: '16', color: '#9477a1' },
  { id: 'unified', area: 'unified', label: 'Memoria unificada', cores: 0, count: '153 GB/s', color: '#a9aa79' },
];

/** Which units touch the shared buffer in each stage of the CPU, GPU y CPU dependency. */
export const BUFFER_STAGE_UNITS: readonly (readonly string[])[] = [
  ['performance', 'unified'],
  ['gpu', 'unified'],
  ['performance', 'unified'],
];
