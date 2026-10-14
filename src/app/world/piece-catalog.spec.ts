import { it, expect } from 'vitest';
import * as T from 'three';
import { classifySubject, pieceDefinition } from './piece-catalog';
import { InteractionRegistry } from './interaction-registry';
it('semantic_grouping_preserves_pose_and_inspection_coverage', () => {
  const root = new T.Group(),
    parent = new T.Group(),
    m = new T.MeshStandardMaterial();
  m.name = 'tin-leads';
  parent.position.set(2, 3, 4);
  parent.rotation.y = 0.7;
  root.add(parent);
  const mesh = new T.Mesh(new T.BoxGeometry(), m);
  mesh.position.set(1, 0, 0);
  parent.add(mesh);
  root.updateMatrixWorld(true);
  const pose = mesh.matrixWorld.clone(),
    parts = new Map<string, T.Object3D>();
  classifySubject(root, parts);
  root.updateMatrixWorld(true);
  mesh.matrixWorld.elements.forEach((v, i) => expect(v).toBeCloseTo(pose.elements[i], 10));
  expect(parts.has('interconnects')).toBe(true);
  const registry = new InteractionRegistry();
  for (const [id, object] of parts) registry.register(pieceDefinition(id, '8086'), [object]);
  expect(registry.resolveHit({ object: mesh, distance: 1, point: new T.Vector3() })).toBe(
    'interconnects',
  );
  expect(registry.auditCoverage(root).missing).toEqual([]);
});

import { accessibleCatalog } from './piece-definitions';
const EXPERIENCES: [string, 'classic' | 'dimm', number][] = [
  ['8086', 'classic', 0], ['memory', 'classic', 0], ['memory', 'dimm', 0],
  ['apple', 'classic', 0], ['machine', 'classic', 0], ['time', 'classic', 0],
];
it('every_piece_has_a_human_name', () => {
  for (const [experience, variant, history] of EXPERIENCES)
    for (const p of accessibleCatalog(experience, variant, history))
      expect(p.name, experience + ':' + p.id).not.toBe(p.id);
});
it('model_pieces_come_before_bench_objects', () => {
  for (const [experience, variant, history] of EXPERIENCES) {
    const scopes = accessibleCatalog(experience, variant, history).map((p) => p.scope);
    expect(scopes).toContain('model');
    expect(scopes).toContain('bench');
  }
});
