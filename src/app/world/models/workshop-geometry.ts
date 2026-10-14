import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { WorkshopTools } from '../workshop-tools';
export abstract class WorkshopGeometry {
  constructor(protected readonly tools: WorkshopTools) {}
  protected mesh(
    parent: T.Object3D,
    g: T.BufferGeometry,
    m: T.Material,
    x = 0,
    y = 0,
    z = 0,
  ): T.Mesh {
    const mesh = new T.Mesh(this.tools.track(g), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  protected box(
    parent: T.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m: T.Material,
  ): T.Mesh {
    const mesh = this.mesh(
      parent,
      new RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * 0.13),
      m,
      x,
      y,
      z,
    );
    mesh.userData['detail'] = w * h * d < 0.003 && Math.max(w, h, d) < 0.7;
    return mesh;
  }
  protected cylinder(
    parent: T.Object3D,
    r: number,
    h: number,
    x: number,
    y: number,
    z: number,
    m: T.Material,
  ): T.Mesh {
    return this.mesh(parent, new T.CylinderGeometry(r, r, h, 20), m, x, y, z);
  }
  protected wire(parent: T.Object3D, points: number[][], radius: number, m: T.Material): T.Mesh {
    return this.mesh(
      parent,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(
          points.map((p) => new T.Vector3(...(p as [number, number, number]))),
        ),
        24,
        radius,
        6,
        false,
      ),
      m,
    );
  }
  protected ring(
    parent: T.Object3D,
    r: number,
    t: number,
    x: number,
    y: number,
    z: number,
    m: T.Material,
  ): void {
    const a = this.mesh(parent, new T.TorusGeometry(r, t, 6, 16), m, x, y, z);
    a.rotation.x = Math.PI / 2;
  }
  protected screw(parent: T.Object3D, x: number, y: number, z: number): void {
    const metal = this.tools.material('brushed-steel', '#798083', 0.4, 0.85);
    this.cylinder(parent, 0.075, 0.055, x, y, z, metal);
    this.box(
      parent,
      0.095,
      0.008,
      0.016,
      x,
      y + 0.031,
      z,
      this.tools.material('screw-slot', '#212426', 0.9, 0.03),
    );
  }
}
