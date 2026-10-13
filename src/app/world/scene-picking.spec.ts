import { it, expect } from 'vitest';
import * as T from 'three';
import { ElectronicsWorkshop } from './electronics-workshop';
import { InteractionRegistry } from './interaction-registry';
import { instanceContacts } from './static-instancing';
import { firstInspectableHit } from './scene-picking';
it('rendered_terminal_instances_remain_clickable', () => {
  const root = new T.Group(),
    parts = new Map<string, T.Object3D>(),
    registry = new InteractionRegistry(),
    tools = {
      track: <G extends T.Material | T.BufferGeometry | T.Texture>(r: G) => r,
      material: () => new T.MeshStandardMaterial(),
      label: () => {},
      animate: () => {},
    };
  new ElectronicsWorkshop(tools).cpu(root, parts);
  for (const [id, o] of parts)
    registry.register({ id, name: id, role: 'academic', actions: ['inspect'] }, [o]);
  const instances = instanceContacts(root, registry, (g) => g);
  root.updateMatrixWorld(true);
  const ray = new T.Raycaster(new T.Vector3(-2.66, 1.3, 1.45), new T.Vector3(0, -1, 0));
  expect(firstInspectableHit(ray, [parts.get('pin-1')!], instances, registry)?.id).toBe('pin-1');
});
