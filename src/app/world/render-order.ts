/**
 * Explicit draw order for transparent layers, so overlapping translucency never swaps between frames:
 * surface, then glow, label, light ring, beam and finally dust.
 */
export const RENDER_ORDER = { surface: 0, glow: 5, label: 10, ring: 20, beam: 30, dust: 40 } as const;
