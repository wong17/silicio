import { it, expect } from 'vitest';
import * as T from 'three';
import { InteractionRegistry } from './interaction-registry';
it('child_mesh_resolves_owner', () => {
  const r = new InteractionRegistry(),
    p = new T.Group(),
    child = new T.Mesh(new T.BoxGeometry());
  p.add(child);
  r.register({ id: 'socket', name: 'Zócalo', role: 'academic', actions: ['inspect'] }, [p]);
  expect(r.resolveHit({ object: child } as unknown as T.Intersection)).toBe('socket');
});
it('every_academic_piece_has_action', () => {
  const r = new InteractionRegistry();
  expect(() =>
    r.register({ id: 'bad', name: 'chip', role: 'academic', actions: [] }, [new T.Group()]),
  ).toThrow();
});
it('instance_hit_resolves_specific_chip', () => {
  const r = new InteractionRegistry(),
    mesh = new T.InstancedMesh(new T.BoxGeometry(), new T.MeshBasicMaterial(), 2);
  (r as any).registerInstanceMap?.(mesh, ['c0', 'c1']);
  expect(r.resolveHit({ object: mesh, instanceId: 1 } as unknown as T.Intersection)).toBe('c1');
});
