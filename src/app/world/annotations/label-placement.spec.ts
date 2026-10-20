import { estimateLabelSize, placeLabels, type LabelRequest } from './label-placement';

type Box = { x: number; y: number; width: number; height: number };
const bounds: Box = { x: 0, y: 0, width: 1000, height: 600 };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const request = (id: string, x: number, y: number): LabelRequest => ({ id, x, y, width: 90, height: 26 });

describe('colocación de rótulos', () => {
  it('conserva la posición anterior tras un giro pequeño si sigue libre', () => {
    const first = placeLabels([request('alu', 400, 300)], [], bounds, new Map([['alu', 3]]));
    expect(first[0].candidate).toBe(3);
    const moved = placeLabels([request('alu', 402, 301)], [], bounds, new Map([['alu', first[0].candidate]]));
    expect(moved[0].candidate).toBe(3);
  });

  it('si ningún hueco cercano está libre retira el rótulo en vez de apilarlo', () => {
    const walls: Box[] = [
      { x: 300, y: 200, width: 400, height: 90 },
      { x: 300, y: 310, width: 400, height: 90 },
      { x: 300, y: 290, width: 95, height: 20 },
      { x: 405, y: 290, width: 295, height: 20 },
    ];
    expect(placeLabels([request('alu', 400, 300)], walls, bounds, new Map())).toEqual([]);
  });

  it('nunca superpone dos rótulos ni tapa un panel o el dock', () => {
    const cluster = Array.from({ length: 10 }, (_, i) =>
      request('p' + i, 480 + (i % 4) * 12, 280 + Math.floor(i / 4) * 10),
    );
    const dock: Box = { x: 300, y: 520, width: 400, height: 60 };
    const panel: Box = { x: 700, y: 0, width: 300, height: 600 };
    const placed = placeLabels(cluster, [dock, panel], bounds, new Map());
    expect(placed.length).toBeGreaterThan(0);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) expect(overlaps(placed[i], placed[j])).toBe(false);
      expect(overlaps(placed[i], dock)).toBe(false);
      expect(overlaps(placed[i], panel)).toBe(false);
    }
  });

  it('cada rótulo queda junto a su ancla: guía solo si se aleja', () => {
    const [label] = placeLabels([request('alu', 400, 300)], [], bounds, new Map());
    const cx = Math.max(label.x, Math.min(400, label.x + label.width));
    const cy = Math.max(label.y, Math.min(300, label.y + label.height));
    expect(Math.hypot(cx - 400, cy - 300)).toBeLessThanOrEqual(48);
    expect(label.lead).toBe(false);
  });

  it('los nombres largos pasan a dos líneas en vez de cortarse', () => {
    const short = estimateLabelSize('ALU');
    const long = estimateLabelSize('Unidad de interfaz de bus');
    expect(long.height).toBeGreaterThan(short.height);
    expect(long.width).toBeLessThanOrEqual(176);
  });
});
