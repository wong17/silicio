import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MemoryGeometry } from './memory-geometry';
/** Underside of the classic board, above the station origin; the station is grounded from here. */
export const CLASSIC_BOARD_BASE = 0.155;

export class Intel2164aMemoryModel extends MemoryGeometry {
  build(root: T.Group, parts: Map<string, T.Object3D>): void {
    const pcb = this.tools.material('memory-pcb', '#264a35', 0.78, 0.04),
      black = this.tools.material('dram-resin', '#292b29', 0.8, 0.02),
      steel = this.tools.material('tin-leads', '#a1a4a0', 0.4, 0.88),
      copper = this.tools.material('ram-copper', '#a59360', 0.58, 0.7);
    root.userData['capacityBytes'] = (16 * 65536) / 8;
    const boardShape = new T.Shape();
    boardShape.moveTo(-4.05, -2.7);
    boardShape.lineTo(4.05, -2.7);
    boardShape.lineTo(4.05, 2.7);
    boardShape.lineTo(-4.05, 2.7);
    boardShape.closePath();
    for (let bank = 0; bank < 2; bank++)
      for (let n = 0; n < 8; n++)
        for (const side of [-1, 1])
          for (let pin = 0; pin < 8; pin++) {
            const x = -2.7 + (n % 4) * 1.8 + side * 0.29,
              z = (bank ? 1 : -1) * 1.4 + (n < 4 ? -0.6 : 0.6) - 0.4445 + pin * 0.127;
            const hole = new T.Path();
            hole.absarc(x, -z, 0.026, 0, Math.PI * 2, true);
            boardShape.holes.push(hole);
          }
    const boardGeometry = new T.ExtrudeGeometry(boardShape, {
      depth: 0.13,
      bevelEnabled: false,
      curveSegments: 8,
    });
    boardGeometry.rotateX(-Math.PI / 2);
    boardGeometry.translate(0, CLASSIC_BOARD_BASE, 0);
    const board = this.mesh(root, boardGeometry, pcb);
    board.name = 'classic-pcb';
    parts.set('memory-board', board);
    const leads: T.Matrix4[][] = [[], []],
      solder: T.Matrix4[] = [],
      vias: T.Matrix4[] = [],
      resistors: T.Matrix4[] = [];
    for (let bank = 0; bank < 2; bank++) {
      const b = new T.Group();
      b.userData['part'] = bank ? 'bank-odd' : 'bank-even';
      parts.set(b.userData['part'], b);
      root.add(b);
      for (let n = 0; n < 8; n++) {
        const c = new T.Group();
        c.position.set(-2.7 + (n % 4) * 1.8, 0, (bank ? 1 : -1) * 1.4 + (n < 4 ? -0.6 : 0.6));
        c.userData['part'] = 'dram-' + bank + '-' + n;
        parts.set(c.userData['part'], c);
        b.add(c);
        this.box(c, 0.67, 0.16, 1.1, 0, 0.37, 0, black);
        const profile = new T.Shape();
        profile.moveTo(-0.22, -0.49);
        profile.lineTo(0.22, -0.49);
        profile.lineTo(0.22, 0.49);
        profile.lineTo(-0.22, 0.49);
        profile.lineTo(-0.22, -0.49);
        profile.closePath();
        const orientationHole = new T.Path();
        orientationHole.absarc(0, 0.39, 0.052, 0, Math.PI * 2, true);
        profile.holes.push(orientationHole);
        const body = new T.ExtrudeGeometry(profile, {
          depth: 0.19,
          bevelEnabled: true,
          bevelSize: 0.018,
          bevelThickness: 0.014,
          bevelSegments: 1,
        });
        body.rotateX(-Math.PI / 2);
        body.translate(0, 0.48, 0);
        this.mesh(c, body, black).name = '2164A-package';
        this.tools.label(c, '2164A-15', 0, 0.694, 0, 0.47);
        const notch = this.mesh(
          c,
          new T.CircleGeometry(0.031, 12),
          this.tools.material('dram-notch', '#121716', 0.9, 0),
          0,
          0.662,
          -0.39,
        );
        notch.rotation.x = -Math.PI / 2;
        notch.name = 'orientation-recess-floor';
        for (let side of [-1, 1])
          for (let pin = 0; pin < 8; pin++) {
            const x = c.position.x + side * 0.29,
              z = c.position.z - 0.4445 + pin * 0.127;
            leads[side < 0 ? 0 : 1].push(new T.Matrix4().makeTranslation(x, 0.415, z));
            solder.push(new T.Matrix4().makeTranslation(x, 0.292, z));
            vias.push(new T.Matrix4().makeTranslation(x + side * 0.1, 0.293, z));
          }
        this.box(
          c,
          0.07,
          0.07,
          0.13,
          0.49,
          0.34,
          0.35,
          this.tools.material('decoupling-cap', '#967c50', 0.7, 0.01),
        );
      }
      this.tools.label(b, bank ? 'IMPAR' : 'PAR', -3.65, 0.295, bank ? 1.4 : -1.4, 0.55);
    }
    const lead = new T.Shape();
    lead.moveTo(-0.075, 0.16);
    lead.lineTo(0.025, 0.16);
    lead.lineTo(0.045, 0.09);
    lead.lineTo(0.045, -0.28);
    lead.lineTo(0.025, -0.28);
    lead.lineTo(0.025, 0.07);
    lead.lineTo(0, 0.14);
    lead.lineTo(-0.075, 0.14);
    lead.closePath();
    const lg = new T.ExtrudeGeometry(lead, { depth: 0.025, bevelEnabled: false });
    lg.translate(-0.035, 0, -0.0125);
    const mirrored = lg.clone().scale(-1, 1, 1);
    const index = mirrored.getIndex();
    if (index)
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i);
        index.setX(i, index.getX(i + 2));
        index.setX(i + 2, a);
      }
    mirrored.computeVertexNormals();
    this.inst(root, 'dram-leads-front', mirrored, steel, leads[0]);
    this.inst(root, 'dram-leads-rear', lg, steel, leads[1]);
    this.inst(root, 'solder-joints', new T.SphereGeometry(0.046, 6, 4), steel, solder);
    this.inst(root, 'via-barrels', new T.CylinderGeometry(0.024, 0.024, 0.015, 6), copper, vias);
    for (let n = 0; n < 18; n++) {
      const x = -3.35 + n * 0.395;
      this.box(root, 0.018, 0.007, 3.2, x, 0.294, 0, copper);
      resistors.push(new T.Matrix4().makeTranslation(x, 0.335, 0));
    }
    this.inst(
      root,
      'termination-resistors',
      new RoundedBoxGeometry(0.12, 0.075, 0.18, 1, 0.01),
      this.tools.material('resistor', '#625845', 0.9, 0.05),
      resistors,
    );

    for (const x of [-3.75, 3.75])
      for (const z of [-2.35, 2.35]) {
        this.mesh(root, new T.CylinderGeometry(0.12, 0.12, 0.295, 10), steel, x, 0.0075, z);
        this.mesh(root, new T.CylinderGeometry(0.075, 0.075, 0.03, 10), steel, x, 0.31, z);
      }
  }
}
