import { expect, it } from 'vitest';
import * as T from 'three';
import { SelectionMarker, selectionBounds } from './selection-marker';
import { RENDER_ORDER } from './render-order';

function lampLike() {
  const group = new T.Group();
  const arm = new T.Mesh(new T.BoxGeometry(1, 1, 1));
  const beam = new T.Mesh(new T.ConeGeometry(1, 20, 8));
  beam.userData['noBounds'] = true;
  beam.position.y = -10;
  const dust = new T.Mesh(new T.BoxGeometry(30, 30, 30));
  dust.userData['noBounds'] = true;
  group.add(arm, beam, dust);
  return group;
}

it('lamp_selection_ignores_beam_and_dust', () => {
  const box = selectionBounds(lampLike());
  expect(box.getSize(new T.Vector3()).y).toBeCloseTo(1, 5);
  const marker = new SelectionMarker();
  expect(marker.fit(lampLike())).toBe(true);
  expect(marker.visible).toBe(true);
});

it('selection_hides_without_a_piece', () => {
  const marker = new SelectionMarker();
  marker.fit(lampLike());
  expect(marker.fit(undefined)).toBe(false);
  expect(marker.visible).toBe(false);
});

it('transparent_layers_have_a_fixed_order', () => {
  const o = RENDER_ORDER;
  expect(o.surface).toBeLessThan(o.glow);
  expect(o.glow).toBeLessThan(o.label);
  expect(o.label).toBeLessThan(o.ring);
  expect(o.ring).toBeLessThan(o.beam);
  expect(o.beam).toBeLessThan(o.dust);
});

it('batched_contacts_still_count_for_bounds', () => {
  const group = new T.Group();
  const pin = new T.Mesh(new T.BoxGeometry(0.2, 0.2, 0.2));
  pin.position.set(3, 0.4, 1.45);
  pin.visible = false;
  pin.layers.set(31);
  group.add(pin);
  const hidden = new T.Mesh(new T.BoxGeometry(5, 5, 5));
  hidden.visible = false;
  group.add(hidden);
  const box = selectionBounds(group);
  expect(box.isEmpty()).toBe(false);
  expect(box.getCenter(new T.Vector3()).x).toBeCloseTo(3, 5);
  expect(box.getSize(new T.Vector3()).x).toBeCloseTo(0.2, 5);
});
