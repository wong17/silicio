/** A cheap hash in 0..1 for an integer slot: the same slot always gives the same value. */
function hash(slot: number): number {
  const s = Math.sin(slot * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Brightness, 0..1, of a ceiling tube that is failing: steady most of the time, with short dropouts and the odd
 * stutter, as an old fluorescent starter does. It works in slots of about 80 ms. Frozen time (reduced motion, or
 * before the scene starts) burns steady, so nobody sees a flicker they did not ask for.
 */
export function failingTube(seconds: number): number {
  if (seconds <= 0) return 1;
  const slot = Math.floor(seconds * 12);
  const roll = hash(slot);
  if (roll < 0.02) return 0.1;
  if (roll < 0.035) return slot % 2 ? 0.55 : 1;
  return 0.96 + 0.04 * hash(slot + 0.5);
}
