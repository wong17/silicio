import { it, expect } from 'vitest';
import { historyPieces } from './history-pieces';
it('history_slots_keep_absolute_event_ids', () => {
  const pieces = historyPieces(20);
  expect(pieces).toHaveLength(16);
  expect(pieces[0]).toEqual({ slot: 0, index: 4, id: 'frame-4' });
  expect(pieces[15].id).toBe('frame-19');
  expect(historyPieces(0)[0].id).toBe('initial');
});
