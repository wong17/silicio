import * as THREE from 'three';

/** Vertices visited per mesh at most; larger meshes are sampled with a stride. */
const SAMPLE_LIMIT = 4000;

const point = new THREE.Vector3();
const instance = new THREE.Matrix4();
const world = new THREE.Matrix4();

/**
 * Anchor of a piece in its own local coordinates: the point of its geometry nearest to the top centre of
 * its bounding box. A scattered group (capacitors, traces) is anchored on one of its parts instead of the
 * empty middle, and the anchor follows the piece when it moves, turns or opens in the exploded view.
 */
export function localAnchor(object: THREE.Object3D): THREE.Vector3 {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return new THREE.Vector3();
  const target = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
  let best: THREE.Vector3 | null = null;
  let bestDistance = Infinity;
  // Height weighs more than the horizontal offset: a label belongs on top of the piece, not on its flank.
  const score = (p: THREE.Vector3) =>
    (p.x - target.x) ** 2 + (p.z - target.z) ** 2 + 4 * (p.y - target.y) ** 2;
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const position = mesh.geometry?.getAttribute('position');
    if (!position) return;
    const stride = Math.max(1, Math.ceil(position.count / SAMPLE_LIMIT));
    const instanced = (mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh) : null;
    const copies = instanced ? Math.min(instanced.count, 64) : 1;
    for (let c = 0; c < copies; c++) {
      if (instanced) {
        instanced.getMatrixAt(c, instance);
        world.multiplyMatrices(mesh.matrixWorld, instance);
      } else world.copy(mesh.matrixWorld);
      for (let i = 0; i < position.count; i += stride) {
        point.fromBufferAttribute(position, i).applyMatrix4(world);
        const d = score(point);
        if (d < bestDistance) {
          bestDistance = d;
          best = (best ?? new THREE.Vector3()).copy(point);
        }
      }
    }
  });
  const anchor: THREE.Vector3 = best ?? target;
  return object.worldToLocal(anchor.clone());
}

/** World position of a local anchor with the piece's current transform. */
export function worldAnchor(object: THREE.Object3D, local: THREE.Vector3): THREE.Vector3 {
  return object.localToWorld(local.clone());
}
