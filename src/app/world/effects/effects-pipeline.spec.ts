import { it, expect } from 'vitest';
import { qualitySettings } from './effects-pipeline';
it('quality_tiers_lower_only_render_cost', () => {
  expect(qualitySettings('high')).toMatchObject({ dpr: 1.5, shadowSize: 1024, bloom: false });
  expect(qualitySettings('balanced')).toMatchObject({ dpr: 1.25, shadowSize: 512, bloom: false });
  expect(qualitySettings('low')).toMatchObject({ dpr: 1, shadowSize: 0, bloom: false });
});
