import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';
import type { Bus, PcPacket, PcSceneActivity } from '../../laboratory/pc-activity';
import {
  CPU_BLOCKS,
  CPU_PACKAGE,
  KEYBOARD,
  LANE_X,
  MONITOR,
  PC_BOARD,
  PC_PARTS,
  PC_TOP,
  RAIL_END,
  RAIL_START,
  RAIL_Z,
  along,
  routeOf,
  type Placement,
} from './pc-layout';

export const PC_BOARD_BASE = 0;
const BUSES: readonly Bus[] = ['address', 'data', 'control'];
const BUS_COLOUR: Record<Bus, string> = { address: '#c9925a', data: '#d6a46c', control: '#9fb5c4' };
/** Seconds each event of a step stays on stage when the clock runs. */
export const EVENT_SECONDS = 0.75;

/** The monitor shows few, large characters: legible from the default camera, not a terminal. */
const MONITOR_ROWS = 3;
const MONITOR_COLUMNS = 12;
const hex = (n: number, d = 4) => (n >>> 0).toString(16).toUpperCase().padStart(d, '0');

/**
 * La máquina as a whole computer: a board with the processor (PC, IR, MAR, MDR, R0–R3, ALU and control unit), ROM,
 * RAM, controllers and SSD, three rails of bus, a case that closes over it, and the keyboard and monitor outside.
 * Everything it shows is read from the activity of the PC engine: the packets are the transfers of the last
 * step, the monitor is the output of the model, and no sequence is invented.
 */
export class PcBoardModel extends WorkshopGeometry {
  private glow = new Map<string, T.MeshStandardMaterial[]>();
  private root!: T.Group;
  private pixels?: T.InstancedMesh;

  build(root: T.Group, parts: Map<string, T.Object3D>, animate: (fn: (t: number) => void) => void): void {
    this.root = root;
    const pcb = this.tools.material('machine-pcb', '#2c4a3d', 0.7, 0.12, { finish: 'pcb', size: 128 });
    const dark = this.tools.material('pc-plastic', '#1d2123', 0.6, 0.08, { finish: 'plastic', wear: 0.3, size: 64 });
    const copper = this.tools.material('bus-copper', '#b8794a', 0.35, 0.85, { finish: 'steel', wear: 0.25, size: 64 });
    this.box(root, PC_BOARD.width, 0.16, PC_BOARD.depth, 0, PC_TOP / 2, 0, pcb).name = 'machine-pcb';
    for (const x of [-4.2, 4.2]) for (const z of [-2.7, 2.7]) this.screw(root, x, PC_TOP + 0.0275, z);

    // Processor: a package with the blocks of the cycle on its die.
    const cpu = new T.Group();
    cpu.position.set(CPU_PACKAGE.x, PC_TOP, CPU_PACKAGE.z);
    cpu.userData['part'] = 'cpu';
    this.box(cpu, CPU_PACKAGE.w, 0.16, CPU_PACKAGE.d, 0, 0.08, 0, this.body('cpu', CPU_PACKAGE.color));
    this.tools.label(cpu, CPU_PACKAGE.label, 0, 0.17, -CPU_PACKAGE.d / 2 + 0.12, CPU_PACKAGE.w * 0.8);
    parts.set('cpu', cpu);
    root.add(cpu);
    const legends = new Map<string, T.Object3D>();
    for (const b of CPU_BLOCKS) {
      const g = new T.Group();
      g.position.set(b.x, PC_TOP + 0.16, b.z);
      g.userData['part'] = b.id;
      this.box(g, b.w, 0.07, b.d, 0, 0.035, 0, this.body(b.id, b.color));
      this.tools.label(g, b.label, 0, 0.08, -b.d * 0.22, b.w * 0.85);
      const legend = this.tools.label(g, '', 0, 0.082, b.d * 0.18, b.w * 0.9);
      if (legend) legends.set(b.id, legend as T.Object3D);
      parts.set(b.id, g);
      root.add(g);
    }

    // Chips and modules, each a part the student can pick.
    for (const p of PC_PARTS) {
      const g = new T.Group();
      g.position.set(p.x, PC_TOP, p.z);
      g.userData['part'] = p.id;
      this.box(g, p.w, p.id === 'ssd' ? 0.12 : 0.2, p.d, 0, p.id === 'ssd' ? 0.06 : 0.1, 0, this.body(p.id, p.color));
      this.tools.label(g, p.label, 0, (p.id === 'ssd' ? 0.12 : 0.2) + 0.012, -p.d * 0.22, p.w * 0.9);
      const legend = this.tools.label(g, '', 0, (p.id === 'ssd' ? 0.12 : 0.2) + 0.013, p.d * 0.2, p.w * 0.92);
      if (legend) legends.set(p.id, legend as T.Object3D);
      parts.set(p.id, g);
      root.add(g);
    }
    const bands = this.buildRamBands(parts.get('ram')!);
    this.buildSsd(parts.get('ssd')!);

    // Rails of the bus: three lines side by side, with a stub to every component.
    const busMaterial = new Map<Bus, T.MeshStandardMaterial>();
    for (const bus of BUSES) {
      const m = this.tools.track(copper.clone());
      m.emissive.set('#000000');
      busMaterial.set(bus, m);
      this.trace(root, [RAIL_START, RAIL_Z[bus]], [RAIL_END, RAIL_Z[bus]], m, bus);
      for (const p of PC_PARTS) {
        if (p.id === 'ssd') continue;
        const top = p.z < RAIL_Z.address;
        const edge = top ? p.z + p.d / 2 : p.z - p.d / 2;
        this.trace(root, [p.x + LANE_X[bus], edge], [p.x + LANE_X[bus], RAIL_Z[bus]], m, bus);
      }
    }
    const cable = this.tools.material('pc-cable', '#15181a', 0.7, 0.05, { finish: 'plastic', size: 64 });
    this.buildKeyboard(parts, dark);
    this.buildMonitor(parts, dark, legends);
    for (const [device, controller] of [['keyboard', 'keyboard-controller'], ['monitor', 'display-engine']] as const) {
      const route = routeOf(device, controller, 'data');
      for (let i = 0; i < route.length - 1; i++) this.trace(root, route[i], route[i + 1], cable, 'cable', 0.09, 0.02);
    }
    this.buildCase(root, parts);

    // One packet per line of the bus.
    const packets = new Map<Bus, T.Mesh>();
    for (const bus of BUSES) {
      const packet = new T.Mesh(
        this.tools.track(new T.SphereGeometry(0.095, 12, 10)),
        this.tools.track(new T.MeshStandardMaterial({ color: BUS_COLOUR[bus], emissive: BUS_COLOUR[bus], emissiveIntensity: 1.8 })),
      );
      packet.userData['dynamic'] = true;
      packet.userData['noBounds'] = true;
      packet.visible = false;
      packet.name = 'packet-' + bus;
      root.add(packet);
      packets.set(bus, packet);
    }
    const power = this.lamp(root, '#7bd38f', 4.0, PC_TOP + 0.05, -2.55);
    const irq = this.lamp(root, '#ff6b5a', parts.get('interrupt-controller')!.position.x + 0.45, PC_TOP + 0.21, parts.get('interrupt-controller')!.position.z + 0.28);
    const service = this.lamp(root, '#ffb347', parts.get('interrupt-controller')!.position.x + 0.65, PC_TOP + 0.21, parts.get('interrupt-controller')!.position.z + 0.28);

    // The activity of the engine drives everything below.
    let activity: PcSceneActivity | undefined;
    let sequence: { packets: PcPacket[]; lit: string[] }[] = [];
    let startedAt = -1;
    let shownStep = -1;
    let lastKey = '';
    const text = new Map<T.Object3D, string>();
    const write = (id: string, value: string) => {
      const o = legends.get(id);
      if (!o || text.get(o) === value) return;
      text.set(o, value);
      this.tools.relabel?.(o, value);
    };
    this.tools.onActivity?.((a) => {
      activity = a.pc;
      if (!activity) return;
      const r = activity.registers;
      write('cpu-pc', hex(r.pc) + 'h');
      write('cpu-ir', hex(r.ir, 8) + 'h');
      write('cpu-mar', hex(r.mar) + 'h');
      write('cpu-mdr', hex(r.mdr, 8) + 'h');
      write('cpu-regs', r.regs.map((v) => v | 0).join(' ') + ' · ' + r.flags);
      write('rom', 'LEE: ' + (r.pc < 0x10 ? 'EJECUTANDO' : 'CARGADOR'));
      write('ram', activity.ram.program + '/' + activity.ram.input + '/' + activity.ram.work + '/' + activity.ram.framebuffer);
      write('ssd', activity.ssd.map((f) => f.name.split('.')[0]).join(' · '));
      write('keyboard-controller', activity.interrupt.pending + ' tecla(s)');
      write('interrupt-controller', activity.interrupt.enabled ? 'HABILITADA' : 'DESHABILITADA');
      write('storage-controller', 'SSD ↔ RAM');
      write('display-engine', activity.monitor.mode === 'off' ? 'APAGADO' : activity.monitor.mode.toUpperCase());
      write('memory-controller', 'MAR a MEMORIA');
      write('alu', 'ALU');
      write('control-unit', activity.interrupt.inService ? 'EN INTERRUPCIÓN' : 'CICLO');
      (power.material as T.MeshStandardMaterial).emissiveIntensity = activity.power ? 1.8 : 0.05;
      (irq.material as T.MeshStandardMaterial).emissiveIntensity = activity.interrupt.pending > 0 && activity.interrupt.enabled ? 1.8 : 0.05;
      (service.material as T.MeshStandardMaterial).emissiveIntensity = activity.interrupt.inService ? 1.8 : 0.05;
      this.showBands(bands, activity);
      this.showMonitor(activity, legends);
      const key = activity.step + ':' + activity.events.length + ':' + (activity.events[0]?.text ?? '');
      if (key !== lastKey) {
        lastKey = key;
        startedAt = -1;
        shownStep = -1;
        sequence = activity.events.map((e) => ({ packets: e.packets, lit: [e.source, e.target] }));
      }
    });

    animate((t) => {
      const dt = startedAt < 0 ? 0 : t - startedAt;
      if (startedAt < 0) startedAt = t;
      // A frozen clock (reduced motion) shows the step as it ended: its last transfer, still.
      const frozen = t <= 0.0001 || dt > sequence.length * EVENT_SECONDS + 30;
      const index = frozen ? sequence.length - 1 : Math.min(sequence.length - 1, Math.floor(dt / EVENT_SECONDS));
      const progress = frozen ? 1 : Math.min(1, (dt - index * EVENT_SECONDS) / (EVENT_SECONDS * 0.85));
      if (index !== shownStep) {
        shownStep = index;
        for (const [id, list] of this.glow) for (const m of list) m.emissiveIntensity = 0;
        for (const id of sequence[index]?.lit ?? []) for (const m of this.glow.get(id) ?? []) m.emissiveIntensity = 0.55;
      }
      const current = sequence[index]?.packets ?? [];
      for (const bus of BUSES) {
        const packet = packets.get(bus)!;
        const p = current.find((x) => x.bus === bus);
        busMaterial.get(bus)!.emissive.set(p ? '#ffb347' : '#000000');
        busMaterial.get(bus)!.emissiveIntensity = p ? 0.9 : 0;
        packet.visible = !!p;
        if (!p) continue;
        const route = routeOf(p.from, p.to, bus);
        const point = along(route, progress);
        packet.position.set(point[0], PC_TOP + 0.13, point[1]);
      }
    });
  }

  /** A body material that can glow when its piece takes part in the transfer on show. */
  private body(id: string, colour: string): T.MeshStandardMaterial {
    const m = this.tools.track(this.tools.material('pc-' + id, colour, 0.5, 0.2, { finish: 'plastic', wear: 0.3, dirt: 0.4, size: 128 }).clone());
    m.emissive.set('#ffb347');
    m.emissiveIntensity = 0;
    this.glow.set(id, [...(this.glow.get(id) ?? []), m]);
    return m;
  }

  private trace(parent: T.Object3D, a: [number, number], b: [number, number], material: T.Material, name: string, width = 0.035, y = PC_TOP + 0.006): void {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    if (!length) return;
    const mesh = this.mesh(parent, this.tools.track(new T.BoxGeometry(length, 0.012, width)), material, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.name = name === 'cable' ? 'pc-cable' : 'bus-' + name;
  }

  private lamp(root: T.Object3D, colour: string, x: number, y: number, z: number): T.Mesh {
    const material = this.tools.track(new T.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.05 }));
    const led = this.mesh(root, new T.SphereGeometry(0.05, 10, 8), material, x, y, z);
    led.userData['dynamic'] = true;
    return led;
  }

  /** The four regions of the RAM as bands; each fills with the words in use. */
  private buildRamBands(ram: T.Object3D): Map<string, T.Mesh> {
    const bands = new Map<string, T.Mesh>();
    const names = ['program', 'input', 'work', 'framebuffer'] as const;
    const colours = ['#d6a46c', '#9fb5c4', '#9fd6a6', '#b79ad6'];
    const w = 0.5;
    names.forEach((name, i) => {
      const material = this.tools.track(new T.MeshStandardMaterial({ color: colours[i], emissive: colours[i], emissiveIntensity: 0.1 }));
      const bar = this.mesh(ram, this.tools.track(new T.BoxGeometry(w, 0.1, 0.12)), material, -0.8 + i * 0.55, 0.25, 0.34);
      bar.name = 'ram-band-' + name;
      bar.userData['dynamic'] = true;
      bands.set(name, bar);
    });
    return bands;
  }

  private showBands(bands: Map<string, T.Mesh>, a: PcSceneActivity): void {
    const caps = { program: 256, input: 1024, work: 256, framebuffer: 2048 };
    for (const [name, bar] of bands) {
      const used = a.ram[name as 'program'] / caps[name as 'program'];
      bar.scale.x = Math.max(0.04, Math.min(1, used));
      (bar.material as T.MeshStandardMaterial).emissiveIntensity = a.ram.touched === name ? 1.4 : 0.1;
    }
  }

  private buildSsd(ssd: T.Object3D): void {
    const chipMaterial = this.tools.material('ssd-nand', '#1a1d1f', 0.5, 0.1, { finish: 'plastic', size: 64 });
    for (let i = 0; i < 4; i++) this.box(ssd, 0.42, 0.04, 0.34, -0.85 + i * 0.57, 0.14, 0.12, chipMaterial);
  }

  private buildKeyboard(parts: Map<string, T.Object3D>, dark: T.MeshStandardMaterial): void {
    const g = new T.Group();
    g.position.set(KEYBOARD.x, PC_BOARD_BASE, KEYBOARD.z);
    g.userData['part'] = 'keyboard';
    this.box(g, KEYBOARD.w, 0.14, KEYBOARD.d, 0, 0.07, 0, dark);
    const keyMaterial = this.body('keyboard', '#b9b6aa');
    const keys = new T.InstancedMesh(this.tools.track(new T.BoxGeometry(0.2, 0.05, 0.2)), keyMaterial, 56);
    const m = new T.Matrix4();
    for (let i = 0; i < 56; i++) {
      m.makeTranslation(-1.5 + (i % 14) * 0.23, 0.165, -0.4 + Math.floor(i / 14) * 0.26);
      keys.setMatrixAt(i, m);
    }
    keys.userData['detail'] = true;
    g.add(keys);
    this.box(g, 1.4, 0.05, 0.2, 0, 0.165, 0.42, keyMaterial);
    this.tools.label(g, KEYBOARD.label, 0, 0.145, -KEYBOARD.d / 2 - 0.12, 1.2);
    parts.set('keyboard', g);
    this.root.add(g);
  }

  private buildMonitor(parts: Map<string, T.Object3D>, dark: T.MeshStandardMaterial, legends: Map<string, T.Object3D>): void {
    const g = new T.Group();
    g.position.set(MONITOR.x, PC_BOARD_BASE, MONITOR.z);
    g.userData['part'] = 'monitor';
    this.cylinder(g, 0.45, 0.06, 0, 0.03, 0.1, dark);
    this.box(g, 0.26, 0.9, 0.18, 0, 0.5, 0, dark);
    this.box(g, MONITOR.w, MONITOR.h, MONITOR.d, 0, 0.9 + MONITOR.h / 2, 0, this.body('monitor', '#1a1d1f'));
    const screen = new T.Mesh(
      this.tools.track(new T.PlaneGeometry(MONITOR.w - 0.3, MONITOR.h - 0.3)),
      this.tools.track(new T.MeshBasicMaterial({ color: '#07110a' })),
    );
    screen.position.set(0, 0.9 + MONITOR.h / 2, MONITOR.d / 2 + 0.004);
    screen.name = 'monitor-screen';
    g.add(screen);
    // Three big rows of text and an 8×8 image: only what the engine's monitor holds is shown. The rows stand
    // upright facing the viewer (legends lie flat by default, which is why the screen looked black) in phosphor green.
    for (let row = 0; row < MONITOR_ROWS; row++) {
      const label = this.tools.label(g, '', 0, 0.9 + MONITOR.h / 2 + 0.62 - row * 0.62, MONITOR.d / 2 + 0.012, MONITOR.w - 0.3, {
        color: '#7dff9a',
        maxSize: 64,
        upright: true,
      });
      if (label) legends.set('monitor-row-' + row, label as T.Object3D);
    }
    const pixels = new T.InstancedMesh(this.tools.track(new T.PlaneGeometry(0.2, 0.2)), this.tools.track(new T.MeshBasicMaterial({ color: '#ffffff' })), 64);
    const m = new T.Matrix4();
    for (let i = 0; i < 64; i++) {
      m.makeTranslation(-0.77 + (i % 8) * 0.22, 0.9 + MONITOR.h / 2 + 0.77 - Math.floor(i / 8) * 0.22, MONITOR.d / 2 + 0.01);
      pixels.setMatrixAt(i, m);
      pixels.setColorAt(i, new T.Color('#000000'));
    }
    pixels.name = 'monitor-pixels';
    pixels.visible = false;
    pixels.userData['dynamic'] = true;
    g.add(pixels);
    this.pixels = pixels;
    parts.set('monitor', g);
    this.root.add(g);
  }

  private showMonitor(a: PcSceneActivity, legends: Map<string, T.Object3D>): void {
    const m = a.monitor;
    const rows: string[] = [];
    if (m.mode === 'text' || m.mode === 'number' || m.mode === 'error') {
      const lines = (m.text || ' ').split('\n').flatMap((l) => (l.length ? l.match(/.{1,22}/g)! : ['']));
      rows.push(...lines.slice(-4));
    }
    for (let i = 0; i < MONITOR_ROWS; i++) {
      const label = legends.get('monitor-row-' + i);
      if (!label) continue;
      const wanted = rows[i] ?? '';
      if ((label.userData['shown'] ?? '') === wanted) continue;
      label.userData['shown'] = wanted;
      this.tools.relabel?.(label, wanted);
    }
    const pixels = this.pixels;
    if (!pixels) return;
    pixels.visible = m.mode === 'image' && m.pixels.length === 64;
    if (pixels.visible) {
      const key = m.pixels.join(',');
      if (pixels.userData['key'] !== key) {
        pixels.userData['key'] = key;
        const colour = new T.Color();
        m.pixels.forEach((v, i) => pixels.setColorAt(i, colour.setRGB(v / 255, v / 255, v / 255)));
        if (pixels.instanceColor) pixels.instanceColor.needsUpdate = true;
      }
    }
  }

  private buildCase(root: T.Group, parts: Map<string, T.Object3D>): void {
    const material = this.tools.track(this.tools.material('pc-case', '#2a2f31', 0.55, 0.25, { finish: 'plastic', wear: 0.3, size: 128 }).clone());
    material.transparent = true;
    const lid = new T.Group();
    lid.position.set(0, PC_TOP + 1.1, 0);
    lid.userData['part'] = 'lid';
    lid.userData['restY'] = PC_TOP + 1.1;
    lid.userData['ghostMaterial'] = material;
    const shell = this.box(lid, PC_BOARD.width + 0.2, 1.5, PC_BOARD.depth + 0.2, 0, 0, 0, material);
    shell.name = 'pc-case';
    // Vent slots on the front: they make the box read as a computer, not a slab.
    const slot = this.tools.material('pc-vent', '#101314', 0.8, 0.05, { finish: 'plastic', size: 64 });
    for (let i = 0; i < 6; i++) this.box(lid, 2.6, 0.05, 0.02, -2.2, -0.45 + i * 0.12, (PC_BOARD.depth + 0.2) / 2 + 0.003, slot);
    this.tools.label(lid, 'PC · CAJA CERRADA', 2.0, 0.76, 0, 3.4);
    parts.set('lid', lid);
    root.add(lid);
  }
}

export type { Placement };
