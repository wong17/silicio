import { describe, expect, it } from 'vitest';
import { pathOf, sectionOfPath } from './routes';
import { fromQuery } from './deeplink';

describe('direcciones del laboratorio', () => {
  it('el SoC vive en /soc y /apple se traduce', () => {
    expect(pathOf('apple')).toBe('soc');
    expect(sectionOfPath('soc')).toBe('apple');
    expect(sectionOfPath('apple')).toBe('apple');
  });

  it('/time abre el Banco 8086 y lo desconocido, el atrio', () => {
    expect(sectionOfPath('time')).toBe('8086');
    expect(sectionOfPath('')).toBe('atrium');
    expect(sectionOfPath('otra')).toBe('atrium');
    for (const s of ['8086', 'memory', 'machine'] as const) expect(sectionOfPath(pathOf(s))).toBe(s);
  });

  it('un enlace antiguo con pieza de la cinta se lee sin romperse', () => {
    expect(fromQuery({ pieza: 'frame-3', tab: 'trace' }).piece).toBe('frame-3');
  });
});
