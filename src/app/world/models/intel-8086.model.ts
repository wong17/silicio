import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';
import { CPU_ASSEMBLY as C, cpuPinX } from './cpu-assembly';
/** Painted ceramic lid: wear must not expose pale bare metal, or the markings vanish. */
export const CPU_LID_LOOK = { finish: 'paint', metal: false, wear: 0.12, exposed: '#3b403e' } as const;
export class Intel8086Model extends WorkshopGeometry {
  build(parent: T.Group, parts: Map<string, T.Object3D>): void {
    const pcb = this.tools.material('board-soldermask', '#244436', 0.8, 0.06);
    const brass = this.tools.material('pin-alloy', '#b0a179', 0.38, 0.88);
    const resin = this.tools.material('socket-resin', '#202325', 0.88, 0.01);
    const ceramic = this.tools.material('ceramic-alumina', '#b4ae98', 0.66, 0);
    const copper = this.tools.material('board-traces', '#8c7850', 0.55, 0.65);
    const boardProfile = new T.Shape();
    boardProfile.moveTo(-4.05, -2.675);
    boardProfile.lineTo(4.05, -2.675);
    boardProfile.lineTo(4.05, 2.675);
    boardProfile.lineTo(-4.05, 2.675);
    boardProfile.closePath();
    for (const side of [-1, 1])
      for (let n = 0; n < 20; n++) {
        const hole = new T.Path();
        hole.absarc(cpuPinX(n), side * 1.45, 0.074, 0, Math.PI * 2, true);
        boardProfile.holes.push(hole);
      }
    const boardGeometry = new T.ExtrudeGeometry(boardProfile, {
      depth: 0.22,
      bevelEnabled: false,
      curveSegments: 16,
    });
    boardGeometry.rotateX(-Math.PI / 2);
    boardGeometry.translate(0, 0.14, 0);
    this.mesh(parent, boardGeometry, pcb).name = 'pcb';
    const socket = new T.Group();
    socket.userData['part'] = 'socket';
    parts.set('socket', socket);
    parent.add(socket);
    const housingProfile = new T.Shape();
    housingProfile.moveTo(-3.35, -1.59);
    housingProfile.lineTo(3.35, -1.59);
    housingProfile.lineTo(3.35, 1.59);
    housingProfile.lineTo(-3.35, 1.59);
    housingProfile.closePath();
    for (const side of [-1, 1])
      for (let n = 0; n < 20; n++) {
        const channel = new T.Path();
        channel.absarc(cpuPinX(n), side * C.pinAxisZ, C.pinChannelRadius, 0, Math.PI * 2, true);
        housingProfile.holes.push(channel);
      }
    const housingGeometry = new T.ExtrudeGeometry(housingProfile, {
      depth: C.socketTop - C.socketBottom - 0.008,
      bevelEnabled: true,
      bevelSize: 0.004,
      bevelThickness: 0.004,
      bevelSegments: 2,
      curveSegments: 12,
    });
    housingGeometry.rotateX(-Math.PI / 2);
    housingGeometry.translate(0, C.socketBottom + 0.004, 0);
    this.mesh(socket, housingGeometry, resin).name = 'socket-housing';
    for (const side of [-1, 1])
      this.box(socket, 6.35, 0.032, 0.3, 0, C.railTop - 0.016, side * 1.02, resin).name =
        'socket-rail-' + side;
    for (const x of [-3.12, 3.12])
      for (const z of [-1.2, 1.2])
        this.cylinder(
          socket,
          0.075,
          C.socketBottom - C.pcbTop,
          x,
          (C.socketBottom + C.pcbTop) / 2,
          z,
          resin,
        ).name = 'socket-seating-foot';
    const bodyProfile = new T.Shape();
    bodyProfile.moveTo(-3.06, -0.97);
    bodyProfile.lineTo(3.06, -0.97);
    bodyProfile.lineTo(3.06, 0.97);
    bodyProfile.lineTo(-3.06, 0.97);
    bodyProfile.closePath();
    const cavity = new T.Path();
    cavity.moveTo(-2.82, -0.7);
    cavity.lineTo(-2.82, 0.7);
    cavity.lineTo(2.82, 0.7);
    cavity.lineTo(2.82, -0.7);
    cavity.closePath();
    bodyProfile.holes.push(cavity);
    const ceramicGeo = new T.ExtrudeGeometry(bodyProfile, {
      depth: 0.24,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.018,
      bevelSegments: 2,
    });
    ceramicGeo.rotateX(-Math.PI / 2);
    ceramicGeo.translate(0, 0.67, 0);
    this.mesh(parent, ceramicGeo, ceramic).name = 'ceramic-body';
    this.box(parent, 5.55, 0.04, 1.33, 0, 0.705, 0, resin);
    this.box(
      parent,
      2.25,
      0.045,
      1.0,
      0,
      0.75,
      0,
      this.tools.material('die-silicon', '#4e505c', 0.28, 0.6),
    );
    // Forty bond wires, twenty along each long edge of the die, one for every terminal of the package.
    for (const side of [1, -1])
      for (let n = 0; n < 20; n++) {
        const x = -1.0925 + n * 0.115;
        const number = side === 1 ? n + 1 : 40 - n;
        const wire = this.wire(
          parent,
          [
            [x, 0.785, side * 0.45],
            [x, 0.85, side * 0.6],
            [x, 0.855, side * 0.81],
          ],
          0.004,
          brass,
        );
        wire.name = 'bond-wire-' + number;
      }
    // Moulded shoulders and a thin sealing seam, each with its own surface.
    for (const side of [-1, 1])
      this.box(
        parent,
        5.7,
        C.sealHeight,
        0.04,
        0,
        C.ceramicTop + C.sealHeight / 2,
        side * 0.835,
        brass,
      ).name = 'seal-band-' + side;
    const cap = new T.Group();
    cap.position.set(0, C.capRestY, 0);
    cap.userData['part'] = 'lid';
    cap.userData['restY'] = C.capRestY;
    const shape = new T.Shape();
    const x = 2.97,
      z = 0.86,
      r = 0.12;
    shape.moveTo(-x + r, -z);
    shape.lineTo(x - r, -z);
    shape.quadraticCurveTo(x, -z, x, -z + r);
    shape.lineTo(x, z - r);
    shape.quadraticCurveTo(x, z, x - r, z);
    shape.lineTo(-x + r, z);
    shape.quadraticCurveTo(-x, z, -x, z - r);
    shape.lineTo(-x, 0.21);
    shape.absarc(-x, 0.0, 0.21, Math.PI / 2, -Math.PI / 2, true);
    shape.lineTo(-x, -z + r);
    shape.quadraticCurveTo(-x, -z, -x + r, -z);
    const geo = new T.ExtrudeGeometry(shape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
      steps: 1,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -0.07, 0);
    this.mesh(cap, geo, this.tools.material('cpu-lid-painted', '#292d2c', 0.6, 0.1, CPU_LID_LOOK));
    this.tools.label(cap, 'INTEL   8086', 0, 0.102, -0.2, 3.7);
    this.tools.label(cap, '16-BIT HMOS   /   DIP-40', 0, 0.103, 0.27, 3.5);
    this.cylinder(cap, 0.055, 0.012, -2.64, 0.106, 0.58, brass).name = 'pin-one-marker';
    parent.add(cap);
    parts.set('lid', cap);
    // Continuous extruded bent lead profile; plated contact is at a distinct height.
    const lead = new T.Shape();
    [
      [C.shoulderInnerZ, C.shoulderTop],
      [1.15, C.shoulderTop],
      [1.48, 0.72],
      [1.48, 0.12],
      [1.42, 0.12],
      [1.42, 0.69],
      [1.11, C.shoulderBottom],
      [C.shoulderInnerZ, C.shoulderBottom],
    ].forEach(([a, b], i) => (i ? lead.lineTo(a, b) : lead.moveTo(a, b)));
    const leadGeo = this.tools.track(
      new T.ExtrudeGeometry(lead, {
        depth: 0.08,
        bevelEnabled: true,
        bevelSize: 0.008,
        bevelThickness: 0.008,
        bevelSegments: 1,
        steps: 1,
      }),
    );
    leadGeo.rotateY(-Math.PI / 2);
    leadGeo.translate(0.04, 0, 0); // Center the extruded depth on the terminal mounting axis.
    const padProfile = new T.Shape();
    padProfile.absarc(0, 0, 0.096, 0, Math.PI * 2, false);
    const padOpening = new T.Path();
    padOpening.absarc(0, 0, 0.072, 0, Math.PI * 2, true);
    padProfile.holes.push(padOpening);
    const padGeo = this.tools.track(
      new T.ExtrudeGeometry(padProfile, { depth: 0.015, bevelEnabled: false, curveSegments: 16 }),
    );
    padGeo.rotateX(-Math.PI / 2);
    const barrelProfile = new T.Shape();
    barrelProfile.absarc(0, 0, 0.073, 0, Math.PI * 2, false);
    const lumen = new T.Path();
    lumen.absarc(0, 0, 0.072, 0, Math.PI * 2, true);
    barrelProfile.holes.push(lumen);
    const barrelGeo = this.tools.track(
      new T.ExtrudeGeometry(barrelProfile, {
        depth: 0.222,
        bevelEnabled: false,
        curveSegments: 12,
      }),
    );
    barrelGeo.rotateX(-Math.PI / 2);
    for (const side of [-1, 1])
      for (let n = 0; n < 20; n++) {
        const px = cpuPinX(n);
        const number = side === 1 ? n + 1 : 40 - n;
        const group = new T.Group();
        group.position.x = px;
        group.userData['part'] = 'pin-' + number;
        parent.add(group);
        const pin = new T.Mesh(leadGeo, brass);
        pin.scale.z = side;
        group.add(pin);
        pin.castShadow = true;
        const pad = this.mesh(group, padGeo, brass, 0, 0.356, side * 1.45);
        pad.name = 'pad-' + number;
        pad.userData['instanceEligible'] = true;
        const barrel = this.mesh(group, barrelGeo, brass, 0, 0.139, side * 1.45);
        barrel.name = 'barrel-' + number;
        barrel.userData['instanceEligible'] = true;
        pin.userData['instanceEligible'] = true;
        parts.set('pin-' + number, group);
        // Actual trace routing on the board, separate from all component face planes.
        const routeZ = side * (1.75 + (n % 4) * 0.13);
        this.wire(
          parent,
          [
            [px, 0.375, side * 1.539],
            [px, 0.375, routeZ],
            [px + (n < 10 ? -0.17 : 0.17), 0.375, routeZ + side * 0.14],
          ],
          0.007,
          copper,
        );
      }
    // Silkscreen datum and board fasteners.
    this.tools.label(parent, 'U1 / 8086 · marcado ilustrativo', -2.2, 0.389, 1.86, 2.6);
    this.tools.label(parent, 'CPU  ·  MEMORIA  ·  ENTRADA / SALIDA', 0, 0.389, 2.39, 5.5);
    const supports = new T.Group();
    supports.userData['part'] = 'supports';
    parts.set('supports', supports);
    parent.add(supports);
    for (const px of [-3.75, 3.75])
      for (const pz of [-2.37, 2.37]) {
        this.screw(supports, px, 0.391, pz);
        this.cylinder(
          supports,
          0.12,
          0.28,
          px,
          0,
          pz,
          this.tools.material('spacers', '#75746a', 0.5, 0.75),
        );
      }
    // Clock module, decoupling, two companion logic packages, bus headers.
    const clock = new T.Group();
    clock.position.set(-3.45, 0.47, -1.25);
    clock.userData['part'] = 'clock';
    parent.add(clock);
    parts.set('clock', clock);
    this.box(
      clock,
      0.62,
      0.2,
      1.12,
      0,
      0,
      0,
      this.tools.material('oscillator-can', '#7a8080', 0.42, 0.85),
    );
    this.tools.label(clock, 'CLK', 0, 0.113, 0, 0.48);
    for (const px of [-2.5, 0, 2.5]) {
      this.box(parent, 1.35, 0.16, 0.52, px, 0.48, -2.04, resin);
      for (let i = 0; i < 6; i++)
        for (const side of [-1, 1])
          this.box(parent, 0.07, 0.04, 0.17, px - 0.5 + i * 0.2, 0.414, -2.04 + side * 0.33, brass);
      this.tools.label(parent, px === 0 ? '8282 · LATCH' : px < 0 ? '8284 · RELOJ' : '8286 · BUS', px, 0.574, -2.04, 1.05);
    }
    const passives = new T.Group();
    passives.userData['part'] = 'passives';
    parts.set('passives', passives);
    parent.add(passives);
    const capMat = this.tools.material('capacitor-blue', '#304e65', 0.65, 0.1);
    for (const px of [-3.4, 3.4])
      for (const pz of [-0.35, 0.4, 1.12]) {
        this.cylinder(passives, 0.12, 0.31, px, 0.52, pz, capMat);
        this.cylinder(passives, 0.104, 0.012, px, 0.682, pz, brass);
        this.box(passives, 0.11, 0.007, 0.012, px, 0.692, pz, resin);
      }
    for (let i = 0; i < 12; i++) {
      const px = -1.65 + i * 0.3;
      this.box(
        parent,
        0.2,
        0.08,
        0.095,
        px,
        0.427,
        2.08,
        this.tools.material('resistor', '#9c896b', 0.92, 0),
      );
      this.box(parent, 0.03, 0.025, 0.11, px - 0.075, 0.444, 2.08, brass);
      this.box(parent, 0.03, 0.025, 0.11, px + 0.075, 0.444, 2.08, brass);
    }
    for (const px of [-3.35, 3.35])
      for (let i = 0; i < 9; i++) {
        this.box(parent, 0.19, 0.12, 0.13, px, 0.454, -2.08 + i * 0.21, resin);
        this.box(parent, 0.045, 0.21, 0.045, px, 0.61, -2.08 + i * 0.21, brass);
      }
  }
}
