import { it, expect } from 'vitest';
import { FrameProfile } from './frame-profile';
it('frame_percentiles_exclude_tab_resume_stalls', () => {
  const p = new FrameProfile();
  for (let i = 0; i < 100; i++) p.sample(i < 90 ? 0.016 : 0.03);
  p.sample(5);
  expect(p.result.samples).toBe(100);
  expect(p.result.p50).toBe(16);
  expect(p.result.p95).toBe(30);
});
