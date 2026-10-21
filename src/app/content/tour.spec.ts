import { describe, expect, it } from 'vitest';
import { TOUR } from './tour';
import { accessibleCatalog } from '../world/piece-definitions';

describe('modo exposición', () => {
  it('every_tour_step_targets_an_existing_piece', () => {
    for (const step of TOUR) {
      const ids = accessibleCatalog(step.station, step.memoryModel ?? 'classic', 4).map((p) => p.id);
      expect(ids, `${step.id} a ${step.piece}`).toContain(step.piece);
    }
  });
  it('slots_follow_the_exhibition_order', () => {
    const minutes = TOUR.map((s) => Number(s.slot.split(':')[0]) * 60 + Number(s.slot.split(':')[1]));
    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes);
  });
  it('every_step_has_a_title_and_a_support_line', () => {
    for (const s of TOUR) {
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.line.length).toBeGreaterThan(20);
    }
  });
  it('every_step_frames_a_readable_view', () => {
    for (const s of TOUR) {
      expect(s.view.distance, s.id).toBeGreaterThanOrEqual(6);
      expect(s.view.polar, s.id).toBeGreaterThan(20);
      expect(s.view.polar, s.id).toBeLessThan(80);
    }
  });
  it('covers_every_station', () => {
    expect(new Set(TOUR.map((s) => s.station))).toEqual(new Set(['8086', 'memory', 'time', 'apple', 'machine']));
  });
});
