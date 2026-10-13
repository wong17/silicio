import { it, expect } from 'vitest';
import * as T from 'three';
import { InteractionRegistry } from './interaction-registry';
import { instanceContacts } from './static-instancing';
it('instancing_preserves_terminal_identity', () => {
  const root = new T.Group(),
    registry = new InteractionRegistry(),
    g = new T.BoxGeometry(),
    m = new T.MeshStandardMaterial();
  for (let i = 0; i < 4; i++) {
    const owner = new T.Group();
    owner.position.x = i;
    root.add(owner);
    const mesh = new T.Mesh(g, m);
    mesh.userData['instanceEligible'] = true;
    owner.add(mesh);
    registry.register({ id: 'pin-' + i, name: 'Pin' + i, role: 'academic', actions: ['inspect'] }, [
      owner,
    ]);
  }
  root.updateMatrixWorld(true);
  const batches = instanceContacts(root, registry, (g) => g);
  expect(batches).toHaveLength(1);
  expect(batches[0].count).toBe(4);
  expect(
    registry.resolveHit({ object: batches[0], instanceId: 2, point: new T.Vector3(), distance: 0 }),
  ).toBe('pin-2');
});
