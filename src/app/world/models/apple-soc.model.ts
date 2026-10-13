import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WorkshopGeometry } from './workshop-geometry';
export class AppleSocModel extends WorkshopGeometry {
  build(parent: T.Group): void {
    const pcb = this.tools.material('soc-pcb', '#273b35', 0.7, 0.08),
      metal = this.tools.material('soc-contacts', '#a09c8a', 0.4, 0.85),
      resin = this.tools.material('soc-packages', '#202425', 0.75, 0.08);
    this.box(parent, 7.7, 0.22, 6.4, 0, 0.25, 0, pcb);
    this.box(
      parent,
      4.65,
      0.19,
      4.95,
      0,
      0.49,
      0.2,
      this.tools.material('silicon-carrier', '#393d43', 0.32, 0.5),
    );
    const g = this.tools.track(new T.SphereGeometry(0.025, 6, 4));
    const balls = new T.InstancedMesh(g, metal, 256);
    balls.userData['detail'] = true;
    parent.add(balls);
    const matrix = new T.Matrix4();
    for (let row = 0; row < 16; row++)
      for (let col = 0; col < 16; col++) {
        matrix.makeTranslation((col - 7.5) * 0.26, 0.375, (row - 7.5) * 0.28 + 0.2);
        balls.setMatrixAt(row * 16 + col, matrix);
      }
    balls.instanceMatrix.needsUpdate = true;
    for (const x of [-3, 3])
      for (let n = 0; n < 3; n++) {
        const z = -1.9 + n * 1.8;
        this.box(parent, 0.95, 0.13, 1.3, x, 0.455, z, resin);
        this.tools.label(parent, 'MEM', x, 0.53, z, 0.75);
        const memoryBalls = new T.InstancedMesh(g, metal, 56);
        memoryBalls.name = 'conceptual-memory-bga';
        for (let row = 0; row < 8; row++)
          for (let col = 0; col < 7; col++) {
            matrix.makeTranslation(x + (col - 3) * 0.115, 0.375, z + (row - 3.5) * 0.14);
            memoryBalls.setMatrixAt(row * 7 + col, matrix);
          }
        parent.add(memoryBalls);
        const mouldMark = this.mesh(
          parent,
          new T.CylinderGeometry(0.034, 0.034, 0.003, 10),
          metal,
          x - 0.34,
          0.522,
          z - 0.49,
        );
        mouldMark.name = 'package-orientation';
      }
    const capacitors = new T.InstancedMesh(
      this.tools.track(new RoundedBoxGeometry(0.075, 0.055, 0.12, 1, 0.008)),
      this.tools.material('soc-decoupling', '#9f8963', 0.78, 0.02),
      40,
    );
    for (let i = 0; i < 40; i++) {
      const side = i < 20 ? -1 : 1,
        index = i % 20;
      matrix.makeTranslation(side * 2.53, 0.389, -2.3 + index * 0.25);
      capacitors.setMatrixAt(i, matrix);
    }
    parent.add(capacitors);
    for (const x of [-3.55, 3.55])
      for (const z of [-2.85, 2.85]) {
        this.screw(parent, x, 0.391, z);
        this.cylinder(parent, 0.11, 0.28, x, 0, z, metal);
      }
    this.tools.label(parent, 'SoC / MEMORIA COMPARTIDA', 0, 0.382, -2.9, 4.5);
  }
}
