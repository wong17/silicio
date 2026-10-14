import { describe, expect, it } from 'vitest';
import { layoutCallouts } from './callout-layout';

const free = { x: 12, y: 90, width: 700, height: 400 };

describe('rótulos flotantes', () => {
  it('callouts_stay_inside_the_free_region', () => {
    const anchors = [
      { id: 'a', name: 'A', x: 0, y: 0 },
      { id: 'b', name: 'B', x: 800, y: 700 },
      { id: 'c', name: 'C', x: 400, y: 300 },
    ];
    for (const box of layoutCallouts(anchors, free)) {
      expect(box.x).toBeGreaterThanOrEqual(free.x);
      expect(box.y).toBeGreaterThanOrEqual(free.y);
      expect(box.x + 168).toBeLessThanOrEqual(free.x + free.width);
      expect(box.y + 26).toBeLessThanOrEqual(free.y + free.height);
    }
  });
  it('legends_do_not_overlap', () => {
    const anchors = Array.from({ length: 6 }, (_, i) => ({ id: 'p' + i, name: 'P' + i, x: 300, y: 200 + i }));
    const boxes = layoutCallouts(anchors, free);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        const overlap = a.x < b.x + 168 && b.x < a.x + 168 && a.y < b.y + 26 && b.y < a.y + 26;
        expect(overlap, a.id + ' ' + b.id).toBe(false);
      }
  });
  it('callouts_follow_their_piece', () => {
    const [near] = layoutCallouts([{ id: 'a', name: 'A', x: 200, y: 200 }], free);
    const [moved] = layoutCallouts([{ id: 'a', name: 'A', x: 260, y: 240 }], free);
    expect(moved.x - near.x).toBe(60);
    expect(moved.y - near.y).toBe(40);
  });
});
