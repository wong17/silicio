import * as T from 'three';
import { InteractionRegistry } from './interaction-registry';
/** Batch declared fixed contacts only. Invisible source meshes retain selection bounds; layer31 excludes them from picking. */
export function instanceContacts(
  root: T.Group,
  registry: InteractionRegistry,
  track: <G extends T.BufferGeometry>(g: G) => G,
): T.InstancedMesh[] {
  root.updateMatrixWorld(true);
  const groups = new Map<
      string,
      { mesh: T.Mesh; matrix: T.Matrix4; id: string; reflected: boolean }[]
    >(),
    inverse = root.matrixWorld.clone().invert();
  root.traverse((o) => {
    if (
      !(o instanceof T.Mesh) ||
      o instanceof T.InstancedMesh ||
      !o.userData['instanceEligible'] ||
      Array.isArray(o.material)
    )
      return;
    const id = registry.resolveHit({ object: o, distance: 0, point: new T.Vector3() });
    if (!id) return;
    const matrix = inverse.clone().multiply(o.matrixWorld),
      reflected = matrix.determinant() < 0,
      key = o.geometry.uuid + o.material.uuid + reflected;
    const entries = groups.get(key) ?? [];
    entries.push({ mesh: o, matrix, id, reflected });
    groups.set(key, entries);
  });
  const batches: T.InstancedMesh[] = [];
  for (const entries of groups.values()) {
    if (entries.length < 4) continue;
    let geometry = entries[0].mesh.geometry;
    if (entries[0].reflected) {
      geometry = track(geometry.clone().scale(1, 1, -1));
      const index = geometry.getIndex();
      if (index) {
        for (let n = 0; n < index.count; n += 3) {
          const b = index.getX(n + 1);
          index.setX(n + 1, index.getX(n + 2));
          index.setX(n + 2, b);
        }
        index.needsUpdate = true;
      }
    }
    const batch = new T.InstancedMesh(geometry, entries[0].mesh.material, entries.length);
    batch.name = 'contact-batch-' + batches.length;
    entries.forEach((e, i) => {
      if (e.reflected) e.matrix.multiply(new T.Matrix4().makeScale(1, 1, -1));
      batch.setMatrixAt(i, e.matrix);
      e.mesh.visible = false;
      e.mesh.layers.set(31);
    });
    batch.castShadow = batch.receiveShadow = true;
    root.add(batch);
    registry.registerInstanceMap(
      batch,
      entries.map((e) => e.id),
    );
    batches.push(batch);
  }
  return batches;
}
