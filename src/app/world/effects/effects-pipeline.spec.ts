import { it, expect } from 'vitest';
import { qualitySettings } from './effects-pipeline';
it('quality_tiers_lower_only_render_cost', () => {
  expect(qualitySettings('high')).toMatchObject({ dpr: 1.5, shadowSize: 1024, bloom: false });
  expect(qualitySettings('balanced')).toMatchObject({ dpr: 1.25, shadowSize: 512, bloom: false });
  expect(qualitySettings('low')).toMatchObject({ dpr: 1, shadowSize: 0, bloom: false });
});

import { parseFx } from './effects-pipeline';
it('each_pass_can_be_disabled', () => {
  expect([...parseFx('?fx=ao,bloom,vignette')].sort()).toEqual(['ao', 'bloom', 'vignette']);
  expect([...parseFx('?fx=bloom,evil,ao')].sort()).toEqual(['ao', 'bloom']);
  expect(parseFx('').size).toBe(0);
});
