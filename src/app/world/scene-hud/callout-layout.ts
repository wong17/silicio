import type { ScreenAnchor } from '../scene-inputs';

export interface CalloutBox {
  id: string;
  name: string;
  /** Anchor on the piece. */
  ax: number;
  ay: number;
  /** Top-left of the legend. */
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Places a legend beside each anchor, keeps it inside `free` and nudges it down until it no longer overlaps
 * an earlier legend. Pieces nearer the top of the screen are placed first, so the order is stable.
 */
export function layoutCallouts(
  anchors: ScreenAnchor[],
  free: Bounds,
  size = { width: 132, height: 26 },
  gap = 4,
): CalloutBox[] {
  const placed: CalloutBox[] = [];
  const sorted = [...anchors].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const a of sorted) {
    let x = a.x + 14,
      y = a.y - size.height / 2;
    if (x + size.width > free.x + free.width) x = a.x - 14 - size.width;
    x = Math.min(Math.max(x, free.x), free.x + free.width - size.width);
    y = Math.min(Math.max(y, free.y), free.y + free.height - size.height);
    for (let guard = 0; guard < 40; guard++) {
      const hit = placed.find(
        (p) => x < p.x + size.width + gap && p.x < x + size.width + gap && y < p.y + size.height + gap && p.y < y + size.height + gap,
      );
      if (!hit) break;
      y = hit.y + size.height + gap;
      if (y + size.height > free.y + free.height) {
        y = free.y;
        x = Math.min(x + size.width + gap, free.x + free.width - size.width);
      }
    }
    placed.push({ id: a.id, name: a.name, ax: a.x, ay: a.y, x, y });
  }
  return placed;
}
