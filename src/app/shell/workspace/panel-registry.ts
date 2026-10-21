import type { Section } from '../../world/scene-inputs';
import type { PanelSpec } from './workspace-layout';

const INSTRUMENT_TITLES: Record<Exclude<Section, '8086' | 'atrium' | 'memory' | 'machine'>, string> = {
  time: 'Cronoscopio',
  apple: 'Memoria compartida',
};

const SECONDARY: PanelSpec[] = [{ id: 'inspector', title: 'Pieza', zone: 'right', open: false, weight: 1 }];

/**
 * Panels each experience offers. The 8086 and the PC open one «Paso a paso» panel that gathers program, steps
 * and state; the other stations keep their instruments.
 */
export function panelsFor(section: Section): PanelSpec[] {
  // One panel at the bottom holds what used to be two or three windows: program, steps and state. The separate
  // windows stay in «Paneles» for whoever wants one on its own.
  const steps: PanelSpec = { id: 'steps', title: 'Paso a paso', zone: 'bottom', open: true, weight: 3 };
  if (section === '8086')
    return [
      steps,
      { id: 'program', title: 'Programa', zone: 'bottom', open: false },
      { id: 'state', title: 'Estado', zone: 'bottom', open: false },
      // The screen opens by itself with the first INT 21h, beside the steps and at their height; until then it is
      // one choice in «Paneles».
      { id: 'screen', title: 'Pantalla', zone: 'bottom', open: false, weight: 2 },
      { id: 'ports', title: 'Puertos 8255', zone: 'bottom', open: false },
      ...SECONDARY,
    ];
  if (section === 'machine')
    return [
      steps,
      { id: 'pc-program', title: 'Programa y entradas', zone: 'bottom', open: false },
      { id: 'pc-components', title: 'Componentes y salida', zone: 'bottom', open: false },
      ...SECONDARY,
    ];
  if (section === 'memory')
    return [
      { id: 'operation', title: 'Operación', zone: 'bottom', open: true },
      { id: 'result', title: 'Resultado', zone: 'bottom', open: true },
      ...SECONDARY,
    ];
  if (section === 'atrium')
    return [{ id: 'portals', title: 'Estaciones', zone: 'right', open: true, weight: 2 }, ...SECONDARY];
  return [{ id: 'instruments', title: INSTRUMENT_TITLES[section], zone: 'right', open: true, weight: 2 }, ...SECONDARY];
}
