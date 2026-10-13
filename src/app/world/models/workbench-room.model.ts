import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';
import { BENCH } from './bench-layout';
import { WorkbenchPropsModel, type Reactions } from './workbench-props.model';
import { drawScopeScreen, drawSupplyFace, drawSupplyReadout, type ScopeStrobe } from '../textures/instrument-screens';
import { WallBlueprintsModel } from './wall-blueprints.model';
import { LabRoomModel } from './lab-room.model';
import { LabEquipmentModel } from './lab-equipment.model';
import { LabLibraryModel } from './lab-library.model';

/**
 * Enclosure, instruments and wiring of the inspection bench. Props and the lamp are separate models.
 * Every object sits on the surface it touches: the worktop, the mat, the tray or another instrument.
 */
export class WorkbenchRoomModel extends WorkshopGeometry {
  build(parent: T.Object3D, parts: Map<string, T.Object3D> = new Map()): Reactions {
    // The room comes first: walls, floor and the base cabinet that carries the worktop.
    new LabRoomModel(this.tools).build(parent);
    new LabEquipmentModel(this.tools).build(parent);
    new LabLibraryModel(this.tools).build(parent);
    const steel = this.tools.material('room-painted-steel', '#4a5254', 0.6, 0.3, {
      finish: 'paint',
      exposed: '#7d807b',
      grime: '#3a3831',
      dirt: 0.4,
      wear: 0.15,
      scratches: 6,
      size: 128,
    });
    const aluminium = this.tools.material('instrument-aluminium', '#7d888a', 0.42, 0.85, {
      finish: 'steel',
      size: 128,
    });
    const dark = this.tools.material('room-rubber', '#252c2e', 0.95, 0);
    // Worktop: laminate with scuffs where tools and cables slid over the surface. Its top is BENCH.top.
    this.box(
      parent,
      30,
      0.45,
      22,
      0,
      BENCH.top - 0.225,
      0,
      this.tools.material('worktop', '#3d4447', 0.78, 0.02, {
        finish: 'paint',
        exposed: '#7c786c',
        grime: '#4b463b',
        dirt: 0.5,
        wear: 0.3,
        scratches: 24,
        size: 256,
        repeat: [3, 2],
      }),
    );
    // Back wall: perforated panel with rails and a shelf of labelled bins.
    const pegboard = this.tools.material('pegboard-panel', '#5d6a6a', 0.7, 0.05, {
      finish: 'pegboard',
      exposed: '#9a9d9a',
      grime: '#2d2b26',
      dirt: 0.45,
      wear: 0.2,
      scratches: 4,
      size: 256,
      repeat: [3, 1.2],
    });
    // A hair narrower than the worktop, so its ends never share a plane with the worktop's ends.
    this.box(parent, 29.9, 9, 0.25, 0, 4, BENCH.backZ, pegboard);
    this.shelf(parent, aluminium);
    new WallBlueprintsModel(this.tools).build(parent);
    // Anti-static mat under the boards: 6 cm thick, resting on the worktop.
    const mat = this.box(
      parent,
      BENCH.mat.width,
      0.06,
      BENCH.mat.depth,
      BENCH.mat.x,
      BENCH.matTop - 0.03,
      BENCH.mat.z,
      this.tools.material('esd-mat', '#23453c', 0.9, 0, {
        finish: 'mat',
        exposed: '#3a5d52',
        grime: '#2a2822',
        dirt: 0.4,
        wear: 0.22,
        scratches: 0,
        bump: 0.7,
        size: 256,
        repeat: [2, 1.2],
      }),
    );
    mat.userData['part'] = 'esd-mat';
    parts.set('esd-mat', mat);
    this.oscilloscope(parent, parts, steel, dark);
    this.powerSupply(parent, parts, steel, aluminium, dark);
    this.cables(parent);
    this.probe(parent, parts, dark, aluminium);
    this.toolTray(parent, parts, dark, aluminium);
    return new WorkbenchPropsModel(this.tools).build(parent, parts);
  }

  private shelf(parent: T.Object3D, aluminium: T.Material): void {
    const colours = ['#2f4a57', '#5b4e2f', '#3a5a3d', '#6b3b32', '#3d3f52', '#56534b', '#44505a'];
    const names = ['10 kΩ', '100 nF', '1N4148', 'DIP-40', 'SOIC', 'ESD', 'XTAL'];
    // The shelf is fixed to the pegboard, whose front face lies a quarter unit in front of its centre.
    const shelfZ = BENCH.backZ + 1.08;
    this.box(parent, 27, 0.16, 1.9, 0, 3.2, shelfZ, aluminium);
    for (let i = 0; i < names.length; i++) {
      const x = -9.6 + i * 1.6;
      const bin = new T.Group();
      bin.position.set(x, 3.28, shelfZ);
      parent.add(bin);
      this.box(
        bin,
        1.25,
        0.8,
        1.45,
        0,
        0.4,
        0,
        this.tools.material('bin-' + i, colours[i], 0.55, 0.02, {
          finish: 'plastic',
          wear: 0.3,
          dirt: 0.5,
          size: 64,
        }),
      );
      this.tools.label(bin, names[i], 0, 0.82, 0, 1.0);
    }
  }

  private oscilloscope(
    parent: T.Object3D,
    parts: Map<string, T.Object3D>,
    steel: T.Material,
    dark: T.Material,
  ): void {
    // Oscilloscope on the worktop: CRT bezel, a live screen, front knobs and ventilation slots.
    const scope = new T.Group();
    scope.position.set(BENCH.scope.x, BENCH.top, BENCH.scope.z);
    parent.add(scope);
    scope.userData['part'] = 'scope';
    parts.set('scope', scope);
    // Inner group lifts the housing so its base is the worktop (its origin sits 0.2 units above it).
    const body = new T.Group();
    body.position.y = 0.2;
    scope.add(body);
    this.box(body, 4.3, 2.5, 3.0, 0, 1.05, 0, steel);
    this.box(body, 2.7, 1.83, 0.15, -0.47, 1.12, 1.5, dark);
    // The screen is painted on a canvas; the trace keeps moving while the page runs.
    const canvas = document.createElement('canvas');
    canvas.width = 470;
    canvas.height = 300;
    const context = canvas.getContext('2d');
    const texture = this.tools.track(new T.CanvasTexture(canvas));
    texture.colorSpace = T.SRGBColorSpace;
    const screen = this.mesh(
      body,
      new T.PlaneGeometry(2.35, 1.5),
      this.tools.track(new T.MeshBasicMaterial({ map: texture })),
      -0.47,
      1.12,
      1.66,
    );
    screen.userData['dynamic'] = true;
    let painted = -1;
    // The bus strobe is drawn inside the animated screen, so no static overlay sits on the trace.
    if (context)
      this.tools.animate((t) => {
        // Twenty repaints a second are enough for a trace; the canvas is small.
        if (t - painted < 0.05) return;
        painted = t;
        drawScopeScreen(context, canvas.width, canvas.height, t, scope.userData['strobe'] as ScopeStrobe | undefined);
        texture.needsUpdate = true;
      }, 'room');
    // Knobs stand on the front face, to the right of the screen so none of them cuts into it.
    for (let i = 0; i < 4; i++) {
      const knob = this.cylinder(body, 0.19, 0.16, 0.95 + i * 0.3, 1.64, 1.58, dark);
      knob.rotation.x = Math.PI / 2;
    }
    // The housing top is at y = 2.3 in body coordinates; vents and the label rest on it.
    for (let i = 0; i < 10; i++) this.box(body, 0.2, 0.02, 1.8, -1.8 + i * 0.37, 2.315, 0, dark);
    this.tools.label(body, 'OSCILOSCOPIO · CAPTURA', 0.5, 2.36, 0.9, 1.6);
  }

  private powerSupply(
    parent: T.Object3D,
    parts: Map<string, T.Object3D>,
    steel: T.Material,
    aluminium: T.Material,
    dark: T.Material,
  ): void {
    // Bench supply and meter, ports, knobs and a pilot lamp that breathes while the bench runs.
    const supply = new T.Group();
    supply.position.set(BENCH.supply.x, BENCH.top, BENCH.supply.z);
    parent.add(supply);
    supply.userData['part'] = 'power';
    parts.set('power', supply);
    const body = new T.Group();
    body.position.y = 0.2;
    supply.add(body);
    this.box(body, 3.6, 2.8, 3.4, 0, 1.2, 0, steel);
    this.box(body, 2.85, 2.12, 0.1, 0, 1.2, 1.76, aluminium);
    // Readout: voltage and current drift like a regulated supply under a light load. It repaints only when a digit changes.
    const readoutCanvas = document.createElement('canvas');
    readoutCanvas.width = 512;
    readoutCanvas.height = 150;
    const readoutContext = readoutCanvas.getContext('2d');
    const readoutTexture = this.tools.track(new T.CanvasTexture(readoutCanvas));
    readoutTexture.colorSpace = T.SRGBColorSpace;
    this.mesh(
      body,
      new T.PlaneGeometry(1.65, 0.48),
      this.tools.track(new T.MeshBasicMaterial({ map: readoutTexture })),
      -0.35,
      1.78,
      1.822,
    ).castShadow = false;
    let shown = '';
    const paint = (t: number) => {
      const volts = (5 + 0.012 * Math.sin(t * 1.7)).toFixed(2),
        amps = (0.42 + 0.02 * Math.sin(t * 0.6) + 0.006 * Math.sin(t * 2.3)).toFixed(2);
      if (!readoutContext || volts + amps === shown) return;
      shown = volts + amps;
      drawSupplyReadout(readoutContext, readoutCanvas.width, readoutCanvas.height, volts, amps);
      readoutTexture.needsUpdate = true;
    };
    paint(0);
    // Lettering waits for the monospace face; the repaint also covers reduced motion, where time stays at zero.
    void document.fonts?.ready.then(() => {
      shown = '';
      paint(0);
    });
    let next = 0;
    this.tools.animate((t) => {
      if (t < next) return;
      next = t + 0.3;
      paint(t);
    }, 'room');
    // Front face: silkscreen for the knob scales, the port marks and the title, printed over the aluminium plate.
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 570;
    faceCanvas.height = 424;
    const faceContext = faceCanvas.getContext('2d');
    const faceTexture = this.tools.track(new T.CanvasTexture(faceCanvas));
    faceTexture.colorSpace = T.SRGBColorSpace;
    const paintFace = () => {
      if (!faceContext) return;
      drawSupplyFace(faceContext, faceCanvas.width, faceCanvas.height);
      faceTexture.needsUpdate = true;
    };
    paintFace();
    void document.fonts?.ready.then(paintFace);
    this.mesh(
      body,
      new T.PlaneGeometry(2.85, 2.12),
      this.tools.track(new T.MeshBasicMaterial({ map: faceTexture, transparent: true, depthWrite: false })),
      0,
      1.2,
      1.8165,
    ).castShadow = false;
    for (let v = 0; v < 11; v++)
      this.box(body, 0.035, 1.25, 0.02, -1.4 + v * 0.25, 1.2, -1.71, dark);
    for (let n = 0; n < 3; n++) {
      const knob = this.cylinder(body, 0.17, 0.15, 0.6, 1.02 - n * 0.35, 1.89, dark);
      knob.rotation.x = Math.PI / 2;
    }
    const pilotMaterial = this.tools.track(
      new T.MeshStandardMaterial({ color: '#7bd38f', emissive: '#4fbf6e', emissiveIntensity: 1.8 }),
    );
    const pilot = this.mesh(body, new T.SphereGeometry(0.07, 12, 8), pilotMaterial, 1.22, 2.05, 1.84);
    pilot.userData['dynamic'] = true;
    this.tools.animate((t) => {
      // A slow standby breath: the lamp is alive but not urgent.
      pilotMaterial.emissiveIntensity = 0.7 + 1.1 * (0.5 + 0.5 * Math.sin(t * 1.9));
    }, 'room');
    for (const x of [-0.85, -0.25]) {
      const port = this.cylinder(
        body,
        0.13,
        0.12,
        x,
        0.46,
        1.87,
        this.tools.material(x < -0.5 ? 'port-red' : 'port-black', x < -0.5 ? '#7e3730' : '#252729', 0.65, 0.05, {
          finish: 'plastic',
          wear: 0.2,
          size: 64,
        }),
      );
      port.rotation.x = Math.PI / 2;
    }
  }

  private cables(parent: T.Object3D): void {
    const red = this.tools.material('cable-red', '#64362c', 0.88, 0.03, {
      finish: 'rubber',
      wear: 0.2,
      dirt: 0.5,
      size: 64,
    });
    const dark = this.tools.material('cable-black', '#1d2021', 0.9, 0.02, {
      finish: 'rubber',
      wear: 0.25,
      dirt: 0.55,
      size: 64,
    });
    const cables = new T.Group();
    cables.userData['part'] = 'cable';
    parent.add(cables);
    // Leads lie on the mat (its top is BENCH.matTop; the radius is the height above it). They keep
    // clear of the tray, the probe and the stations.
    const lying = BENCH.matTop + 0.06;
    this.wire(
      cables,
      [
        [4.9, lying, -2.75],
        [4.4, lying, -1.4],
        [4.2, lying, 1.0],
        [3.5, lying, 3.4],
        [2.2, lying, 3.8],
      ],
      0.06,
      red,
    );
    this.wire(
      cables,
      [
        [-4.5, lying, -4.5],
        [-3.9, lying, -3.4],
        [-3.4, lying, -1.2],
        [-3.6, lying, 1.2],
        [-3.2, lying, 3.0],
      ],
      0.07,
      dark,
    );
  }

  private probe(
    parent: T.Object3D,
    parts: Map<string, T.Object3D>,
    dark: T.Material,
    aluminium: T.Material,
  ): void {
    const red = this.tools.material('probe-red', '#7a2f2a', 0.6, 0.02, { finish: 'plastic', size: 64 });
    const probe = new T.Group();
    // The probe lies on the mat, so its axis is one body radius above the mat top.
    probe.position.set(BENCH.probe.x, BENCH.matTop + 0.1, BENCH.probe.z);
    probe.rotation.y = 0.6;
    probe.userData['part'] = 'probe';
    parts.set('probe', probe);
    parent.add(probe);
    const probeBody = this.cylinder(probe, 0.1, 1.15, 0, 0, 0, dark);
    probeBody.rotation.x = Math.PI / 2;
    const probeTip = this.cylinder(probe, 0.025, 0.35, 0, 0, -0.74, aluminium);
    probeTip.rotation.x = Math.PI / 2;
    this.ring(probe, 0.13, 0.025, 0, 0, 0.3, red);
  }

  private toolTray(
    parent: T.Object3D,
    parts: Map<string, T.Object3D>,
    dark: T.Material,
    aluminium: T.Material,
  ): void {
    // Tray on the mat; its top is BENCH.matTop + 0.12. Tools lie on that top with their origin on it.
    const trayTop = BENCH.matTop + 0.12;
    this.box(parent, 1.25, 0.12, 3.7, BENCH.tray.x, BENCH.matTop + 0.06, BENCH.tray.z, dark);
    const handles = this.tools.material('tool-handles', '#694130', 0.75, 0.04, {
      finish: 'plastic',
      wear: 0.45,
      dirt: 0.4,
      size: 64,
    });
    const grip = this.tools.material('tool-grip', '#473326', 0.9, 0.01, {
      finish: 'rubber',
      wear: 0.3,
      dirt: 0.5,
      size: 64,
    });
    for (let i = 0; i < 3; i++) {
      const tool = new T.Group();
      tool.position.set(5.78 + i * 0.31, trayTop, 1.02);
      tool.userData['part'] = i ? 'tool-' + i : 'tool';
      parts.set(tool.userData['part'], tool);
      parent.add(tool);
      // Handle and shaft both touch the tray: the handle's base is y = 0, the shaft's is y = 0.
      this.box(tool, 0.22, 0.19, 0.9, 0, 0.095, 0.78, handles);
      this.box(tool, 0.05, 0.05, 1.5, 0, 0.025, -0.4, aluminium);
      // Grip rings wrap the handle around its own axis (the Z axis), so no rotation is applied.
      for (let k = 0; k < 5; k++)
        this.mesh(tool, new T.TorusGeometry(0.112, 0.012, 6, 16), grip, 0, 0.108, 0.45 + k * 0.15);
    }
  }
}
