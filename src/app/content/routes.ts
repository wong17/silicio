import type { Section } from '../world/scene-inputs';

/** Address of each chapter. The SoC lives at /soc; /apple and /time are old addresses that still open something sensible. */
export const pathOf = (section: Section): string => (section === 'apple' ? 'soc' : section);

/** The chapter an address names; old addresses are translated, unknown ones open the atrium. */
export function sectionOfPath(path: string): Section {
  switch (path) {
    case '8086':
    case 'memory':
    case 'machine':
      return path;
    case 'soc':
    case 'apple':
      return 'apple';
    case 'time':
      return '8086';
    default:
      return 'atrium';
  }
}
