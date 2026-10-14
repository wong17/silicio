import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { bakedShellMaterial, lightMapLuminance, minLightMapLuminance } from './room-light-map';

describe('luz horneada de la sala', () => {
  it('wall_luminance_stays_above_floor', () => {
    expect(minLightMapLuminance()).toBeGreaterThan(0.18);
  });
  it('pools_are_brighter_than_corners_and_baseboard', () => {
    expect(lightMapLuminance(0.5, 0.5)).toBeGreaterThan(lightMapLuminance(0.01, 0.5));
    expect(lightMapLuminance(0.5, 0.5)).toBeGreaterThan(lightMapLuminance(0.5, 0.0));
  });
  it('room_shell_ignores_dynamic_lights', () => {
    const lit = new T.MeshStandardMaterial({ color: '#c3cbc1' });
    const baked = bakedShellMaterial(lit, new T.Texture(), (r) => r);
    expect(baked).toBeInstanceOf(T.MeshBasicMaterial);
    expect((baked as unknown as { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial).toBeUndefined();
    expect(baked.lightMap).not.toBeNull();
  });
});
