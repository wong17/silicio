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
