import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export interface WorkshopTools {
  track<G extends T.Material | T.BufferGeometry | T.Texture>(resource: G): G;
  material(id: string, color: string, roughness: number, metalness: number): T.MeshStandardMaterial;
  label(parent: T.Object3D, text: string, x: number, y: number, z: number, width?: number): void;
}
import { PIN_NAMES } from './cpu-pins';
/** Presentation units, Y up. Every fitted assembly shares its mounting datum.
 * PCB top=.36, socket top=.64, ceramic top=.91, cap bottom=.93.
 * Pin bends enter plated holes; no pin top shares the PCB plane. */
export class ElectronicsWorkshop {
  constructor(private tools: WorkshopTools) {}
  private mesh(
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
  private box(
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
      new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.13),
      m,
      x,
      y,
      z,
    );
    mesh.userData['detail'] = w * h * d < 0.003 && Math.max(w, h, d) < 0.7;
    return mesh;
  }
  private cylinder(
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
  private wire(parent: T.Object3D, points: number[][], radius: number, m: T.Material): void {
    this.mesh(
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
  private ring(
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
  private screw(parent: T.Object3D, x: number, y: number, z: number): void {
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
  cpu(parent: T.Group, parts: Map<string, T.Object3D>): void {
    const pcb = this.tools.material('board-soldermask', '#244436', 0.8, 0.06);
    const brass = this.tools.material('pin-alloy', '#b0a179', 0.38, 0.88);
    const resin = this.tools.material('socket-resin', '#202325', 0.88, 0.01);
    const ceramic = this.tools.material('ceramic-alumina', '#b4ae98', 0.66, 0);
    const copper = this.tools.material('board-traces', '#8c7850', 0.55, 0.65);
    this.box(parent, 8.1, 0.22, 5.35, 0, 0.25, 0, pcb).name = 'pcb';
    const socket = new T.Group();
    socket.userData['part'] = 'socket';
    parts.set('socket', socket);
    parent.add(socket);
    this.box(socket, 6.7, 0.23, 2.85, 0, 0.52, 0, resin);
    for (const z of [-1.15, 1.15]) this.box(socket, 6.35, 0.07, 0.34, 0, 0.66, z, resin);
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
    for (let n = 0; n < 18; n++)
      this.wire(
        parent,
        [
          [-1.08 + n * 0.127, 0.785, -0.45],
          [-1.08 + n * 0.127, 0.85, -0.6],
          [-1.08 + n * 0.127, 0.855, -0.81],
        ],
        0.004,
        brass,
      );
    // Moulded shoulders and a thin sealing seam, each with its own surface.
    for (const pz of [-0.875, 0.875]) this.box(parent, 5.95, 0.018, 0.045, 0, 0.94, pz, brass);
    const cap = new T.Group();
    cap.position.set(0, 1.02, 0);
    cap.userData['part'] = 'lid';
    cap.userData['restY'] = 1.02;
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
    this.mesh(cap, geo, this.tools.material('cpu-lid', '#292d2c', 0.48, 0.5));
    this.tools.label(cap, 'INTEL   8086', 0, 0.102, -0.2, 3.7);
    this.tools.label(cap, '16-BIT HMOS   /   DIP-40', 0, 0.103, 0.27, 3.5);
    this.cylinder(cap, 0.055, 0.012, -2.64, 0.106, 0.58, brass).name = 'pin-one-marker';
    parent.add(cap);
    parts.set('lid', cap);
    // Continuous extruded bent lead profile; plated contact is at a distinct height.
    const lead = new T.Shape();
    [
      [0.92, 1.0],
      [1.15, 1.0],
      [1.48, 0.72],
      [1.48, 0.37],
      [1.42, 0.37],
      [1.42, 0.69],
      [1.11, 0.94],
      [0.92, 0.94],
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
    for (const side of [-1, 1])
      for (let n = 0; n < 20; n++) {
        const px = -2.66 + n * 0.28;
        const number = side === 1 ? n + 1 : 40 - n;
        const group = new T.Group();
        group.position.x = px;
        group.userData['part'] = 'pin-' + number;
        parent.add(group);
        const pin = new T.Mesh(leadGeo, brass);
        pin.scale.z = side;
        group.add(pin);
        pin.castShadow = true;
        this.ring(parent, 0.064, 0.016, px, 0.377, side * 1.45, brass);
        parts.set('pin-' + number, group);
        // Actual trace routing on the board, separate from all component face planes.
        const routeZ = side * (1.75 + (n % 4) * 0.13);
        this.wire(
          parent,
          [
            [px, 0.382, side * 1.49],
            [px, 0.382, routeZ],
            [px + (n < 10 ? -0.17 : 0.17), 0.382, routeZ + side * 0.14],
          ],
          0.007,
          copper,
        );
      }
    // Silkscreen datum and board fasteners.
    this.tools.label(parent, 'U1 / 8086', -2.7, 0.389, 1.86, 1.6);
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
      this.tools.label(parent, px === 0 ? 'LATCH' : 'LOGIC', px, 0.574, -2.04, 1.05);
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
  soc(parent: T.Group): void {
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
        for (let p = 0; p < 7; p++)
          for (const side of [-1, 1])
            this.box(parent, 0.13, 0.03, 0.07, x + side * 0.52, 0.393, z - 0.5 + p * 0.16, metal);
      }
    for (const x of [-3.55, 3.55])
      for (const z of [-2.85, 2.85]) {
        this.screw(parent, x, 0.391, z);
        this.cylinder(parent, 0.11, 0.28, x, 0, z, metal);
      }
    this.tools.label(parent, 'SoC / MEMORIA COMPARTIDA', 0, 0.382, -2.9, 4.5);
  }
  room(parent: T.Object3D, parts: Map<string, T.Object3D> = new Map()): void {
    const steel = this.tools.material('room-painted-steel', '#353c3e', 0.85, 0.2);
    const dark = this.tools.material('room-rubber', '#202a29', 0.98, 0);
    const aluminium = this.tools.material('instrument-aluminium', '#677476', 0.5, 0.7);
    // Full workbench, back wall and shelves give the scene a physical enclosure.
    this.box(
      parent,
      30,
      0.45,
      22,
      0,
      -0.52,
      0,
      this.tools.material('worktop', '#343737', 0.9, 0.01),
    );
    this.box(parent, 30, 9, 0.25, 0, 4, -9.5, steel);
    this.box(parent, 0.25, 9, 22, -14.8, 4, 0, steel);
    this.box(parent, 12, 0.12, 7.5, 0, -0.2, 0, dark);
    for (const z of [-8.9, -7.4]) this.box(parent, 27, 0.14, 0.2, 0, 2.8, z, aluminium);
    for (let i = 0; i < 13; i++)
      this.box(parent, 0.08, 5, 0.07, -12 + i * 2, 2.3, -9.32, aluminium);
    // Oscilloscope with recessed CRT bezel, front controls and ventilation slots.
    const scope = new T.Group();
    scope.position.set(-7, 0, -4.8);
    parent.add(scope);
    scope.userData['part'] = 'scope';
    parts.set('scope', scope);
    this.box(scope, 4.3, 2.5, 3.0, 0, 1.05, 0, steel);
    this.box(scope, 2.7, 1.83, 0.15, -0.47, 1.12, 1.56, dark);
    const screen = this.mesh(
      scope,
      new T.PlaneGeometry(2.35, 1.5),
      this.tools.track(new T.MeshBasicMaterial({ color: '#182e29' })),
      -0.47,
      1.12,
      1.65,
    );
    const grid = new T.BufferGeometry();
    const verts: number[] = [];
    for (let i = 0; i <= 8; i++) {
      const a = -1.57 + i * 0.275;
      verts.push(a, 0.46, 1.66, a, 1.8, 1.66);
    }
    for (let i = 0; i <= 5; i++) {
      const b = 0.46 + i * 0.268;
      verts.push(-1.57, b, 1.66, 0.63, b, 1.66);
    }
    const lines = new T.LineSegments(
      this.tools.track(grid.setAttribute('position', new T.Float32BufferAttribute(verts, 3))),
      this.tools.track(new T.LineBasicMaterial({ color: '#39564c' })),
    );
    scope.add(lines);
    const wave: number[] = [];
    for (let i = 0; i < 120; i++) {
      const a = -1.55 + (i / 119) * 2.15;
      wave.push(a, 1.11 + (i % 24 < 12 ? 0.34 : -0.34), 1.675);
    }
    const signal = new T.Line(
      this.tools.track(
        new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(wave, 3)),
      ),
      this.tools.track(new T.LineBasicMaterial({ color: '#c6d99b' })),
    );
    signal.name = 'scope-signal';
    scope.add(signal);
    for (let i = 0; i < 4; i++) {
      let knob = this.cylinder(scope, 0.19, 0.16, 1.48, 0.47 + i * 0.42, 1.64, dark);
      knob.rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 10; i++) this.box(scope, 0.2, 0.02, 1.8, -1.8 + i * 0.37, 2.315, 0, dark);
    const plate = this.mesh(
      scope,
      new T.PlaneGeometry(3.4, 0.2),
      this.tools.track(new T.MeshBasicMaterial({ color: '#80918a' })),
      0,
      -0.03,
      1.522,
    );
    plate.visible = false;
    // Bench supply and meter, ports, knobs and cables.
    const supply = new T.Group();
    supply.position.set(6.3, 0, -5.0);
    parent.add(supply);
    supply.userData['part'] = 'power';
    parts.set('power', supply);
    this.box(supply, 3.6, 2.8, 3.4, 0, 1.2, 0, steel);
    this.box(supply, 2.85, 2.12, 0.1, 0, 1.2, 1.76, aluminium);
    const display = this.tools.track(new T.MeshBasicMaterial({ color: '#9ead82' }));
    this.mesh(supply, new T.PlaneGeometry(1.65, 0.48), display, -0.35, 1.78, 1.821);
    const displayLabel = new T.Group();
    displayLabel.rotation.x = Math.PI / 2;
    displayLabel.position.set(-0.35, 1.78, 1.828);
    this.tools.label(displayLabel, '5.00 V / REF', 0, 0, 0, 1.55);
    supply.add(displayLabel);
    for (let v = 0; v < 11; v++)
      this.box(supply, 0.035, 1.25, 0.02, -1.4 + v * 0.25, 1.2, -1.71, dark);
    for (let n = 0; n < 3; n++) {
      const knob = this.cylinder(supply, 0.17, 0.15, 0.6, 1.02 - n * 0.35, 1.89, dark);
      knob.rotation.x = Math.PI / 2;
    }
    for (const x of [-0.85, -0.25]) {
      const port = this.cylinder(
        supply,
        0.13,
        0.12,
        x,
        0.46,
        1.9,
        this.tools.material(
          x < -0.5 ? 'port-red' : 'port-black',
          x < -0.5 ? '#7e3730' : '#252729',
          0.65,
          0.05,
        ),
      );
      port.rotation.x = Math.PI / 2;
    }
    const red = this.tools.material('cable-red', '#64362c', 0.88, 0.03);
    const cables = new T.Group();
    cables.userData['part'] = 'cable';
    parts.set('cable', cables);
    parent.add(cables);
    this.wire(
      cables,
      [
        [5.45, 0.46, -3.06],
        [5.7, 0.03, -1.8],
        [6.2, -0.19, 1.8],
        [4.5, -0.19, 3.7],
        [2.8, 0.1, 3.6],
      ],
      0.06,
      red,
    );
    this.wire(
      cables,
      [
        [-5.5, 0.2, -3.1],
        [-5.8, -0.15, -1.3],
        [-6.4, -0.18, 2.2],
        [-4.5, -0.18, 3.8],
        [-2.9, 0.1, 3.65],
      ],
      0.07,
      dark,
    );
    // Task-light articulated arm and luminous head.
    const lamp = new T.Group();
    lamp.userData['part'] = 'lamp';
    parts.set('lamp', lamp);
    parent.add(lamp);
    this.cylinder(lamp, 0.55, 0.12, -6.9, -0.2, -0.8, aluminium);
    this.wire(
      lamp,
      [
        [-6.9, -0.13, -0.8],
        [-6.9, 3.5, -0.8],
        [-3.8, 5, -1.8],
        [0, 4.5, -2.3],
      ],
      0.085,
      steel,
    );
    this.box(lamp, 3.3, 0.2, 0.75, 0, 4.55, -2.3, steel);
    this.box(
      lamp,
      2.9,
      0.018,
      0.5,
      0,
      4.439,
      -2.3,
      this.tools.track(
        new T.MeshStandardMaterial({
          color: '#ebdcc0',
          emissive: '#ebdcc0',
          emissiveIntensity: 1.1,
        }),
      ),
    );
    const probe = new T.Group();
    probe.position.set(-4.5, -0.08, 3.3);
    probe.rotation.y = 0.6;
    probe.userData['part'] = 'probe';
    parts.set('probe', probe);
    parent.add(probe);
    const probeBody = this.cylinder(probe, 0.1, 1.15, 0, 0, 0, dark);
    probeBody.rotation.x = Math.PI / 2;
    const probeTip = this.cylinder(probe, 0.025, 0.35, 0, 0, -0.74, aluminium);
    probeTip.rotation.x = Math.PI / 2;
    this.ring(probe, 0.13, 0.025, 0, 0, 0.3, red);
    // Probe tray and screwdrivers provide familiar scale and material contrast.
    this.box(parent, 1.25, 0.12, 3.7, 6.1, -0.22, 1.4, dark);
    for (let i = 0; i < 3; i++) {
      const tool = new T.Group();
      tool.position.set(5.78 + i * 0.31, -0.02, 1.02);
      tool.userData['part'] = i ? 'tool-' + i : 'tool';
      parts.set(tool.userData['part'], tool);
      parent.add(tool);
      this.box(
        tool,
        0.22,
        0.19,
        0.9,
        0,
        -0.05,
        0.78,
        this.tools.material('tool-handles', '#694130', 0.75, 0.04),
      );
      this.box(tool, 0.05, 0.05, 1.5, 0, 0, -0.4, aluminium);
      for (let k = 0; k < 5; k++)
        this.ring(
          tool,
          0.12,
          0.012,
          0,
          -0.05,
          0.45 + k * 0.15,
          this.tools.material('tool-grip', '#473326', 0.9, 0.01),
        );
    }
  }
}
