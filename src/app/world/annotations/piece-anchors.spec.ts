import * as THREE from 'three';
import { localAnchor, worldAnchor } from './piece-anchors';

function box(w: number, h: number, d: number, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  mesh.position.set(x, y, z);
  return mesh;
}

describe('anclas de piezas', () => {
  it('un grupo disperso se ancla sobre una de sus piezas, no en el centro vacío', () => {
    const group = new THREE.Group();
    group.add(box(1, 1, 1, -5, 0.5, 0), box(1, 1, 1, 5, 0.5, 0));
    group.updateMatrixWorld(true);
    const anchor = worldAnchor(group, localAnchor(group));
    expect(Math.abs(anchor.x)).toBeGreaterThanOrEqual(4.5);
    expect(anchor.y).toBeCloseTo(1, 5);
  });

  it('una pieza sólida se ancla en la cara superior', () => {
    const mesh = box(2, 1, 2, 0, 0.5, 0);
    mesh.updateMatrixWorld(true);
    const anchor = worldAnchor(mesh, localAnchor(mesh));
    expect(anchor.y).toBeCloseTo(1, 5);
  });

  it('el ancla local acompaña a la pieza cuando se mueve, gira o se abre el despiece', () => {
    const mesh = box(2, 1, 2, 0, 0.5, 0);
    mesh.updateMatrixWorld(true);
    const local = localAnchor(mesh);
    const before = worldAnchor(mesh, local);
    mesh.position.set(3, 2, -1);
    mesh.rotation.y = Math.PI / 2;
    mesh.updateMatrixWorld(true);
    const after = worldAnchor(mesh, local);
    const expected = before
      .clone()
      .sub(new THREE.Vector3(0, 0.5, 0))
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
      .add(new THREE.Vector3(3, 2, -1));
    expect(after.distanceTo(expected)).toBeLessThan(1e-6);
  });
});
