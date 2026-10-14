import * as T from 'three';
import { gsap } from 'gsap';
import { WorkshopGeometry } from './workshop-geometry';
import { BENCH } from './bench-layout';
import { seededRandom } from '../textures/noise';
import { LABEL_FAMILY } from '../textures/label-canvas';
import { drawMeterLcd, meterReading, METER_FUNCTIONS } from '../textures/instrument-screens';

/** Animations triggered when a bench object is picked. Keyed by piece id. */
export type Reactions = Map<string, () => void>;

const TOP = BENCH.top;

/** Everyday objects that make the bench feel used. Each one answers a click with an action. */
export class WorkbenchPropsModel extends WorkshopGeometry {
  build(parent: T.Object3D, parts: Map<string, T.Object3D>): Reactions {
    const reactions: Reactions = new Map();
    this.multimeter(parent, parts, reactions);
    this.solderingStation(parent, parts, reactions);
    this.solderSpool(parent, parts, reactions);
    this.notebook(parent, parts, reactions);
    this.mug(parent, parts, reactions);
    this.partsBin(parent, parts, reactions);
    this.chipTray(parent, parts);
    this.pegboardTools(parent, parts, reactions);
    return reactions;
  }

  private group(parent: T.Object3D, parts: Map<string, T.Object3D>, id: string, x: number, z: number): T.Group {
    const group = new T.Group();
    group.position.set(x, TOP, z);
    group.userData['part'] = id;
    parts.set(id, group);
    parent.add(group);
    return group;
  }

  private multimeter(parent: T.Object3D, parts: Map<string, T.Object3D>, reactions: Reactions): void {
    const meter = this.group(parent, parts, 'multimeter', BENCH.multimeter.x, BENCH.multimeter.z);
    meter.rotation.y = -0.22;
    this.box(
      meter,
      2.2,
      0.7,
      3.1,
      0,
      0.35,
      0,
      this.tools.material('multimeter-body', '#30353a', 0.55, 0.05, { finish: 'plastic', wear: 0.4, dirt: 0.45, size: 128 }),
    );
    this.box(
      meter,
      2.26,
      0.46,
      3.16,
      0,
      0.3,
      0,
      this.tools.material('multimeter-boot', '#d7b03c', 0.6, 0, { finish: 'rubber', wear: 0.5, dirt: 0.5, size: 128 }),
    );
    // The LCD sits on the top face (y = 0.7) with a small lift so the two never share a plane.
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const lcdTexture = this.tools.track(new T.CanvasTexture(canvas));
    lcdTexture.colorSpace = T.SRGBColorSpace;
    let mode = 0;
    let shown = '';
    let clock = 0;
    const refresh = () => {
      const reading = meterReading(mode, clock);
      if (!context || reading === shown) return;
      shown = reading;
      drawMeterLcd(context, canvas.width, canvas.height, mode, reading);
      lcdTexture.needsUpdate = true;
    };
    refresh();
    let next = 0;
    // The reading drifts like a live meter; it repaints only when the displayed text changes.
    this.tools.animate((t) => {
      clock = t;
      if (t < next) return;
      next = t + 0.25;
      refresh();
    }, 'room');
    const lcd = this.mesh(
      meter,
      new T.PlaneGeometry(1.7, 0.85),
      this.tools.track(new T.MeshBasicMaterial({ map: lcdTexture })),
      0,
      0.715,
      -0.35,
    );
    lcd.rotation.x = -Math.PI / 2;
    lcd.userData['dynamic'] = true;
    const dial = new T.Group();
    dial.position.set(0, 0.78, 0.85);
    meter.add(dial);
    this.cylinder(dial, 0.56, 0.16, 0, 0, 0, this.tools.material('multimeter-dial', '#1c1d1e', 0.7, 0.02, { finish: 'rubber', size: 64 }));
    this.box(dial, 0.07, 0.03, 0.42, 0, 0.1, -0.26, this.tools.material('dial-pointer', '#e8e0c8', 0.5, 0, { size: 64 }));
    reactions.set('multimeter', () => {
      mode = (mode + 1) % METER_FUNCTIONS.length;
      shown = '';
      refresh();
      gsap.to(dial.rotation, { y: dial.rotation.y - Math.PI / 2, duration: 0.45, ease: 'power2.out' });
    });
    const red = this.tools.material('lead-red', '#8a2d27', 0.5, 0, { finish: 'rubber', size: 64 });
    const black = this.tools.material('lead-black', '#17191a', 0.7, 0, { finish: 'rubber', size: 64 });
    // Leads leave the front face and lie on the worktop; their centres sit one radius above it.
    this.wire(meter, [[-0.4, 0.3, 1.6], [-0.8, 0.05, 2.8], [-2.2, 0.05, 3.4], [-3.4, 0.05, 3.6]], 0.05, red);
    this.wire(meter, [[0.4, 0.3, 1.6], [0.9, 0.05, 2.9], [2.1, 0.05, 3.5], [3.1, 0.05, 3.8]], 0.05, black);
  }

  private solderingStation(parent: T.Object3D, parts: Map<string, T.Object3D>, reactions: Reactions): void {
    const station = this.group(parent, parts, 'solder-station', BENCH.solderStation.x, BENCH.solderStation.z);
    station.rotation.y = 0.12;
    this.box(
      station,
      2.0,
      0.55,
      1.5,
      0,
      0.275,
      0,
      this.tools.material('station-housing', '#2b2f31', 0.5, 0.35, { finish: 'paint', exposed: '#6d7071', wear: 0.35, dirt: 0.4, size: 128 }),
    );
    // Readout: "350 °C" painted on a canvas that also feeds the emissive channel, so it glows when heating.
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#0f1a14';
      context.fillRect(0, 0, 256, 128);
      context.fillStyle = '#b8f5cc';
      context.font = `600 74px ${LABEL_FAMILY}`;
      context.textAlign = 'center';
      context.fillText('350 °C', 128, 92);
    }
    const readout = this.tools.track(new T.CanvasTexture(canvas));
    readout.colorSpace = T.SRGBColorSpace;
    const display = this.tools.track(
      new T.MeshStandardMaterial({
        color: '#213224',
        map: readout,
        emissive: '#7fe0a0',
        emissiveMap: readout,
        emissiveIntensity: 0.9,
      }),
    );
    const screen = this.mesh(station, new T.PlaneGeometry(0.7, 0.28), display, -0.42, 0.575, 0.45);
    screen.rotation.x = -Math.PI / 2;
    screen.userData['dynamic'] = true;
    this.cylinder(station, 0.2, 0.16, 0.7, 0.63, -0.35, this.tools.material('station-knob', '#b7b2a0', 0.4, 0.5, { finish: 'steel', size: 64 }));
    // Amber standby LED on the front face: it breathes while the iron is idle.
    const led = this.tools.track(
      new T.MeshStandardMaterial({ color: '#ffb36b', emissive: '#ff8a2a', emissiveIntensity: 0.6 }),
    );
    const ledLamp = this.mesh(station, new T.SphereGeometry(0.035, 10, 8), led, 0.78, 0.36, 0.765);
    ledLamp.userData['dynamic'] = true;
    this.tools.animate((t) => {
      led.emissiveIntensity = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.4));
    }, 'room');
    // Holder and iron: the sleeve glows while the reaction runs.
    this.box(station, 0.26, 0.9, 0.26, -0.6, 1.0, -0.5, this.tools.material('iron-holder', '#3b3f42', 0.6, 0.4, { finish: 'steel', size: 64 }));
    const iron = new T.Group();
    iron.position.set(-0.6, 1.62, -0.5);
    iron.rotation.y = 0.25;
    station.add(iron);
    const along = (object: T.Object3D, x: number) => {
      object.rotation.z = Math.PI / 2;
      object.position.x = x;
    };
    along(this.cylinder(iron, 0.16, 1.2, 0, 0, 0, this.tools.material('iron-handle', '#2d2a26', 0.8, 0, { finish: 'rubber', wear: 0.3, size: 64 })), 0);
    const sleeveMaterial = this.tools.track(
      new T.MeshStandardMaterial({ color: '#8c8c86', metalness: 0.85, roughness: 0.4, emissive: '#ff7a2f', emissiveIntensity: 0 }),
    );
    along(this.cylinder(iron, 0.09, 0.5, 0, 0, 0, sleeveMaterial), 0.85);
    along(this.cylinder(iron, 0.025, 0.7, 0, 0, 0, this.tools.material('iron-tip', '#b8b5ab', 0.3, 0.9, { finish: 'steel', size: 64 })), 1.35);
    this.box(station, 0.6, 0.12, 0.42, 0.55, 0.61, 0.45, this.tools.material('sponge', '#3a4a33', 0.95, 0, { finish: 'rubber', wear: 0.3, dirt: 0.6, size: 64 }));
    reactions.set('solder-station', () => {
      gsap
        .timeline()
        .to(sleeveMaterial, { emissiveIntensity: 1.6, duration: 0.5, ease: 'power2.out' })
        .to(display, { emissiveIntensity: 1.4, duration: 0.2, yoyo: true, repeat: 3 }, 0)
        .to(sleeveMaterial, { emissiveIntensity: 0, duration: 1.2, ease: 'power1.in' }, 0.8);
    });
  }

  private solderSpool(parent: T.Object3D, parts: Map<string, T.Object3D>, reactions: Reactions): void {
    const spool = this.group(parent, parts, 'solder-spool', BENCH.solderSpool.x, BENCH.solderSpool.z);
    // The roll stands on a flange with its axis along X; the spinner turns it about that axis.
    const roll = new T.Group();
    // The roll rests on the worktop: its flanges have radius 0.92, so the centre sits 0.92 above it.
    roll.position.set(0, 0.92, 0);
    roll.rotation.z = Math.PI / 2;
    spool.add(roll);
    const spinner = new T.Group();
    roll.add(spinner);
    const flange = this.tools.material('spool-flange', '#2c5c8a', 0.5, 0, { finish: 'plastic', wear: 0.4, dirt: 0.45, size: 128 });
    this.cylinder(spinner, 0.92, 0.06, 0, 0.25, 0, flange);
    this.cylinder(spinner, 0.92, 0.06, 0, -0.25, 0, flange);
    this.cylinder(
      spinner,
      0.66,
      0.5,
      0,
      0,
      0,
      this.tools.material('solder-wire', '#9ea3a6', 0.32, 0.9, { finish: 'steel', wear: 0.5, scratches: 10, size: 128 }),
    );
    this.cylinder(spinner, 0.12, 0.6, 0, 0, 0, this.tools.material('spool-hub', '#1b1d1f', 0.6, 0.1, { size: 64 }));
    reactions.set('solder-spool', () => {
      gsap.to(spinner.rotation, { y: spinner.rotation.y + Math.PI * 2, duration: 0.9, ease: 'power2.inOut' });
    });
    // The tail leaves the flange's rim and lies on the worktop, one wire radius above it.
    this.wire(
      spool,
      [
        [0, 0.57, 0.92],
        [0.5, 0.035, 1.1],
        [1.2, 0.035, 0.95],
        [2.0, 0.035, 0.6],
      ],
      0.035,
      this.tools.material('solder-tail', '#a7acaf', 0.3, 0.9, { finish: 'steel', size: 64 }),
    );
  }

  private notebook(parent: T.Object3D, parts: Map<string, T.Object3D>, reactions: Reactions): void {
    const book = this.group(parent, parts, 'notebook', BENCH.notebook.x, BENCH.notebook.z);
    book.rotation.y = 0.08;
    this.box(book, 3.0, 0.12, 2.3, 0, 0.06, 0, this.tools.material('notebook-cover', '#6e2f2b', 0.55, 0, { finish: 'plastic', wear: 0.5, dirt: 0.45, size: 128 }));
    this.box(book, 2.84, 0.1, 2.16, 0, 0.16, 0, this.tools.material('notebook-pages', '#e2dcc8', 0.7, 0, { finish: 'plastic', wear: 0.2, dirt: 0.6, size: 128 }));
    this.tools.label(book, 'MEDIDAS · 8086', 0, 0.22, -0.55, 1.6);
    const pen = this.cylinder(book, 0.05, 2.3, 0.2, 0.27, 0.9, this.tools.material('pen-blue', '#213f66', 0.4, 0.2, { finish: 'plastic', wear: 0.3, size: 64 }));
    pen.rotation.set(0, 0.35, Math.PI / 2, 'YXZ');
    reactions.set('notebook', () => {
      gsap
        .timeline()
        .to(book.rotation, { x: 0.05, duration: 0.14, ease: 'power1.out' })
        .to(book.rotation, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
    });
  }

  private mug(parent: T.Object3D, parts: Map<string, T.Object3D>, reactions: Reactions): void {
    const mug = this.group(parent, parts, 'mug', BENCH.mug.x, BENCH.mug.z);
    // Coffee ring left on the worktop, lifted a hair so it never shares the top face.
    const ring = new T.Mesh(
      this.tools.track(new T.RingGeometry(0.58, 0.7, 40)),
      this.tools.track(new T.MeshBasicMaterial({ color: '#2a170b', transparent: true, opacity: 0.32, depthWrite: false })),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    mug.add(ring);
    const body = new T.Group();
    mug.add(body);
    const ceramic = this.tools.material('mug-ceramic', '#e4dccb', 0.32, 0.02, {
      finish: 'ceramic',
      exposed: '#c9b8a0',
      grime: '#6e5a3c',
      dirt: 0.7,
      wear: 0.2,
      size: 128,
    });
    // An open wall with a base disc and a rim: the coffee is visible through the mouth.
    this.mesh(body, new T.CylinderGeometry(0.56, 0.56, 1.0, 36, 1, true), ceramic, 0, 0.5, 0);
    this.cylinder(body, 0.56, 0.04, 0, 0.02, 0, ceramic);
    const rim = this.mesh(body, new T.TorusGeometry(0.56, 0.03, 8, 40), ceramic, 0, 1.0, 0);
    rim.rotation.x = Math.PI / 2;
    this.cylinder(body, 0.5, 0.02, 0, 0.84, 0, this.tools.material('coffee', '#2a1a10', 0.2, 0));
    // Handle lies in the vertical plane beside the body.
    this.mesh(body, new T.TorusGeometry(0.3, 0.08, 8, 20), ceramic, 0.66, 0.5, 0);
    reactions.set('mug', () => {
      gsap
        .timeline()
        .to(body.rotation, { z: -0.12, duration: 0.25, ease: 'power2.out' })
        .to(body.rotation, { z: 0, duration: 0.6, ease: 'elastic.out(1, 0.6)' });
    });
  }

  private partsBin(parent: T.Object3D, parts: Map<string, T.Object3D>, reactions: Reactions): void {
    const bin = this.group(parent, parts, 'parts', BENCH.partsBin.x, BENCH.partsBin.z);
    const plastic = this.tools.material('parts-bin', '#434b4f', 0.5, 0.02, { finish: 'plastic', wear: 0.35, dirt: 0.5, size: 128 });
    const drawer = new T.Group();
    bin.add(drawer);
    // A solid drawer with a 4 x 3 grid of walls on its lid; the parts lie inside the cells.
    this.box(drawer, 3.2, 0.75, 2.6, 0, 0.375, 0, plastic);
    for (let i = 1; i < 4; i++) this.box(drawer, 0.08, 0.16, 2.5, -1.6 + i * 0.8, 0.83, 0, plastic);
    for (let j = 1; j < 3; j++) this.box(drawer, 3.1, 0.16, 0.08, 0, 0.83, -1.3 + j * 0.87, plastic);
    const face = new T.Group();
    face.position.set(0, 0.42, 1.31);
    face.rotation.x = Math.PI / 2;
    this.tools.label(face, 'R · C · REPUESTO', 0, 0, 0, 2.2);
    drawer.add(face);
    const random = seededRandom(7);
    const resistors = new T.InstancedMesh(
      this.tools.track(new T.CapsuleGeometry(0.06, 0.2, 3, 8)),
      this.tools.material('resistor-body', '#c9b58a', 0.5, 0, { finish: 'plastic', wear: 0.2, size: 64 }),
      24,
    );
    const capacitors = new T.InstancedMesh(
      this.tools.track(new T.CylinderGeometry(0.1, 0.1, 0.22, 10)),
      this.tools.material('capacitor-blue', '#2d4f8a', 0.4, 0.05, { finish: 'plastic', wear: 0.25, size: 64 }),
      12,
    );
    const matrix = new T.Matrix4(),
      quaternion = new T.Quaternion(),
      position = new T.Vector3(),
      scale = new T.Vector3(1, 1, 1);
    const up = new T.Vector3(0, 1, 0),
      lying = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);
    // Resistors lie on the lid of their cell: the capsule radius is the height above it.
    for (let i = 0; i < 24; i++) {
      const cell = i % 12;
      position.set(
        -1.2 + (cell % 4) * 0.8 + (random() - 0.5) * 0.2,
        0.81,
        -0.85 + Math.floor(cell / 4) * 0.87 + (random() - 0.5) * 0.2,
      );
      quaternion.setFromAxisAngle(up, random() * Math.PI).multiply(lying);
      matrix.compose(position, quaternion, scale);
      resistors.setMatrixAt(i, matrix);
    }
    // Capacitors lie on their side; the cylinder radius is the height above the lid.
    const onSide = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), Math.PI / 2);
    for (let i = 0; i < 12; i++) {
      position.set(-1.2 + (i % 4) * 0.8, 0.85, -0.85 + Math.floor(i / 4) * 0.87);
      matrix.compose(position, onSide, scale);
      capacitors.setMatrixAt(i, matrix);
    }
    drawer.add(resistors, capacitors);
    reactions.set('parts', () => {
      gsap
        .timeline()
        .to(drawer.position, { z: 0.35, duration: 0.3, ease: 'power2.out' })
        .to(drawer.position, { z: 0, duration: 0.5, ease: 'power2.inOut' });
    });
  }

  private chipTray(parent: T.Object3D, parts: Map<string, T.Object3D>): void {
    const tray = this.group(parent, parts, 'chips', BENCH.chipTray.x, BENCH.chipTray.z);
    this.box(tray, 3.4, 0.36, 2.4, 0, 0.18, 0, this.tools.material('chip-foam', '#1a1d1f', 0.95, 0, { finish: 'rubber', wear: 0.3, dirt: 0.5, size: 64 }));
    const dip = this.tools.material('dip-resin', '#202325', 0.6, 0.05, { finish: 'plastic', wear: 0.25, dirt: 0.3, size: 64 });
    const pinMatrices: T.Matrix4[] = [];
    for (let chip = 0; chip < 4; chip++) {
      const cx = -1.1 + (chip % 2) * 2.2,
        cz = -0.5 + Math.floor(chip / 2) * 1.0;
      // One unit long: the two chips in a column meet at their ends and never share a top plane.
      this.box(tray, 0.6, 0.2, 1.0, cx, 0.46, cz, dip);
      // Pins are pushed into the foam: their lower half is buried in it, as in a real tray.
      for (let p = 0; p < 8; p++)
        for (const side of [-1, 1])
          pinMatrices.push(new T.Matrix4().makeTranslation(cx + side * 0.36, 0.34, cz - 0.4 + p * 0.114));
    }
    const pins = new T.InstancedMesh(
      this.tools.track(new T.BoxGeometry(0.06, 0.2, 0.06)),
      this.tools.material('dip-pins', '#9da2a6', 0.35, 0.9, { finish: 'steel', size: 64 }),
      pinMatrices.length,
    );
    pinMatrices.forEach((m, i) => pins.setMatrixAt(i, m));
    pins.castShadow = true;
    tray.add(pins);
    this.tools.label(tray, 'DIP-40 · ESD', 0, 0.38, 1.05, 1.8);
  }

  private pegboardTools(parent: T.Object3D, parts: Map<string, T.Object3D>, reactions: Reactions): void {
    const rack = new T.Group();
    // Hung high enough that the shafts clear the bin tops on the shelf below.
    rack.position.set(-9.6, 5.2, BENCH.backZ + 0.45);
    rack.userData['part'] = 'pegboard-tools';
    parts.set('pegboard-tools', rack);
    parent.add(rack);
    ['#694130', '#2e5b6b', '#6b3a3a'].forEach((color, i) => {
      const hang = new T.Group();
      hang.position.set(i * 0.9, 0, 0);
      rack.add(hang);
      this.cylinder(hang, 0.18, 1.1, 0, 1.4, 0, this.tools.material('pegboard-grip-' + i, color, 0.7, 0.02, { finish: 'plastic', wear: 0.45, dirt: 0.4, size: 64 }));
      this.cylinder(hang, 0.05, 1.8, 0, 0.1, 0, this.tools.material('pegboard-shaft', '#a5a9ab', 0.35, 0.9, { finish: 'steel', wear: 0.4, size: 64 }));
    });
    reactions.set('pegboard-tools', () => {
      gsap
        .timeline()
        .to(rack.rotation, { z: 0.06, duration: 0.2, ease: 'power2.out' })
        .to(rack.rotation, { z: -0.04, duration: 0.25, ease: 'sine.inOut' })
        .to(rack.rotation, { z: 0, duration: 0.35, ease: 'sine.out' });
    });
  }
}
