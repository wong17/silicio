import * as T from 'three';
/** Object-owned instance buffers are separate from geometry-owned vertex buffers. */ export function releaseInstanceBuffers(
  root: T.Object3D,
): void {
  root.traverse((object) => {
    if (object instanceof T.InstancedMesh) object.dispose();
  });
}
