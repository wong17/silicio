import type { Area, Rect } from './workspace-layout';
export type { ViewportLayout } from '../../world/scene-inputs';

/** Something drawn over the 3D view. `edge` says which side it belongs to; without it the cheapest cut wins. */
export interface Occlusion {
  rect: Rect;
  edge?: 'top' | 'bottom' | 'left' | 'right';
}

const MARGIN = 12;
const GAP = 8;
const MIN = 64;

const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function cuts(free: Rect, o: Rect): Record<NonNullable<Occlusion['edge']>, Rect> {
  const right = free.x + free.width,
    bottom = free.y + free.height;
  const top = o.y + o.height + GAP,
    left = o.x + o.width + GAP;
  return {
    top: { x: free.x, y: top, width: free.width, height: bottom - top },
    bottom: { x: free.x, y: free.y, width: free.width, height: o.y - GAP - free.y },
    left: { x: left, y: free.y, width: right - left, height: free.height },
    right: { x: free.x, y: free.y, width: o.x - GAP - free.x, height: free.height },
  };
}

/**
 * The largest rectangle of the view that no overlay covers, found by cutting one side per overlay.
 * An overlay that would leave less than 64×64 px is ignored rather than collapsing the view.
 */
export function freeRectFor(area: Area, occlusions: readonly Occlusion[]): Rect {
  // A view too small for the margins (hidden, or still being laid out) is used whole.
  if (area.width < 2 * MARGIN + MIN || area.height < 2 * MARGIN + MIN)
    return { x: 0, y: 0, width: Math.max(0, area.width), height: Math.max(0, area.height) };
  let free: Rect = { x: MARGIN, y: MARGIN, width: area.width - 2 * MARGIN, height: area.height - 2 * MARGIN };
  for (const o of occlusions) {
    if (!intersects(free, o.rect)) continue;
    const options = cuts(free, o.rect);
    const candidates = (o.edge ? [options[o.edge]] : Object.values(options)).filter(
      (r) => r.width >= MIN && r.height >= MIN,
    );
    if (!candidates.length) continue;
    free = candidates.reduce((best, r) => (r.width * r.height > best.width * best.height ? r : best));
  }
  return free;
}
