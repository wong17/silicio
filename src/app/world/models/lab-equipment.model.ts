import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';
import { BENCH } from './bench-layout';
import { paintBlueprint, SHEET_HEIGHT, SHEET_WIDTH } from '../textures/blueprint-sheets';
import { LABEL_FAMILY } from '../textures/label-canvas';
import { seededRandom } from '../textures/noise';

const FLOOR = BENCH.floor;

/**
 * Equipment that turns the room into a CPU design lab: towers and a CRT lying around, a board stack, a
 * tray of packaged processors, a wafer case on the shelf, anti-static bags and blueprints on the floor.
 * Decoration only. Everything stands on the floor, clear of the bench, the stool, the bin and the trolley.
 */
export class LabEquipmentModel extends WorkshopGeometry {
  build(scene: T.Object3D): void {
    // Its own group, outside the shadow pass: the lamp only needs to light the bench.
    const parent = new T.Group();
    scene.add(parent);
    this.towers(parent);
    this.monitor(parent);
    this.boardStack(parent);
    this.cardboard(parent);
    this.waferCase(parent);
    this.cpuTray(parent);
    this.bags(parent);
    this.floorSheets(parent);
    parent.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = false;
    });
  }

  /** Two towers: one upright, one lying on its side. Both have a drive bay, a power button and a lit LED. */
  private towers(parent: T.Object3D): void {
    const beige = this.tools.material('pc-case', '#9e9a86', 0.6, 0.1, { finish: 'plastic', wear: 0.4, dirt: 0.5, size: 128 });
    const bezel = this.tools.material('pc-bezel', '#6d6b62', 0.55, 0.1, { finish: 'plastic', wear: 0.35, dirt: 0.4, size: 128 });
    const bay = this.tools.material('pc-bay', '#26282a', 0.7, 0.05, { finish: 'plastic', size: 64 });
    const button = this.tools.material('pc-button', '#8c8a80', 0.4, 0.4, { finish: 'steel', size: 64 });
    const led = this.tools.track(
      new T.MeshStandardMaterial({ color: '#2e7d4f', emissive: '#2fbf6a', emissiveIntensity: 0.6 }),
    );
    const tower = (group: T.Group) => {
      this.box(group, 3.6, 7.6, 6.2, 0, 3.8, 0, beige);
      this.box(group, 3.7, 6.8, 0.25, 0, 3.8, 3.2, bezel);
      for (let i = 0; i < 3; i++) this.box(group, 3.0, 0.5, 0.2, 0, 5.4 - i * 0.7, 3.4, bay);
      this.cylinder(group, 0.22, 0.2, 1.2, 1.5, 3.45, button).rotation.x = Math.PI / 2;
      this.mesh(group, new T.SphereGeometry(0.12, 8, 6), led, -1.0, 1.5, 3.45).castShadow = false;
      for (let i = 0; i < 4; i++) this.box(group, 0.05, 0.12, 4.6, 1.82, 1.2 + i * 1.2, 0, bay);
    };
    // Upright, turned a little toward the bench.
    const upright = new T.Group();
    upright.position.set(-15.5, FLOOR, 19);
    upright.rotation.y = 0.25;
    parent.add(upright);
    tower(upright);
    // Lying on its side: a quarter turn about Z moves the body 3.8 units along -X, hence the offset.
    const lying = new T.Group();
    lying.position.set(-5.0, FLOOR + 1.8, 17);
    lying.rotation.z = Math.PI / 2;
    parent.add(lying);
    tower(lying);
  }

  /** A CRT on the floor, facing the bench, with a schematic on its screen, and a keyboard and mouse in front. */
  private monitor(parent: T.Object3D): void {
    const housing = this.tools.material('crt-housing', '#8f8c7e', 0.55, 0.1, { finish: 'plastic', wear: 0.4, dirt: 0.5, size: 128 });
    const keys = this.tools.material('keyboard', '#7f7c70', 0.6, 0.05, { finish: 'plastic', wear: 0.35, dirt: 0.5, size: 64 });
    const keyCap = this.tools.material('key-cap', '#b5b1a0', 0.6, 0.02, { finish: 'plastic', wear: 0.3, size: 64 });

    const canvas = document.createElement('canvas');
    canvas.width = 390;
    canvas.height = 320;
    const context = canvas.getContext('2d');
    const texture = this.tools.track(new T.CanvasTexture(canvas));
    texture.colorSpace = T.SRGBColorSpace;
    const paint = () => {
      if (!context) return;
      context.fillStyle = '#0b1f1a';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = 'rgba(120, 220, 170, 0.22)';
      context.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        context.beginPath();
        context.moveTo(0, (i * canvas.height) / 8);
        context.lineTo(canvas.width, (i * canvas.height) / 8);
        context.stroke();
      }
      // A die schematic: blocks joined by buses, in the phosphor green of the scope.
      context.strokeStyle = '#9ff0b8';
      context.lineWidth = 3;
      context.strokeRect(60, 70, 120, 80);
      context.strokeRect(220, 70, 110, 80);
      context.strokeRect(120, 190, 210, 60);
      context.beginPath();
      context.moveTo(180, 110);
      context.lineTo(220, 110);
      context.moveTo(275, 150);
      context.lineTo(275, 190);
      context.moveTo(120, 220);
      context.lineTo(60, 220);
      context.lineTo(60, 150);
      context.stroke();
      context.fillStyle = '#9ff0b8';
      context.font = `600 26px ${LABEL_FAMILY}`;
      context.textAlign = 'center';
      context.fillText('ALU', 120, 116);
      context.fillText('REG', 275, 116);
      context.fillText('CTRL', 225, 226);
      context.font = `500 18px ${LABEL_FAMILY}`;
      context.fillText('DISEÑO · CPU', canvas.width / 2, 40);
      texture.needsUpdate = true;
    };
    paint();
    void document.fonts?.ready.then(paint);

    const crt = new T.Group();
    crt.position.set(13, FLOOR, 21);
    crt.rotation.y = Math.PI; // the screen faces the bench
    parent.add(crt);
    this.box(crt, 4.4, 0.4, 3.4, 0, 0.2, 0, housing);
    this.box(crt, 5.0, 4.6, 2.6, 0, 2.5, 0.2, housing);
    this.mesh(crt, new T.CylinderGeometry(2.3, 1.2, 2.6, 14), housing, 0, 2.5, -1.9).rotation.x = Math.PI / 2;
    this.mesh(crt, this.tools.track(new T.PlaneGeometry(3.9, 3.2)), this.tools.track(new T.MeshBasicMaterial({ map: texture })), 0, 2.5, 1.53).castShadow = false;

    const kb = new T.Group();
    kb.position.set(13, FLOOR, 18.2);
    parent.add(kb);
    this.box(kb, 4.6, 0.36, 1.8, 0, 0.18, 0, keys);
    const caps = new T.InstancedMesh(this.tools.track(new T.BoxGeometry(0.28, 0.12, 0.28)), keyCap, 36);
    const m = new T.Matrix4();
    for (let i = 0; i < 36; i++) {
      m.makeTranslation(-1.9 + (i % 12) * 0.35, 0.42, -0.6 + Math.floor(i / 12) * 0.5);
      caps.setMatrixAt(i, m);
    }
    kb.add(caps);

    const mouse = new T.Group();
    mouse.position.set(16.2, FLOOR, 18.1);
    parent.add(mouse);
    this.box(mouse, 1.0, 0.4, 1.4, 0, 0.2, 0, keys);
  }

  /** Three boards stacked on the floor; the top one carries packaged chips and a silkscreen legend. */
  private boardStack(parent: T.Object3D): void {
    const pcb = this.tools.material('pcb-stack', '#2c4a3d', 0.7, 0.12, { finish: 'pcb', size: 128 });
    const chip = this.tools.material('pcb-chip', '#1b1e20', 0.55, 0.15, { finish: 'plastic', size: 64 });
    const yaw = 0.06;
    for (let k = 0; k < 3; k++) {
      const board = new T.Group();
      board.position.set(5, FLOOR + 0.15 + k * 0.34, 24);
      board.rotation.y = yaw - 0.06 + k * 0.06;
      parent.add(board);
      this.box(board, 6.0, 0.3, 4.2, 0, 0, 0, pcb);
    }
    const top = new T.Group();
    top.position.set(5, FLOOR + 0.98, 24);
    top.rotation.y = yaw + 0.06; // the same turn as the top board
    parent.add(top);
    for (let i = 0; i < 6; i++) this.box(top, 0.8, 0.22, 0.8, -1.9 + (i % 3) * 1.9, 0.11, -0.9 + Math.floor(i / 3) * 1.8, chip);
    this.tools.label(top, 'CPU · REV B', 0, 0.24, 1.6, 2.6);
  }

  /** Two cardboard boxes, the upper one taped, marked CPU · FRÁGIL on its front. */
  private cardboard(parent: T.Object3D): void {
    const kraft = this.tools.material('cardboard', '#a58456', 0.85, 0, { finish: 'wood', wear: 0.4, dirt: 0.5, size: 128 });
    const tape = this.tools.material('tape', '#c9b48a', 0.7, 0, { finish: 'plastic', wear: 0.3, size: 64 });
    this.box(parent, 4.6, 3.4, 3.8, -8.5, FLOOR + 1.7, 25, kraft);
    this.box(parent, 3.6, 2.6, 3.0, -8.9, FLOOR + 4.7, 25.2, kraft);
    this.box(parent, 0.5, 0.04, 3.8, -8.5, FLOOR + 3.42, 25, tape);
    this.box(parent, 0.5, 0.04, 3.0, -8.9, FLOOR + 6.02, 25.2, tape);
    const face = new T.Group();
    face.position.set(-8.5, FLOOR + 1.7, 27.02);
    face.rotation.x = Math.PI / 2;
    parent.add(face);
    this.tools.label(face, 'CPU · FRÁGIL', 0, 0, 0, 2.2);
  }

  /** A wafer in an open case, on the top shelf of the bookcase. */
  private waferCase(parent: T.Object3D): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#3d5673';
      context.fillRect(0, 0, 256, 256);
      const random = seededRandom(9);
      for (let r = 0; r < 16; r++)
        for (let c = 0; c < 16; c++) {
          const tone = random();
          context.fillStyle = tone < 0.18 ? '#24354d' : tone < 0.3 ? '#6f8fb3' : '#4a6a8e';
          context.fillRect(c * 16 + 1, r * 16 + 1, 14, 14);
        }
    }
    const texture = this.tools.track(new T.CanvasTexture(canvas));
    texture.colorSpace = T.SRGBColorSpace;
    const wafer = this.tools.track(new T.MeshStandardMaterial({ map: texture, roughness: 0.22, metalness: 0.55 }));
    const clear = this.tools.track(
      new T.MeshStandardMaterial({ color: '#c8d6dc', roughness: 0.15, transparent: true, opacity: 0.28, depthWrite: false }),
    );
    const shelf = FLOOR + 12.64;
    this.cylinder(parent, 0.75, 0.06, -20.9, shelf + 0.1, -8.75, wafer);
    this.box(parent, 1.9, 0.5, 1.9, -20.9, shelf + 0.25, -8.75, clear);
  }

  /** A tray of packaged processors on the floor: dark ceramic bodies with metal lids, in two instanced meshes. */
  private cpuTray(parent: T.Object3D): void {
    const foam = this.tools.material('cpu-tray', '#1d2123', 0.9, 0, { finish: 'rubber', wear: 0.3, dirt: 0.5, size: 64 });
    const body = this.tools.material('cpu-package', '#17191b', 0.6, 0.05, { finish: 'ceramic', size: 64 });
    const lid = this.tools.material('cpu-lid', '#9a9ea1', 0.35, 0.9, { finish: 'steel', size: 64 });
    this.box(parent, 3.6, 0.22, 2.4, 2, FLOOR + 0.11, 28, foam);
    const packages = new T.InstancedMesh(this.tools.track(new T.BoxGeometry(0.7, 0.14, 0.7)), body, 8);
    const lids = new T.InstancedMesh(this.tools.track(new T.BoxGeometry(0.56, 0.03, 0.56)), lid, 8);
    const m = new T.Matrix4();
    for (let i = 0; i < 8; i++) {
      const x = 2 - 1.2 + (i % 4) * 0.8,
        z = 28 - 0.5 + Math.floor(i / 4) * 1.0;
      m.makeTranslation(x, FLOOR + 0.29, z);
      packages.setMatrixAt(i, m);
      m.makeTranslation(x, FLOOR + 0.375, z);
      lids.setMatrixAt(i, m);
    }
    parent.add(packages, lids);
  }

  /** Anti-static bags, translucent, lying on the floor. */
  private bags(parent: T.Object3D): void {
    const bag = this.tools.track(
      new T.MeshStandardMaterial({ color: '#c9b6c6', roughness: 0.45, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    const placements: [number, number, number][] = [
      [-3, 30, 0.3],
      [-1.2, 31.6, -0.4],
      [-4.8, 31.8, 0.9],
    ];
    for (const [x, z, yaw] of placements) {
      const piece = this.box(parent, 1.8, 0.1, 2.6, x, FLOOR + 0.05, z, bag);
      piece.rotation.y = yaw;
    }
  }

  /** Two blueprint sheets lying on the floor, the way someone left them. */
  private floorSheets(parent: T.Object3D): void {
    const lay = (kind: 'soc' | 'timing', seed: number, x: number, z: number, yaw: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = SHEET_WIDTH;
      canvas.height = SHEET_HEIGHT;
      const context = canvas.getContext('2d');
      const texture = this.tools.track(new T.CanvasTexture(canvas));
      texture.colorSpace = T.SRGBColorSpace;
      if (context) paintBlueprint(context, { kind, seed, sheet: 'HOJA ' + seed });
      const sheet = new T.Mesh(
        this.tools.track(new T.PlaneGeometry(3.4, 2.55)),
        this.tools.track(new T.MeshStandardMaterial({ map: texture, roughness: 0.85 })),
      );
      // Flat on the floor, then turned about the vertical axis.
      sheet.rotation.set(-Math.PI / 2, yaw, 0, 'YXZ');
      sheet.position.set(x, FLOOR + 0.03, z);
      sheet.receiveShadow = true;
      parent.add(sheet);
    };
    lay('soc', 21, 8, 31, 0.2);
    lay('timing', 22, -10, 33, -0.3);
  }
}
