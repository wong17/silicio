import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WorkshopGeometry } from './workshop-geometry';
export abstract class MemoryGeometry extends WorkshopGeometry {
  protected override box(
    p: T.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m: T.Material,
  ) {
    return this.mesh(p, new RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * 0.12), m, x, y, z);
  }
  protected inst(
    p: T.Object3D,
    name: string,
    g: T.BufferGeometry,
    m: T.Material,
    poses: T.Matrix4[],
  ) {
    const a = new T.InstancedMesh(this.tools.track(g), m, poses.length);
    a.name = name;
    poses.forEach((v, i) => a.setMatrixAt(i, v));
    a.castShadow = a.receiveShadow = true;
    p.add(a);
    return a;
  }
}
