export function historyPieces(count: number): { slot: number; index: number; id: string }[] {
  const base = Math.max(0, count - 16);
  return Array.from({ length: Math.max(1, Math.min(16, count)) }, (_, slot) => ({
    slot,
    index: base + slot,
    id: count ? 'frame-' + (base + slot) : 'initial',
  }));
}
