import * as T from 'three';
import type { MemoryActivity, StationActivity } from '../../laboratory/station-activity';
import type { WorkshopTools } from '../workshop-tools';

const hex = (n: number, d = 4) => n.toString(16).toUpperCase().padStart(d, '0');

/** Chip centre on the classic board, as the board model places it. */
export function classicChipPosition(bank: number, n: number): { x: number; z: number } {
  return { x: -2.7 + (n % 4) * 1.8, z: (bank ? 1 : -1) * 1.4 + (n < 4 ? -0.6 : 0.6) };
}

/**
 * Presents where a segment:offset pair lands: the adder ruler, the bytes in each bank, the row and column
 * in a magnifier over the active chip, and for the DIMM the eight byte lanes with the SPD marked.
 * It only reads StationActivity; selecting a cell is done by the session.
 */
export class MemoryActivityView {
  private lamps: T.Mesh[][] = [[], []];
  private lupa?: T.Group;
  private rowBar?: T.Mesh;
  private colBar?: T.Mesh;
  private cellMarker?: T.Mesh;
  private labels: Record<string, T.Object3D | undefined> = {};
  private lanes: T.Object3D[] = [];
  private spdLamp?: T.Mesh;
  private progress = 1;
  private lastKey = '';
  private lastT = 0;
  private current?: MemoryActivity;

  constructor(private readonly tools: WorkshopTools) {}

  get lupaVisible(): boolean {
    return !!this.lupa?.visible;
  }

  /** Builds the classic overlay on a board whose underside is at `baseY`. */
  buildClassic(root: T.Group, parts: Map<string, T.Object3D>, baseY: number, animate: (fn: (t: number) => void) => void): void {
    const lampMaterial = this.tools.track(new T.MeshBasicMaterial({ color: '#7fe0b0' }));
    const lampGeometry = this.tools.track(new T.CircleGeometry(0.075, 14));
    lampGeometry.rotateX(-Math.PI / 2);
    for (let bank = 0; bank < 2; bank++)
      for (let n = 0; n < 8; n++) {
        const chip = parts.get(`dram-${bank}-${n}`);
        if (!chip) continue;
        const material = this.tools.track(lampMaterial.clone());
        const lamp = new T.Mesh(lampGeometry, material);
        lamp.position.set(0.05, 0.735, 0.3);
        lamp.visible = false;
        lamp.userData['noBounds'] = true;
        lamp.name = `bit-lamp-${bank}-${n}`;
        chip.add(lamp);
        this.lamps[bank].push(lamp);
      }

    // Adder ruler behind the board: segment × 16 + offset, written out with the real numbers.
    const plate = new T.Mesh(
      this.tools.track(new T.BoxGeometry(6.4, 0.04, 1.3)),
      this.tools.track(new T.MeshStandardMaterial({ color: '#1c2322', roughness: 0.6 })),
    );
    plate.position.set(0, baseY + 0.02, -3.6);
    plate.name = 'address-ruler';
    root.add(plate);
    this.labels['sum'] = this.tools.label?.(plate, 'segmento × 16 + offset', 0, 0.026, -0.42, 6.0) as T.Object3D;
    this.labels['bus'] = this.tools.label?.(plate, 'A0 · BHE#', 0, 0.026, 0, 6.0) as T.Object3D;
    this.labels['sp'] = this.tools.label?.(plate, 'SP', 0, 0.026, 0.42, 6.0) as T.Object3D;

    // Magnifier: a ring with a 16 x 16 grid of cells above the active chip.
    const lupa = new T.Group();
    lupa.visible = false;
    lupa.name = 'row-column-magnifier';
    lupa.userData['noBounds'] = true;
    const ring = new T.Mesh(
      this.tools.track(new T.TorusGeometry(0.78, 0.045, 8, 36)),
      this.tools.track(new T.MeshStandardMaterial({ color: '#b8873f', metalness: 0.8, roughness: 0.35 })),
    );
    ring.rotation.x = Math.PI / 2;
    lupa.add(ring);
    const glass = new T.Mesh(
      this.tools.track(new T.CylinderGeometry(0.74, 0.74, 0.02, 36)),
      this.tools.track(new T.MeshBasicMaterial({ color: '#0c1412', transparent: true, opacity: 0.88, depthWrite: false })),
    );
    lupa.add(glass);
    const cellGeometry = this.tools.track(new T.BoxGeometry(0.075, 0.01, 0.075));
    const cells = new T.InstancedMesh(
      cellGeometry,
      this.tools.track(new T.MeshBasicMaterial({ color: '#2c423a' })),
      256,
    );
    const m = new T.Matrix4();
    for (let r = 0; r < 16; r++)
      for (let c = 0; c < 16; c++) {
        m.makeTranslation((c - 7.5) * 0.085, 0.016, (r - 7.5) * 0.085);
        cells.setMatrixAt(r * 16 + c, m);
      }
    lupa.add(cells);
    const barMaterial = this.tools.track(new T.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.55 }));
    this.rowBar = new T.Mesh(this.tools.track(new T.BoxGeometry(1.36, 0.012, 0.075)), barMaterial);
    this.colBar = new T.Mesh(this.tools.track(new T.BoxGeometry(0.075, 0.012, 1.36)), barMaterial);
    this.cellMarker = new T.Mesh(
      this.tools.track(new T.BoxGeometry(0.1, 0.03, 0.1)),
      this.tools.track(new T.MeshBasicMaterial({ color: '#fff2c0' })),
    );
    for (const bar of [this.rowBar, this.colBar, this.cellMarker]) {
      bar.position.y = 0.024;
      lupa.add(bar);
    }
    this.labels['ras'] = this.tools.label?.(glass, 'FILA · RAS', 0, 0.02, -0.64, 0.9) as T.Object3D;
    this.labels['cas'] = this.tools.label?.(glass, 'COLUMNA · CAS', 0, 0.02, 0.66, 0.9) as T.Object3D;
    lupa.position.set(0, 1.55, 0);
    root.add(lupa);
    this.lupa = lupa;
    this.tools.onActivity?.((a) => a.memory && this.applyClassic(a, root));
    animate((t) => this.tick(t));
  }

  private applyClassic(a: StationActivity, root: T.Group): void {
    const mem = a.memory!;
    this.current = mem;
    const key = `${mem.physical}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.progress = 0;
    }
    for (const bank of this.lamps) for (const lamp of bank) lamp.visible = false;
    const show = (bank: number, value: number) =>
      this.lamps[bank].forEach((lamp, n) => {
        lamp.visible = true;
        (lamp.material as T.MeshBasicMaterial).color.set(((value >> n) & 1) === 1 ? '#7fe0b0' : '#1f4c3b');
      });
    show(mem.low.bank, mem.low.value);
    if (mem.high.bank !== mem.low.bank) show(mem.high.bank, mem.high.value);
    const chip = this.lamps[mem.low.bank][0]?.parent;
    if (chip && this.lupa) {
      const p = chip.getWorldPosition(new T.Vector3());
      root.worldToLocal(p);
      this.lupa.position.set(p.x, 1.55, p.z);
      this.lupa.visible = true;
    }
    const rowGroup = mem.low.row >> 4,
      colGroup = mem.low.col >> 4;
    if (this.rowBar) this.rowBar.position.z = (rowGroup - 7.5) * 0.085;
    if (this.colBar) this.colBar.position.x = (colGroup - 7.5) * 0.085;
    if (this.cellMarker) this.cellMarker.position.set((colGroup - 7.5) * 0.085, 0.03, (rowGroup - 7.5) * 0.085);
    const relabel = (key: string, text: string) => {
      const label = this.labels[key];
      if (label) this.tools.relabel?.(label, text);
    };
    relabel('ras', `FILA ${hex(mem.low.row, 2)}h · RAS`);
    relabel('cas', `COLUMNA ${hex(mem.low.col, 2)}h · CAS`);
    relabel('sum', `${hex(mem.segment)}h × 16 = ${hex(mem.segment * 16, 5)}h  +  ${hex(mem.offset)}h  =  ${hex(mem.physical, 5)}h`);
    relabel(
      'bus',
      `A0=${+mem.a0} BHE#=${+!mem.bhe}  ·  ${mem.cycles} ciclo${mem.cycles > 1 ? 's' : ''}  ·  también ${hex(mem.alias.segment)}:${hex(mem.alias.offset)}`,
    );
    relabel('sp', `SP = ${hex(mem.stack.segment)}:${hex(mem.stack.pointer)}  →  ${hex(mem.stack.physical, 5)}h  (cima de la pila)`);
    this.applyProgress();
  }

  /** RAS lights the row first, then CAS the column, then the cell itself. */
  private applyProgress(): void {
    const p = this.progress;
    if (this.rowBar) this.rowBar.visible = p >= 0.0;
    if (this.colBar) this.colBar.visible = p >= 0.4;
    if (this.cellMarker) this.cellMarker.visible = p >= 0.75;
  }

  private tick(t: number): void {
    const dt = t - this.lastT;
    this.lastT = t;
    this.progress = dt <= 0 || dt > 0.5 ? 1 : Math.min(1, this.progress + dt * 1.2);
    this.applyProgress();
  }

  /** Builds the DIMM overlay: eight lanes with the byte each chip serves, and the SPD marked. */
  buildDimm(parts: Map<string, T.Object3D>): void {
    const module = parts.get('dimm');
    if (!module) return;
    for (let n = 0; n < 8; n++) {
      const chip = parts.get('dimm-chip-' + n);
      if (!chip) continue;
      const group = new T.Group();
      group.rotation.x = Math.PI / 2;
      group.position.set(0, -0.5, 0.07);
      group.userData['noBounds'] = true;
      chip.add(group);
      this.lanes.push(this.tools.label?.(group, `B${n} --`, 0, 0, 0, 0.62) as T.Object3D);
    }
    const spd = parts.get('spd');
    if (spd) {
      this.spdLamp = new T.Mesh(
        this.tools.track(new T.SphereGeometry(0.05, 10, 8)),
        this.tools.track(new T.MeshBasicMaterial({ color: '#ffd27a' })),
      );
      this.spdLamp.position.set(0, 0.17, 0);
      this.spdLamp.name = 'spd-lamp';
      this.spdLamp.userData['noBounds'] = true;
      spd.add(this.spdLamp);
    }
    this.tools.onActivity?.((a) => {
      const mem = a.memory;
      if (!mem) return;
      this.current = mem;
      this.lanes.forEach((lane, n) => {
        const inWord = mem.burstBase + n === mem.physical || mem.burstBase + n === mem.physical + 1;
        this.tools.relabel?.(lane, `B${n} ${hex(mem.burst[n], 2)}${inWord ? ' ◂' : ''}`);
      });
    });
  }
}
