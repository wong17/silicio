import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';
export class WorkbenchRoomModel extends WorkshopGeometry {
  build(parent: T.Object3D, parts: Map<string, T.Object3D> = new Map()): void {
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
