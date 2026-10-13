import { describe, expect, it } from 'vitest';
import { computeSurface, hexRgb, type SurfaceSpec } from './surface-maps';
import { fitFontSize } from './label-canvas';
import { fractal, tileNoise } from './noise';

const steel: SurfaceSpec = {
  seed: 42,
  finish: 'steel',
  albedo: '#5b6266',
  exposed: '#c3c6c9',
  grime: '#4a4a3f',
  dirt: 0.5,
  wear: 0.5,
  roughness: [0.35, 0.6],
  bump: 0.6,
  scratches: 12,
  metal: true,
  size: 64,
};

describe('ruido determinista', () => {
  it('repite exactamente el mismo valor para la misma semilla y coordenadas', () => {
    expect(tileNoise(1.3, 2.7, 4, 4, 9)).toBe(tileNoise(1.3, 2.7, 4, 4, 9));
    expect(tileNoise(1.3, 2.7, 4, 4, 9)).not.toBe(tileNoise(1.3, 2.7, 4, 4, 10));
  });

  it('es periódico en el período del toro, así que las texturas no tienen costuras', () => {
    expect(tileNoise(0.25, 1.5, 4, 4, 3)).toBeCloseTo(tileNoise(4.25, 1.5, 4, 4, 3), 10);
    expect(fractal(0, 0.4, 8, 8, 4, 5)).toBeCloseTo(fractal(1, 0.4, 8, 8, 4, 5), 10);
  });

  it('mantiene los valores dentro de [0,1)', () => {
    for (let i = 0; i < 200; i++) {
      const v = fractal(i / 200, (i * 7) / 200, 4, 4, 3, 1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('mapas de superficie', () => {
  it('genera buffers del tamaño pedido con el canal alfa completo', () => {
    const s = computeSurface(steel);
    expect(s.size).toBe(64);
    for (const buffer of [s.albedo, s.roughness, s.metalness, s.normal])
      expect(buffer.length).toBe(64 * 64 * 4);
    for (let i = 3; i < s.albedo.length; i += 4) expect(s.albedo[i]).toBe(255);
  });

  it('es determinista: el mismo material produce exactamente los mismos texels', () => {
    expect(computeSurface(steel).albedo).toEqual(computeSurface(steel).albedo);
    expect(computeSurface({ ...steel, seed: 43 }).albedo).not.toEqual(
      computeSurface(steel).albedo,
    );
  });

  it('el desgaste expone metal: más metalicidad y menos rugosidad donde se usa la pieza', () => {
    const worn = computeSurface({ ...steel, wear: 0.95, scratches: 0 });
    const fresh = computeSurface({ ...steel, wear: 0, scratches: 0 });
    const avg = (b: Uint8ClampedArray, channel: number) => {
      let sum = 0;
      for (let i = channel; i < b.length; i += 4) sum += b[i];
      return sum / (b.length / 4);
    };
    expect(avg(worn.metalness, 2)).toBeGreaterThan(avg(fresh.metalness, 2));
    expect(avg(worn.roughness, 1)).toBeLessThan(avg(fresh.roughness, 1));
  });

  it('un material no metálico no recibe metalicidad aunque se desgaste', () => {
    const plastic = computeSurface({ ...steel, finish: 'plastic', metal: false, wear: 0.9 });
    expect(Math.max(...plastic.metalness.filter((_, i) => i % 4 === 0))).toBe(0);
  });

  it('todas las normales son unitarias al codificarlas en el rango 0..255', () => {
    const s = computeSurface({ ...steel, finish: 'mat', bump: 1.4, scratches: 0 });
    for (let i = 0; i < s.normal.length; i += 4) {
      const x = s.normal[i] / 127.5 - 1,
        y = s.normal[i + 1] / 127.5 - 1,
        z = s.normal[i + 2] / 127.5 - 1;
      expect(Math.hypot(x, y, z)).toBeGreaterThan(0.98);
      expect(Math.hypot(x, y, z)).toBeLessThan(1.02);
    }
  });

  it('convierte colores hexadecimales a RGB', () => {
    expect(hexRgb('#c3c6c9')).toEqual([0xc3, 0xc6, 0xc9]);
  });
});

describe('etiquetas', () => {
  it('reduce el tamaño de la fuente hasta que el texto cabe en el lienzo', () => {
    const measure = (size: number) => size * 0.6 * 38; // 38 caracteres monoespaciados
    const size = fitFontSize(measure, 464);
    expect(measure(size)).toBeLessThanOrEqual(464);
    expect(size).toBeLessThan(26);
  });

  it('conserva el tamaño máximo cuando el texto ya cabe', () => {
    expect(fitFontSize((size) => size * 0.6 * 10, 464)).toBe(26);
  });

  it('nunca baja del tamaño mínimo legible', () => {
    expect(fitFontSize((size) => size * 100, 100, 26, 12)).toBe(12);
  });
});
