import type { Section } from '../world/scene-inputs';

export interface Experience {
  id: Section;
  number: string;
  title: string;
  subtitle: string;
  summary: string;
  accent: string;
  /** False for a station that still opens by its address but is no longer part of the route. */
  listed: boolean;
}

/** Every station that still has an address, in the order of the route. */
export const EXPERIENCES: readonly Experience[] = [
  {
    id: '8086',
    number: '01',
    title: 'Banco 8086',
    subtitle: 'La máquina desnuda',
    summary: 'Haz que una instrucción atraviese registros, memoria y unidad aritmética.',
    accent: '#cf9c65',
    listed: true,
  },
  {
    id: 'memory',
    number: '02',
    title: 'Memoria',
    subtitle: 'Geografía de los datos',
    summary: 'Dos números forman una dirección. Explora dónde terminan realmente tus bytes.',
    accent: '#99ae9d',
    listed: true,
  },
  {
    id: 'machine',
    number: '03',
    title: 'La máquina',
    subtitle: 'Tres conversaciones',
    summary: 'Direcciones, datos y control: encuentra el propósito de cada conexión.',
    accent: '#c7ac6b',
    listed: true,
  },
  {
    id: 'apple',
    number: '04',
    title: 'Apple Silicon',
    subtitle: 'Un territorio compartido',
    summary: 'Abre un sistema en un chip y sigue un buffer entre CPU y GPU.',
    accent: '#a0b4bf',
    listed: true,
  },
  {
    // Out of the route (its comparison moves into the 8086); /time keeps working until the migration.
    id: 'time',
    number: '—',
    title: 'Cronoscopio',
    subtitle: 'El pasado es editable',
    summary: 'Detén una ejecución, vuelve a su origen y cambia una decisión.',
    accent: '#aca3ba',
    listed: false,
  },
];

/** The chapters of the laboratory, as navigation and the atrium show them. */
export const CHAPTERS: readonly Experience[] = EXPERIENCES.filter((e) => e.listed);
