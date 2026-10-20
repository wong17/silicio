import { freeRectFor, type Occlusion } from './scene-viewport';

const area = { width: 1000, height: 500 };

describe('scene-viewport / área libre', () => {
  it('sin oclusiones deja el visor menos el margen', () => {
    expect(freeRectFor(area, [])).toEqual({ x: 12, y: 12, width: 976, height: 476 });
  });

  it('la barra inferior recorta por abajo', () => {
    const toolbar: Occlusion = { rect: { x: 300, y: 430, width: 400, height: 56 }, edge: 'bottom' };
    const free = freeRectFor(area, [toolbar]);
    expect(free.y + free.height).toBeLessThanOrEqual(430 - 8);
    expect(free.width).toBe(976);
  });

  it('una ventana flotante a la derecha recorta por la derecha y conserva la altura', () => {
    const window: Occlusion = { rect: { x: 640, y: 20, width: 360, height: 400 } };
    const free = freeRectFor(area, [window]);
    expect(free.x + free.width).toBeLessThanOrEqual(640 - 8);
    expect(free.height).toBe(476);
  });

  it('el título arriba recorta por arriba aunque recortar por la izquierda dejara más área', () => {
    const title: Occlusion = { rect: { x: 24, y: 20, width: 380, height: 140 }, edge: 'top' };
    const free = freeRectFor(area, [title]);
    expect(free.y).toBeGreaterThanOrEqual(160 + 8);
    expect(free.x).toBe(12);
  });

  it('con un visor sin tamaño devuelve un rectángulo vacío, nunca negativo', () => {
    expect(freeRectFor({ width: 0, height: 0 }, [])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    const tiny = freeRectFor({ width: 50, height: 30 }, []);
    expect(tiny.width).toBeGreaterThanOrEqual(0);
    expect(tiny.height).toBeGreaterThanOrEqual(0);
  });

  it('ignora lo que queda fuera y nunca devuelve menos de 64×64', () => {
    const outside: Occlusion = { rect: { x: 2000, y: 0, width: 10, height: 10 } };
    const cover: Occlusion = { rect: { x: 0, y: 0, width: 1000, height: 500 } };
    expect(freeRectFor(area, [outside])).toEqual({ x: 12, y: 12, width: 976, height: 476 });
    const free = freeRectFor(area, [cover]);
    expect(free.width).toBeGreaterThanOrEqual(64);
    expect(free.height).toBeGreaterThanOrEqual(64);
  });
});
