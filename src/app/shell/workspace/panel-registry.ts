import type { Section } from '../../world/scene-inputs';
import type { PanelSpec } from './workspace-layout';

const INSTRUMENT_TITLES: Record<Exclude<Section, '8086' | 'atrium'>, string> = {
  memory: 'Memoria',
  time: 'Cronoscopio',
  apple: 'Memoria compartida',
  machine: 'Sistema',
};

const SECONDARY: PanelSpec[] = [{ id: 'inspector', title: 'Pieza', zone: 'right', open: false, weight: 1 }];

/**
 * Panels each experience offers. The 8086 opens Programa and Estado side by side; the other stations keep a
 * single instrument column until their own redesign splits it.
 */
export function panelsFor(section: Section): PanelSpec[] {
  if (section === '8086')
    return [
      { id: 'program', title: 'Programa', zone: 'bottom', open: true },
      { id: 'state', title: 'Estado', zone: 'bottom', open: true },
      // The screen opens by itself with the first INT 21h; until then it is one choice in «Paneles».
      { id: 'screen', title: 'Pantalla', zone: 'right', open: false, weight: 1 },
      { id: 'ports', title: 'Puertos 8255', zone: 'right', open: false, weight: 1 },
      ...SECONDARY,
    ];
  if (section === 'atrium')
    return [{ id: 'portals', title: 'Estaciones', zone: 'right', open: true, weight: 2 }, ...SECONDARY];
  return [{ id: 'instruments', title: INSTRUMENT_TITLES[section], zone: 'right', open: true, weight: 2 }, ...SECONDARY];
}
