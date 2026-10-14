import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { HoverGlow } from './hover-glow';

function piece() {
  const group = new T.Group();
  const a = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial());
  const b = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial());
  group.add(a, b);
  return { group, a, b };
}

describe('resaltado al pasar el cursor', () => {
  it('hover_highlight_clears_on_leave', () => {
    const glow = new HoverGlow();
    const { group, a } = piece();
    glow.show(group);
    expect(glow.shellCount).toBe(2);
    expect(a.children).toHaveLength(1);
    glow.update(0.09, false);
    expect(glow.opacity).toBeGreaterThan(0.1);
    glow.clear();
    expect(glow.shellCount).toBe(0);
    expect(a.children).toHaveLength(0);
    expect(glow.opacity).toBe(0);
  });

  it('fades_in_within_90ms', () => {
    const glow = new HoverGlow();
    glow.show(piece().group);
    glow.update(0.045, false);
    expect(glow.opacity).toBeGreaterThan(0);
    expect(glow.opacity).toBeLessThan(HoverGlow.MAX);
    glow.update(0.045, false);
    expect(glow.opacity).toBeCloseTo(HoverGlow.MAX, 3);
  });

  it('reduced_motion_applies_it_at_once', () => {
    const glow = new HoverGlow();
    glow.show(piece().group);
    glow.update(0.001, true);
    expect(glow.opacity).toBeCloseTo(HoverGlow.MAX, 5);
  });

  it('never_touches_the_pieces_own_material', () => {
    const glow = new HoverGlow();
    const { group, a } = piece();
    const material = a.material as T.MeshStandardMaterial;
    glow.show(group);
    glow.update(1, false);
    expect(material.emissiveIntensity).toBe(1);
    expect(material.opacity).toBe(1);
  });

  it('switching_pieces_removes_the_previous_shells', () => {
    const glow = new HoverGlow();
    const first = piece(),
      second = piece();
    glow.show(first.group);
    glow.show(second.group);
    expect(first.a.children).toHaveLength(0);
    expect(second.a.children).toHaveLength(1);
  });
});
