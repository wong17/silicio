import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WorkshopTools } from '../electronics-workshop';
/** 1 presentation unit = 20 mm. Placement/PCB routing is an authored educational assembly. */
export class MemoryModels {
  constructor(private t: WorkshopTools) {}
  private mesh(p: T.Object3D, g: T.BufferGeometry, m: T.Material, x = 0, y = 0, z = 0) {
    const a = new T.Mesh(this.t.track(g), m);
    a.position.set(x, y, z);
    a.castShadow = a.receiveShadow = true;
    p.add(a);
    return a;
  }
  private box(
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
  private inst(
    p: T.Object3D,
    name: string,
    g: T.BufferGeometry,
    m: T.Material,
    poses: T.Matrix4[],
  ) {
    const a = new T.InstancedMesh(this.t.track(g), m, poses.length);
    a.name = name;
    poses.forEach((v, i) => a.setMatrixAt(i, v));
    a.castShadow = a.receiveShadow = true;
    p.add(a);
    return a;
  }
  classic(root: T.Group, parts: Map<string, T.Object3D>): void {
    const pcb = this.t.material('memory-pcb', '#264a35', 0.78, 0.04),
      black = this.t.material('dram-resin', '#292b29', 0.8, 0.02),
      steel = this.t.material('tin-leads', '#a1a4a0', 0.4, 0.88),
      copper = this.t.material('ram-copper', '#a59360', 0.58, 0.7);
    root.userData['capacityBytes'] = (16 * 65536) / 8;
    const board = this.box(root, 8.1, 0.13, 5.4, 0, 0.22, 0, pcb);
    board.name = 'classic-pcb';
    parts.set('memory-board', board);
    const leads: T.Matrix4[] = [],
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
        c.position.set(-2.7 + (n % 4) * 1.8, 0, (bank ? 1 : -1) * 1.16 + (n < 4 ? -0.42 : 0.42));
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
        this.t.label(c, '2164A-15', 0, 0.694, 0, 0.47);
        const notch = this.mesh(
          c,
          new T.CylinderGeometry(0.052, 0.052, 0.008, 12),
          this.t.material('dram-notch', '#121716', 0.9, 0),
          0,
          0.68,
          -0.39,
        );
        notch.name = 'orientation-recess';
        for (let side of [-1, 1])
          for (let pin = 0; pin < 8; pin++) {
            const x = c.position.x + side * 0.29,
              z = c.position.z - 0.4445 + pin * 0.127;
            leads.push(new T.Matrix4().makeTranslation(x, 0.415, z));
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
          this.t.material('decoupling-cap', '#967c50', 0.7, 0.01),
        );
      }
      this.t.label(
        b,
        bank ? 'IMPAR / D8-D15 / 64 KiB' : 'PAR / D0-D7 / 64 KiB',
        0,
        0.295,
        bank ? 2.3 : -2.3,
        5.7,
      );
    }
    const lead = new T.Shape();
    lead.moveTo(-0.075, 0.16);
    lead.lineTo(0.025, 0.16);
    lead.lineTo(0.045, 0.09);
    lead.lineTo(0.045, -0.13);
    lead.lineTo(0.025, -0.13);
    lead.lineTo(0.025, 0.07);
    lead.lineTo(0, 0.14);
    lead.lineTo(-0.075, 0.14);
    lead.closePath();
    const lg = new T.ExtrudeGeometry(lead, { depth: 0.025, bevelEnabled: false });
    lg.translate(0, 0, -0.0125);
    this.inst(root, 'dram-leads', lg, steel, leads);
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
      this.t.material('resistor', '#625845', 0.9, 0.05),
      resistors,
    );
    this.t.label(root, 'DRAM / 128 KiB / DOS BANCOS', 0, 0.295, 0, 4.2);
    for (const x of [-3.75, 3.75])
      for (const z of [-2.35, 2.35]) {
        this.mesh(root, new T.CylinderGeometry(0.12, 0.12, 0.23, 10), steel, x, 0.065, z);
        this.mesh(root, new T.CylinderGeometry(0.075, 0.075, 0.03, 10), steel, x, 0.31, z);
      }
  }
  dimm(root: T.Group, parts: Map<string, T.Object3D>): void {
    const pcb = this.t.material('dimm-soldermask', '#244d35', 0.76, 0.04),
      gold = this.t.material('gold-fingers', '#bba15b', 0.31, 0.92),
      black = this.t.material('fbga-resin', '#242728', 0.8, 0.04),
      steel = this.t.material('dimm-solder', '#969c96', 0.45, 0.9);
    const module = new T.Group();
    module.userData['part'] = 'dimm';
    parts.set('dimm', module);
    root.add(module);
    const w = 6.6675,
      h = 1.5625,
      base = 0.45,
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
      parts.set(c.userData['part'], c);
      module.add(c);
      this.box(c, 0.54, 0.66, 0.12, 0, 0, 0, black).name = 'FBGA-1Gx8';
      const label = new T.Group();
      label.rotation.x = Math.PI / 2;
      label.position.z = 0.069;
      this.t.label(label, '1G x 8', 0, 0, 0, 0.44);
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
      this.t.material('mlcc', '#a28b5c', 0.75, 0.01),
      passives,
    );
    const spd = this.box(module, 0.28, 0.24, 0.085, -2.9, base + 0.48, -0.072, black);
    spd.userData['part'] = 'spd';
    parts.set('spd', spd);
    const label = new T.Group();
    label.rotation.x = Math.PI / 2;
    label.position.set(0, base + 1.33, 0.035);
    this.t.label(label, 'KVR26N19S8/8 / 8 GB / DDR4-2666', 0, 0, 0, 4.3);
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
    hole.moveTo(-3.33, -0.047);
    hole.lineTo(-3.33, 0.047);
    hole.lineTo(3.33, 0.047);
    hole.lineTo(3.33, -0.047);
    hole.closePath();
    shape.holes.push(hole);
    const sg = new T.ExtrudeGeometry(shape, {
      depth: 0.25,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.01,
      bevelSegments: 1,
    });
    sg.rotateX(-Math.PI / 2);
    sg.translate(0, 0.18, 0);
    this.mesh(socket, sg, black);
    for (const x of [-3.6, 3.6]) {
      const latch = new T.Group();
      latch.position.set(x, 0.47, 0);
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
        this.t.material('socket-latch', '#b4b09a', 0.8, 0.01),
      );
      this.box(latch, 0.34, 0.09, 0.38, 0, 0.2, 0, black);
    }
    this.box(root, 7.7, 0.12, 2.3, 0, 0.1, 0, pcb);
    this.t.label(root, 'GALERÍA DDR4 / NO COMPATIBLE CON 8086', 0, 0.169, 1, 6.7);
  }
}
