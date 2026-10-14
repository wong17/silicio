import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { SceneLabels } from './scene-labels';
import { contrastRatio, hexLuminance, pickInk } from './label-ink';

describe('tinta de rótulos', () => {
  it('auto_ink_reaches_4_5_to_1', () => {
    const surfaces = ['#292d2c', '#314d40', '#b9ad83', '#202426', '#496a5a', '#a97d45', '#35483c', '#e6dcbc', '#c6c9cb', '#6b5a3c'];
    for (const hex of surfaces) {
      const L = hexLuminance(hex);
      const { ink } = pickInk(L);
      expect(contrastRatio(hexLuminance(ink), L), hex).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('dark_ink_on_light_ceramic', () => {
    expect(pickInk(hexLuminance('#b9ad83')).ink).toBe('#15120c');
    expect(pickInk(hexLuminance('#202426')).ink).toBe('#f1ead2');
  });
  it('labels_are_lit_like_their_surface', () => {
    const ctx = new Proxy({}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    const parent = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: '#b9ad83' }));
    const label = new SceneLabels((r) => r).create(parent, 'ALU', 0, 0, 0, 1);
    expect((label.material as THREE.Material).type).toBe('MeshStandardMaterial');
    vi.restoreAllMocks();
  });
});
