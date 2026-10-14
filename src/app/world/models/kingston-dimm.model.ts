import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MemoryGeometry } from './memory-geometry';
/** Underside of the module board, above the station origin; the station is grounded from here. */
export const KINGSTON_BOARD_BASE = 0.04;

export class KingstonDimmModel extends MemoryGeometry {
  build(root: T.Group, parts: Map<string, T.Object3D>): void {
    const pcb = this.tools.material('dimm-soldermask', '#244d35', 0.76, 0.04),
      gold = this.tools.material('gold-fingers', '#bba15b', 0.31, 0.92),
      black = this.tools.material('fbga-resin', '#242728', 0.8, 0.04),
      steel = this.tools.material('dimm-solder', '#969c96', 0.45, 0.9);
    const module = new T.Group();
    module.userData['part'] = 'dimm';
    parts.set('dimm', module);
    root.add(module);
    const w = 6.6675,
      h = 1.5625,
      base = 0.31,
      notch = -0.29;
    const profile = new T.Shape();
    profile.moveTo(-w / 2, 0);
    profile.lineTo(notch - 0.045, 0);
    profile.lineTo(notch - 0.045, 0.15);
    profile.quadraticCurveTo(notch, 0.19, notch + 0.045, 0.15);
    profile.lineTo(notch + 0.045, 0);
    profile.lineTo(w / 2, 0);
    profile.lineTo(w / 2, 0.34);
    profile.lineTo(w / 2 - 0.08, 0.34);
    profile.lineTo(w / 2 - 0.08, 0.49);
    profile.lineTo(w / 2, 0.49);
    profile.lineTo(w / 2, h);
    profile.lineTo(-w / 2, h);
    profile.lineTo(-w / 2, 0.49);
    profile.lineTo(-w / 2 + 0.08, 0.49);
    profile.lineTo(-w / 2 + 0.08, 0.34);
    profile.lineTo(-w / 2, 0.34);
    profile.closePath();
    const bg = new T.ExtrudeGeometry(profile, { depth: 0.06, bevelEnabled: false });
    bg.translate(0, base, -0.03);
    this.mesh(module, bg, pcb).name = 'dimm-pcb';
    const contacts: T.Matrix4[][] = [[], []];
    for (let face = 0; face < 2; face++)
      for (let n = 0; n < 144; n++) {
        const x = n < 72 ? -3.21 + n * 0.04 : notch + 0.14 + (n - 72) * 0.042;
        contacts[face].push(
          new T.Matrix4().makeTranslation(x, base + 0.105, (face ? 1 : -1) * 0.034),
        );
      }
    for (let f = 0; f < 2; f++)
      this.inst(
        module,
        'contacts-' + f,
        new RoundedBoxGeometry(0.027, 0.19, 0.008, 1, 0.003),
        gold,
        contacts[f],
      );
    const passives: T.Matrix4[] = [],
      balls: T.Matrix4[] = [];
    for (let n = 0; n < 8; n++) {
      const c = new T.Group();
      c.position.set(-2.73 + n * 0.78, base + 0.85, 0.105);
      c.userData['part'] = 'dimm-chip-' + n;
      c.userData['restZ'] = c.position.z;
      parts.set(c.userData['part'], c);
      module.add(c);
      this.box(c, 0.54, 0.66, 0.12, 0, 0, 0, black).name = 'FBGA-1Gx8';
      const label = new T.Group();
      label.rotation.x = Math.PI / 2;
      label.position.z = 0.069;
      this.tools.label(label, '1G x 8', 0, 0, 0, 0.44);
      c.add(label);
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 8; col++)
          balls.push(
            new T.Matrix4().makeTranslation(
              c.position.x - 0.2 + col * 0.058,
              c.position.y - 0.24 + row * 0.115,
              0.043,
            ),
          );
      for (let k = 0; k < 4; k++)
        passives.push(
          new T.Matrix4().makeTranslation(c.position.x - 0.16 + k * 0.11, base + 0.39, 0.049),
        );
    }
    this.inst(module, 'fbga-solder-balls', new T.SphereGeometry(0.012, 6, 4), steel, balls);
    this.inst(
      module,
      'dimm-decoupling',
      new RoundedBoxGeometry(0.055, 0.09, 0.028, 1, 0.004),
      this.tools.material('mlcc', '#a28b5c', 0.75, 0.01),
      passives,
    );
    const spd = this.box(module, 0.28, 0.24, 0.085, -2.9, base + 0.48, -0.072, black);
    spd.userData['part'] = 'spd';
    spd.userData['restZ'] = spd.position.z;
    parts.set('spd', spd);
    const label = new T.Group();
    label.rotation.x = Math.PI / 2;
    label.position.set(0, base + 1.33, 0.035);
    this.tools.label(label, 'KVR26N19S8/8 / 8 GB / DDR4-2666', 0, 0, 0, 4.3);
    module.add(label);
    const socket = new T.Group();
    socket.userData['part'] = 'dimm-socket';
    parts.set('dimm-socket', socket);
    root.add(socket);
    const shape = new T.Shape();
    shape.moveTo(-3.55, -0.2);
    shape.lineTo(3.55, -0.2);
    shape.lineTo(3.55, 0.2);
    shape.lineTo(-3.55, 0.2);
    shape.closePath();
    const hole = new T.Path();
    hole.moveTo(-3.35, -0.052);
    hole.lineTo(-3.35, 0.052);
    hole.lineTo(3.35, 0.052);
    hole.lineTo(3.35, -0.052);
    hole.closePath();
    shape.holes.push(hole);
    const sg = new T.ExtrudeGeometry(shape, {
      depth: 0.25,
      bevelEnabled: true,
      bevelSize: 0.004,
      bevelThickness: 0.01,
      bevelSegments: 1,
    });
    sg.rotateX(-Math.PI / 2);
    sg.translate(0, 0.17, 0);
    this.mesh(socket, sg, black);
    for (const x of [-3.6, 3.6]) {
      const latch = new T.Group();
      latch.position.set(x, 0.535, 0);
      latch.userData['part'] = 'latch-' + (x < 0 ? 'left' : 'right');
      parts.set(latch.userData['part'], latch);
      socket.add(latch);
      this.box(
        latch,
        0.23,
        0.47,
        0.42,
        0,
        0,
        0,
        this.tools.material('socket-latch', '#b4b09a', 0.8, 0.01),
      );
      this.box(latch, 0.35, 0.09, 0.14, x < 0 ? 0.17 : -0.17, 0.2, 0, black);
    }
    this.box(root, 7.7, 0.12, 2.3, 0, KINGSTON_BOARD_BASE + 0.06, 0, pcb);
    for (const x of [-3.5, 3.5])
      for (const z of [-0.8, 0.8])
        this.mesh(root, new T.CylinderGeometry(0.09, 0.09, 0.18, 8), steel, x, -0.05, z);
    this.tools.label(root, 'GALERÍA DDR4 / NO COMPATIBLE CON 8086', 0, 0.169, 1, 6.7);
  }
}
