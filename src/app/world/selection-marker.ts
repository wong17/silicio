import * as T from 'three';

/** World bounds of an object, skipping meshes that are not part of the piece (beam, dust, light ring). */
export function selectionBounds(object: T.Object3D, out = new T.Box3()): T.Box3 {
  out.makeEmpty();
  object.updateWorldMatrix(true, true);
  const box = new T.Box3();
  object.traverse((o) => {
    // Batched contacts (pins, pads) are hidden on layer 31 but still stand where they were: they count.
    const batched = o.layers.isEnabled(31);
    if (o.userData['noBounds'] || (!o.visible && !batched)) return;
    const mesh = o as T.Mesh;
    if (!mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox || mesh.geometry.boundingBox.isEmpty()) return;
    box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    out.union(box);
  });
  return out;
}

/** Eight L-shaped corners around the selected piece, with a short emission pulse when it is chosen. */
export class SelectionMarker extends T.LineSegments {
  private pulse = 0;
  private readonly box = new T.Box3();

  constructor(color = '#d7ac6f') {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(8 * 3 * 2 * 3), 3));
    super(geometry, new T.LineBasicMaterial({ color, transparent: true, depthTest: false }));
    this.renderOrder = 999;
    this.frustumCulled = false;
    this.visible = false;
  }

  /** Fits the corners to `object`; returns false (and hides) when it has no measurable bounds. */
  fit(object: T.Object3D | undefined): boolean {
    if (!object) {
      this.visible = false;
      return false;
    }
    selectionBounds(object, this.box);
    if (this.box.isEmpty()) {
      this.visible = false;
      return false;
    }
    const { min, max } = this.box;
    const size = this.box.getSize(new T.Vector3());
    const leg = new T.Vector3(size.x, size.y, size.z).multiplyScalar(0.22).clampScalar(0.04, 0.6);
    const attr = this.geometry.getAttribute('position') as T.BufferAttribute;
    let n = 0;
    for (const x of [min.x, max.x])
      for (const y of [min.y, max.y])
        for (const z of [min.z, max.z]) {
          const sx = x === min.x ? 1 : -1,
            sy = y === min.y ? 1 : -1,
            sz = z === min.z ? 1 : -1;
          for (const end of [
            [x + sx * leg.x, y, z],
            [x, y + sy * leg.y, z],
            [x, y, z + sz * leg.z],
          ]) {
            attr.setXYZ(n++, x, y, z);
            attr.setXYZ(n++, end[0], end[1], end[2]);
          }
        }
    attr.needsUpdate = true;
    this.visible = true;
    return true;
  }

  /** Starts the 300 ms emission pulse. */
  flash(): void {
    this.pulse = 0.3;
  }

  update(dt: number, reduced: boolean): void {
    const m = this.material as T.LineBasicMaterial;
    this.pulse = Math.max(0, this.pulse - dt);
    m.opacity = reduced ? 1 : 0.7 + 0.3 * (this.pulse / 0.3);
  }
}
