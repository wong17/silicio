import type * as T from 'three';
import type { InteractionRegistry } from './interaction-registry';
/** Resolve the first rendered semantic surface, including object-owned instances. */ export function firstInspectableHit(
  ray: T.Raycaster,
  owners: T.Object3D[],
  instances: T.InstancedMesh[],
  registry: InteractionRegistry,
): { hit: T.Intersection; id: string } | undefined {
  for (const hit of ray.intersectObjects([...owners, ...instances], true)) {
    let visible = true;
    for (let object: T.Object3D | null = hit.object; object; object = object.parent)
      if (!object.visible) {
        visible = false;
        break;
      }
    if (!visible) continue;
    const id = registry.resolveHit(hit);
    if (id) return { hit, id };
  }
  return undefined;
}
