import { describe, expect, it } from 'vitest';
import { CPU_BLOCKS, CPU_PACKAGE, KEYBOARD, MONITOR, PC_BOARD, PC_PARTS, along, centre, routeOf } from './pc-layout';

const box = (p: { x: number; z: number; w: number; d: number }) => ({ x0: p.x - p.w / 2, x1: p.x + p.w / 2, z0: p.z - p.d / 2, z1: p.z + p.d / 2 });
const overlaps = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;

describe('disposición del PC', () => {
  it('ninguna pieza de la placa se solapa y todas caben en ella', () => {
    const all = [...PC_PARTS, CPU_PACKAGE];
    for (let i = 0; i < all.length; i++) {
      const b = box(all[i]);
      expect(b.x0, all[i].id).toBeGreaterThanOrEqual(-PC_BOARD.width / 2);
      expect(b.x1, all[i].id).toBeLessThanOrEqual(PC_BOARD.width / 2);
      expect(b.z0, all[i].id).toBeGreaterThanOrEqual(-PC_BOARD.depth / 2);
      expect(b.z1, all[i].id).toBeLessThanOrEqual(PC_BOARD.depth / 2);
      for (let j = i + 1; j < all.length; j++) expect(overlaps(b, box(all[j])), all[i].id + ' con ' + all[j].id).toBe(false);
    }
  });

  it('los bloques del procesador están dentro de su encapsulado y no se solapan', () => {
    const pkg = box(CPU_PACKAGE);
    for (let i = 0; i < CPU_BLOCKS.length; i++) {
      const b = box(CPU_BLOCKS[i]);
      expect(b.x0 >= pkg.x0 && b.x1 <= pkg.x1 && b.z0 >= pkg.z0 && b.z1 <= pkg.z1, CPU_BLOCKS[i].id).toBe(true);
      for (let j = i + 1; j < CPU_BLOCKS.length; j++) expect(overlaps(b, box(CPU_BLOCKS[j])), CPU_BLOCKS[i].id + ' con ' + CPU_BLOCKS[j].id).toBe(false);
    }
  });

  it('el teclado y el monitor están fuera de la placa', () => {
    expect(KEYBOARD.z - KEYBOARD.d / 2).toBeGreaterThan(PC_BOARD.depth / 2);
    expect(MONITOR.z + MONITOR.d / 2).toBeLessThan(-PC_BOARD.depth / 2);
  });

  it('las rutas entre piezas son ortogonales y empiezan y acaban en ellas', () => {
    const ids = [...PC_PARTS.map((p) => p.id), ...CPU_BLOCKS.map((b) => b.id), 'cpu'];
    for (const bus of ['address', 'data', 'control'] as const)
      for (const from of ids)
        for (const to of ids) {
          if (from === to) continue;
          const path = routeOf(from, to, bus);
          expect(path.length, from + '→' + to).toBeGreaterThanOrEqual(2);
          for (let i = 0; i < path.length - 1; i++)
            expect(path[i][0] === path[i + 1][0] || path[i][1] === path[i + 1][1] || (CPU_BLOCKS.some((b) => b.id === from) && CPU_BLOCKS.some((b) => b.id === to)), `${from}→${to} tramo ${i}`).toBe(true);
          expect(path[0]).toEqual(centre(from));
          expect(path[path.length - 1]).toEqual(centre(to));
        }
  });

  it('los cables salen del borde de los controladores y llegan a los periféricos', () => {
    const k = routeOf('keyboard-controller', 'keyboard', 'data');
    const kc = PC_PARTS.find((p) => p.id === 'keyboard-controller')!;
    expect(k[0]).toEqual([kc.x, kc.z + kc.d / 2]);
    expect(k.at(-1)).toEqual([KEYBOARD.x, KEYBOARD.z - KEYBOARD.d / 2]);
    const m = routeOf('display-engine', 'monitor', 'data');
    expect(m.at(-1)).toEqual(centre('monitor'));
    for (const path of [k, m]) for (let i = 0; i < path.length - 1; i++) expect(path[i][0] === path[i + 1][0] || path[i][1] === path[i + 1][1]).toBe(true);
  });

  it('along recorre la poligonal de un extremo al otro', () => {
    const path: [number, number][] = [[0, 0], [2, 0], [2, 2]];
    expect(along(path, 0)).toEqual([0, 0]);
    expect(along(path, 0.5)).toEqual([2, 0]);
    expect(along(path, 1)).toEqual([2, 2]);
    expect(along([[1, 1]], 0.5)).toEqual([1, 1]);
  });
});
