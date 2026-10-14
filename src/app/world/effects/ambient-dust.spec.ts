import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { AmbientDust, dustOffset, DUST_DRIFT } from './ambient-dust';
import { qualitySettings } from './effects-pipeline';

const volume = new T.Box3(new T.Vector3(-10, 0.5, -6), new T.Vector3(10, 7, 8));

describe('polvo en el aire', () => {
  it('dust_stays_inside_its_volume', () => {
    const dust = new AmbientDust(600, volume, (r) => r);
    const attr = dust.points.geometry.getAttribute('position') as T.BufferAttribute;
    const seeds = dust.points.geometry.getAttribute('aSeed') as T.BufferAttribute;
    const p = new T.Vector3();
    const offset = new T.Vector3();
    for (let i = 0; i < dust.count; i++)
      for (const t of [0, 13.7, 91, 1000]) {
        p.fromBufferAttribute(attr, i).add(dustOffset(seeds.getX(i), t, offset));
        expect(volume.containsPoint(p), `mote ${i} at ${t}`).toBe(true);
      }
    expect(DUST_DRIFT).toBeGreaterThan(0);
  });

  it('dust_is_frozen_under_reduced_motion', () => {
    const dust = new AmbientDust(100, volume, (r) => r);
    // With reduced motion the scene clock never leaves zero, whatever the real time.
    dust.update(0);
    const first = dust.time;
    dust.update(0);
    expect(dust.time).toBe(first);
    expect(dustOffset(0.3, 0).toArray()).toEqual(dustOffset(0.3, 0).toArray());
  });

  it('low_tier_has_no_dust', () => {
    expect(qualitySettings('low').dust).toBe(0);
    expect(qualitySettings('balanced').dust).toBe(250);
    expect(qualitySettings('high').dust).toBe(600);
    const dust = new AmbientDust(600, volume, (r) => r);
    dust.setActive(qualitySettings('low').dust);
    expect(dust.points.visible).toBe(false);
    dust.setActive(250);
    expect(dust.points.visible).toBe(true);
    expect(dust.points.geometry.drawRange.count).toBe(250);
  });

  it('beams_are_stored_for_the_shader', () => {
    const dust = new AmbientDust(10, volume, (r) => r);
    dust.setBeams([{ origin: new T.Vector3(1, 2, 3), direction: new T.Vector3(0, -1, 0), cosAngle: 0.9, strength: 1 }]);
    const u = (dust.points.material as T.ShaderMaterial).uniforms;
    expect((u['uOrigin'].value as T.Vector4[])[0].w).toBeCloseTo(0.9);
    expect((u['uDirection'].value as T.Vector4[])[1].w).toBe(0);
  });
});
