import { chooseNamed, VisibilityMemory, type AnnotationCandidate } from './annotation-policy';

const candidate = (id: string, x: number, y = 100, extra: Partial<AnnotationCandidate> = {}): AnnotationCandidate => ({
  id,
  x,
  y,
  onScreen: true,
  occluded: false,
  ...extra,
});

describe('política de rótulos', () => {
  const many = Array.from({ length: 12 }, (_, i) => candidate('p' + i, 40 * i));

  it('nombra como máximo seis piezas en escritorio y tres en vista compacta', () => {
    const memory = new VisibilityMemory();
    expect(chooseNamed({ candidates: many, selected: null, hovered: null, active: [], compact: false }, memory)).toHaveLength(6);
    expect(chooseNamed({ candidates: many, selected: null, hovered: null, active: [], compact: true }, memory)).toHaveLength(3);
  });

  it('la selección, el hover y el paso activo van primero', () => {
    const named = chooseNamed(
      { candidates: many, selected: 'p9', hovered: 'p3', active: ['p11'], compact: true },
      new VisibilityMemory(),
    );
    expect(named).toEqual(['p9', 'p3', 'p11']);
  });

  it('no nombra piezas tapadas, fuera de la vista o detrás de la cámara', () => {
    const memory = new VisibilityMemory();
    const input = {
      candidates: [
        candidate('a', 10, 10, { occluded: true }),
        candidate('b', 20, 20, { onScreen: false }),
        candidate('c', 30),
      ],
      selected: 'a',
      hovered: null,
      active: [],
      compact: false,
    };
    chooseNamed(input, memory);
    expect(chooseNamed(input, memory)).toEqual(['c']);
  });

  it('un cambio de visibilidad necesita dos muestras: no parpadea por un instante tapado', () => {
    const memory = new VisibilityMemory();
    expect(memory.visible('x', false)).toBe(true);
    expect(memory.visible('x', true)).toBe(true);
    expect(memory.visible('x', false)).toBe(true);
    expect(memory.visible('x', true)).toBe(true);
    expect(memory.visible('x', true)).toBe(false);
    expect(memory.visible('x', false)).toBe(false);
    expect(memory.visible('x', false)).toBe(true);
  });
});
