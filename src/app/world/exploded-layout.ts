/** Where the opened chip puts each layer. `amount` runs from 0 (closed) to 1 (fully open). */
export interface ExplodedOffset {
  x: number;
  y: number;
  z: number;
}

const FULL = {
  lid: { x: 1.2, y: 2.1, z: -2.5 },
  tile: { x: 0, y: 0.6, z: 0 },
} as const;

function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * Layers separate in order: the lid lifts away first (the first 60 %), and the inner blocks rise only once the
 * lid is clear (from 40 %). Because the lid is always at least as high as the blocks, nothing passes through.
 */
export function explodedOffset(id: string, section: string, amount: number): ExplodedOffset {
  const a = Math.min(1, Math.max(0, amount));
  if (section === 'atrium') return { x: 0, y: 0, z: 0 };
  if (id === 'lid') {
    const k = ease(a / 0.6);
    return { x: FULL.lid.x * k + 0, y: FULL.lid.y * k + 0, z: FULL.lid.z * k + 0 };
  }
  if (!['8086', 'apple'].includes(section)) return { x: 0, y: 0, z: 0 };
  const k = ease((a - 0.4) / 0.6);
  return { x: 0, y: FULL.tile.y * k, z: 0 };
}
