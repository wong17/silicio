import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';
import type { MachineActivity } from '../../laboratory/station-activity';

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

/** The three buses, routed in right angles: out of the processor, along a vertical channel, into the chip. */
export const BUS_ROUTES = {
  address: { name: 'DIRECCIONES', from: [-1.5, -0.35], to: [0.05, -0.95], elbow: -1.15, colour: '#c9925a', target: 'ram' },
  data: { name: 'DATOS', from: [-1.5, 0.22], to: [0.05, -0.8], elbow: -0.7, colour: '#d6a46c', target: 'ram' },
  control: { name: 'CONTROL', from: [-1.5, 0.45], to: [0.05, 1.3], elbow: -0.95, colour: '#9fb5c4', target: 'io' },
} as const;

const LANES = [-0.08, 0, 0.08];

/** Corner points of one lane of a bus, from the processor to the far chip. */
export function busPath(bus: keyof typeof BUS_ROUTES, lane: number): [number, number][] {
  const r = BUS_ROUTES[bus];
  const o = LANES[lane];
  return [
    [r.from[0], r.from[1] + o],
    [r.elbow + o, r.from[1] + o],
    [r.elbow + o, r.to[1] + o],
    [r.to[0], r.to[1] + o],
  ];
}

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

    // Copper traces: every bus is three parallel lanes of right-angled segments. Each bus has its own
    // material so only the bus the current step uses lights up.
    const busMaterials = new Map<string, T.MeshStandardMaterial>();
    const packets = new Map<string, T.Mesh>();
    const packetMaterial = this.tools.track(
      new T.MeshStandardMaterial({ color: '#ffe9a7', emissive: '#ffc35c', emissiveIntensity: 1.6 }),
    );
    for (const key of Object.keys(BUS_ROUTES) as (keyof typeof BUS_ROUTES)[]) {
      const bus = BUS_ROUTES[key];
      const material = this.tools.track(copper.clone());
      material.emissive.set('#000000');
      busMaterials.set(key, material);
      for (let lane = 0; lane < LANES.length; lane++) {
        const path = busPath(key, lane);
        for (let i = 0; i < path.length - 1; i++) {
          const trace = this.segment(root, path[i], path[i + 1], 0.035, PCB_TOP + 0.006, material);
          trace.name = `bus-${key}`;
        }
      }
      this.tools.label(root, bus.name, bus.elbow, PCB_TOP + 0.012, bus.to[1] + (key === 'control' ? 0.3 : -0.3), 1.2);
      const packet = new T.Mesh(this.tools.track(new T.SphereGeometry(0.075, 10, 8)), packetMaterial);
      packet.userData['dynamic'] = true;
      packet.userData['noBounds'] = true;
      packet.visible = false;
      packet.name = `packet-${key}`;
      root.add(packet);
      packets.set(key, packet);
    }
    // One legend per chip, rewritten from the activity: the ALU on the processor, the cells on the RAM.
    const chipLegends = new Map<string, T.Object3D>();
    for (const chip of CHIPS) {
      const group = parts.get(chip.id)!;
      const legend = this.tools.label(group, '', 0, 0.335, chip.d * 0.3, chip.w * 0.9);
      if (legend) chipLegends.set(chip.id, legend as T.Object3D);
    }
    let active: MachineActivity | undefined;
    let progress = 0;
    let lastT = 0;
    let lastStage = -1;
    this.tools.onActivity?.((a) => {
      active = a.machine;
      if (!active) return;
      if (active.stage !== lastStage) {
        lastStage = active.stage;
        progress = 0;
      }
      const hex = (n: number) => n.toString(16).toUpperCase().padStart(4, '0') + 'h';
      const set = (id: string, text: string) => {
        const legend = chipLegends.get(id);
        if (legend) this.tools.relabel?.(legend, text);
      };
      set('cpu', active.aluFrom !== undefined ? `ALU ${hex(active.aluFrom)} + 5 = ${hex(active.accumulator)}` : `ACC ${hex(active.accumulator)}`);
      set('ram', `0000:${hex(active.memory[0])}  0001:${hex(active.memory[1])}`);
      set('io', `SALIDA ${hex(active.output)}`);
      for (const [key, material] of busMaterials) {
        const lit = key === active.bus;
        material.emissive.set(lit ? '#ffb347' : '#000000');
        material.emissiveIntensity = lit ? 0.9 : 0;
      }
    });
    animate((t) => {
      const dt = t - lastT;
      lastT = t;
      // A frozen clock (reduced motion) lands the packet at the end of its run, so the still frame shows the value.
      progress = dt <= 0 || dt > 0.5 ? 1 : Math.min(1, progress + dt * 0.9);
      for (const [key, packet] of packets) {
        const lit = !!active && active.bus === key;
        packet.visible = lit;
        if (!lit || !active) continue;
        const path = busPath(key as keyof typeof BUS_ROUTES, 1);
        const u = active.direction === 'in' ? 1 - progress : progress;
        const point = pointAlong(path, u);
        packet.position.set(point[0], PCB_TOP + 0.09, point[1]);
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
  ): T.Mesh {
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
    return mesh;
  }
}

/** Point at fraction `u` of the total length of a polyline. */
export function pointAlong(path: [number, number][], u: number): [number, number] {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const total = lengths.reduce((n, l) => n + l, 0);
  let remaining = Math.min(1, Math.max(0, u)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const k = lengths[i] === 0 ? 0 : remaining / lengths[i];
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i][1] + (path[i + 1][1] - path[i][1]) * k];
    }
    remaining -= lengths[i];
  }
  return path[path.length - 1];
}
