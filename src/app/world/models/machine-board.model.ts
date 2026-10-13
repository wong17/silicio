import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';

/** Board datum: its underside is the station origin, so the station rests on the mat. */
export const MACHINE_BOARD_BASE = 0;

const PCB_TOP = 0.16;
const SOCKET_TOP = PCB_TOP + 0.1;

/** The three conversations of the machine: processor and memory, processor and I/O. */
const CHIPS = [
  { id: 'cpu', label: 'PROCESADOR', color: '#b27e47', x: -2.45, z: 0, w: 1.9, d: 1.5 },
  { id: 'ram', label: 'MEMORIA RAM', color: '#477c70', x: 1.3, z: -1.2, w: 2.6, d: 1.1 },
  { id: 'io', label: 'ENTRADA / SALIDA', color: '#68869d', x: 1.3, z: 1.3, w: 2.6, d: 1.0 },
] as const;

/** Bundles of copper traces between chips, each with the chip-edge points it joins. */
const BUSES = [
  {
    name: 'DIRECCIONES',
    from: [-1.5, -0.35],
    to: [0.05, -0.95],
    spread: [-0.1, 0, 0.1],
    colour: '#c9925a',
  },
  {
    name: 'DATOS',
    from: [-1.5, 0.22],
    to: [0.05, -0.8],
    spread: [-0.08, 0, 0.08],
    colour: '#d6a46c',
  },
  {
    name: 'CONTROL',
    from: [-1.5, 0.45],
    to: [0.05, 1.3],
    spread: [-0.07, 0, 0.07],
    colour: '#9fb5c4',
  },
] as const;

/**
 * La máquina's board: a green PCB with three chips on sockets, copper buses between them, a crystal,
 * decoupling capacitors, an expansion slot, and status LEDs. Packets travel along the buses and the
 * LEDs blink, so the station shows the three conversations while it runs.
 */
export class MachineBoardModel extends WorkshopGeometry {
  build(root: T.Group, parts: Map<string, T.Object3D>, animate: (fn: (t: number) => void) => void): void {
    const pcb = this.tools.material('machine-pcb', '#2c4a3d', 0.7, 0.12, { finish: 'pcb', size: 128 });
    const socket = this.tools.material('machine-socket', '#1a1d1f', 0.6, 0.05, { finish: 'plastic', wear: 0.3, size: 64 });
    const pinMaterial = this.tools.material('dip-pins', '#9da2a6', 0.35, 0.9, { finish: 'steel', size: 64 });
    const copper = this.tools.material('bus-copper', '#b8794a', 0.35, 0.85, { finish: 'steel', wear: 0.25, size: 64 });
    const gold = this.tools.material('edge-gold', '#c9a24a', 0.3, 0.9, { finish: 'steel', size: 64 });
    this.box(root, 7.6, 0.16, 5.2, 0, PCB_TOP / 2, 0, pcb).name = 'machine-pcb';

    for (const chip of CHIPS) {
      const group = new T.Group();
      group.position.set(chip.x, PCB_TOP, chip.z);
      group.userData['part'] = chip.id;
      parts.set(chip.id, group);
      root.add(group);
      // Socket below, chip body above; pins run along both long sides.
      this.box(group, chip.w + 0.14, 0.1, chip.d + 0.14, 0, 0.05, 0, socket);
      this.box(group, chip.w, 0.22, chip.d, 0, 0.21, 0, this.tools.material('chip-' + chip.id, chip.color, 0.5, 0.2, { finish: 'plastic', wear: 0.3, dirt: 0.4, size: 128 }));
      this.tools.label(group, chip.label, 0, 0.33, 0, chip.w * 0.85);
      const pins = new T.InstancedMesh(
        this.tools.track(new T.BoxGeometry(0.05, 0.1, 0.05)),
        pinMaterial,
        16,
      );
      const matrix = new T.Matrix4();
      for (let i = 0; i < 8; i++)
        for (const side of [-1, 1]) {
          const x = -chip.w / 2 + ((i + 0.5) / 8) * chip.w;
          matrix.makeTranslation(x, 0.05, side * (chip.d / 2 + 0.06));
          pins.setMatrixAt(i * 2 + (side > 0 ? 1 : 0), matrix);
        }
      group.add(pins);
    }

    // Copper traces: each bus is a bundle of parallel segments from the processor to a chip.
    const packets: { a: [number, number]; b: [number, number]; phase: number; mesh: T.Mesh }[] = [];
    const packetMaterial = this.tools.track(
      new T.MeshStandardMaterial({ color: '#ffe9a7', emissive: '#ffc35c', emissiveIntensity: 1.6 }),
    );
    for (const bus of BUSES) {
      for (const offset of bus.spread) {
        const a: [number, number] = [bus.from[0], bus.from[1] + offset];
        const b: [number, number] = [bus.to[0], bus.to[1] + offset];
        this.segment(root, a, b, 0.035, PCB_TOP + 0.006, copper);
      }
      this.tools.label(root, bus.name, (bus.from[0] + bus.to[0]) / 2, PCB_TOP + 0.012, bus.to[1] + 0.3, 1.5);
      for (const offset of bus.spread) {
        const packet = new T.Mesh(this.tools.track(new T.SphereGeometry(0.06, 10, 8)), packetMaterial);
        packet.userData['dynamic'] = true;
        root.add(packet);
        packets.push({
          a: [bus.from[0], bus.from[1] + offset],
          b: [bus.to[0], bus.to[1] + offset],
          phase: (packets.length * 0.37) % 1,
          mesh: packet,
        });
      }
    }
    animate((t) => {
      for (const p of packets) {
        // Packets travel out and back along their trace, so each bus reads as a two-way conversation.
        const q = (t * 0.32 + p.phase * 2) % 2,
          u = q <= 1 ? q : 2 - q;
        p.mesh.position.set(
          p.a[0] + (p.b[0] - p.a[0]) * u,
          PCB_TOP + 0.09,
          p.a[1] + (p.b[1] - p.a[1]) * u,
        );
      }
    });

    // Crystal, decoupling capacitors, an expansion slot and the status LEDs.
    const metal = this.tools.material('crystal-can', '#a9adb0', 0.3, 0.9, { finish: 'steel', size: 64 });
    this.box(root, 0.5, 0.14, 0.26, -3.3, PCB_TOP + 0.07, 1.9, metal);
    this.tools.label(root, 'XTAL', -3.3, PCB_TOP + 0.15, 2.4, 0.6);
    const capacitor = new T.InstancedMesh(
      this.tools.track(new T.CylinderGeometry(0.09, 0.09, 0.24, 12)),
      this.tools.material('machine-capacitor', '#2e4f7d', 0.45, 0.05, { finish: 'plastic', wear: 0.25, size: 64 }),
      8,
    );
    const capacitorMatrix = new T.Matrix4();
    for (let i = 0; i < 8; i++) {
      capacitorMatrix.makeTranslation(-3.1 + i * 0.9, PCB_TOP + 0.12, 2.25);
      capacitor.setMatrixAt(i, capacitorMatrix);
    }
    root.add(capacitor);
    const slot = this.tools.material('expansion-slot', '#2a2e30', 0.6, 0.05, { finish: 'plastic', wear: 0.3, size: 64 });
    // The slot sits inside the board edge; its front carries a row of contact grooves.
    this.box(root, 6.2, 0.42, 0.44, 0, PCB_TOP + 0.21, -2.3, slot);
    const grooves = new T.InstancedMesh(this.tools.track(new T.BoxGeometry(0.1, 0.06, 0.02)), gold, 24);
    for (let i = 0; i < 24; i++) {
      capacitorMatrix.makeTranslation(-2.97 + i * 0.26, PCB_TOP + 0.21, -2.53);
      grooves.setMatrixAt(i, capacitorMatrix);
    }
    root.add(grooves);
    const ledColours = ['#7bd38f', '#ffb347', '#ff6b5a'];
    ledColours.forEach((colour, i) => {
      const material = this.tools.track(
        new T.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.4 }),
      );
      const led = this.mesh(root, new T.SphereGeometry(0.05, 10, 8), material, 3.2 + i * 0.22, PCB_TOP + 0.05, -1.7);
      led.userData['dynamic'] = true;
      animate((t) => {
        // Each LED blinks at its own rate, as status lamps do when the bus is busy.
        material.emissiveIntensity = Math.sin(t * (2.2 + i * 1.1)) > 0.1 ? 1.8 : 0.12;
      });
    });
    for (const x of [-3.5, 3.5])
      for (const z of [-2.35, 2.35]) this.screw(root, x, PCB_TOP + 0.0275, z);
  }

  /** A straight trace on the board, lying flat at height `y`. */
  private segment(
    parent: T.Object3D,
    a: [number, number],
    b: [number, number],
    width: number,
    y: number,
    material: T.Material,
  ): void {
    const dx = b[0] - a[0],
      dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    const mesh = this.mesh(
      parent,
      this.tools.track(new T.BoxGeometry(length, 0.012, width)),
      material,
      (a[0] + b[0]) / 2,
      y,
      (a[1] + b[1]) / 2,
    );
    mesh.rotation.y = -Math.atan2(dz, dx);
  }
}
