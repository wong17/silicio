import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WorkshopGeometry } from './workshop-geometry';
import { BENCH } from './bench-layout';
import { CLASSIC_BOARD_BASE } from './intel-2164a-memory.model';
import { KINGSTON_BOARD_BASE } from './kingston-dimm.model';
import { MachineBoardModel, MACHINE_BOARD_BASE } from './machine-board.model';
import { ChronoscopeModel, CHRONOSCOPE_BASE } from './chronoscope.model';
import { ElectronicsWorkshop } from '../electronics-workshop';
import { MemoryModels } from './memory-models';
import { APPLE_PARTS, type Part } from './station-layouts';
import type { Section } from '../scene-inputs';
export class StationBuilder extends WorkshopGeometry {
  protected override box(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      this.tools.track(new RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * 0.16)),
      material,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  private tiles(root: THREE.Group, parts: Map<string, THREE.Object3D>, definitions: Part[]): void {
    for (const p of definitions) {
      const group = new THREE.Group();
      group.position.set(p.x, 0.96, p.z);
      group.userData['part'] = p.id;
      group.userData['restY'] = 0.96;
      this.box(group, p.w, 0.25, p.d, 0, 0, 0, this.tools.material(p.id, p.color, 0.52, 0.36));
      // Fine etched paths establish die scale without faking transistor-level accuracy.
      for (let n = 0; n < 5; n++)
        this.box(
          group,
          p.w * 0.82,
          0.01,
          0.017,
          0,
          0.135,
          -p.d * 0.34 + n * p.d * 0.14,
          this.tools.material('etch', '#d8ba7b', 0.45, 0.8),
        );
      this.tools.label(group, p.label, 0, 0.158, 0, p.w * 0.85);
      const traces = new THREE.Group();
      const geom = this.tools.track(new THREE.BoxGeometry(0.025, 0.008, 0.035));
      const cells = new THREE.InstancedMesh(
        geom,
        this.tools.material('die-cells', '#8b907e', 0.72, 0.38),
        48,
      );
      const matrix = new THREE.Matrix4();
      for (let n = 0; n < 48; n++) {
        matrix.makeTranslation(
          -p.w * 0.37 + (n % 12) * p.w * 0.065,
          0.143,
          -p.d * 0.31 + Math.floor(n / 12) * p.d * 0.18,
        );
        cells.setMatrixAt(n, matrix);
      }
      cells.userData['detail'] = true;
      group.add(cells);

      parts.set(p.id, group);
      root.add(group);
    }
  }
  build(
    section: Section,
    variant: 'classic' | 'dimm',
    root: THREE.Group,
    parts: Map<string, THREE.Object3D>,
  ): { historySlots: THREE.Mesh[]; packet: THREE.Mesh; datum: number } {
    // Height of the station's bearing surface, the underside of its board: the engine lowers it onto the mat.
    let datum: number = BENCH.boardBase;
    const historySlots: THREE.Mesh[] = [];
    const green = this.tools.material('pcb', '#314d40', 0.7, 0.19);
    const ceramic = this.tools.material('ceramic', '#b9ad83', 0.58, 0.03);
    const dark = this.tools.material('package', '#202426', 0.6, 0.25);
    if (section === '8086' || section === 'atrium') {
      new ElectronicsWorkshop(this.tools).cpu(root, parts);
      if (section === '8086')
        this.tiles(root, parts, [
          { id: 'alu', label: 'ALU / 16 BIT', color: '#a97d45', x: -1.95, z: 0.1, w: 1.15, d: 0.8 },
          {
            id: 'registers',
            label: 'AX BX CX DX',
            color: '#496a5a',
            x: -0.48,
            z: 0.1,
            w: 1.5,
            d: 0.8,
          },
          { id: 'control', label: 'CONTROL', color: '#6d7982', x: 1, z: 0.1, w: 1.2, d: 0.8 },
          { id: 'biu', label: 'BIU', color: '#9d7450', x: 2.15, z: 0, w: 0.7, d: 1.05 },
          {
            id: 'queue',
            label: 'COLA / 6 BYTES',
            color: '#6e687e',
            x: -0.55,
            z: -0.62,
            w: 3.85,
            d: 0.26,
          },
        ]);
    } else if (section === 'apple') {
      new ElectronicsWorkshop(this.tools).soc(root);
      this.tiles(root, parts, APPLE_PARTS);
      const lid = this.box(root, 4.65, 0.15, 4.9, 0, 1.23, 0.2, dark);
      lid.userData['part'] = 'lid';
      lid.userData['restY'] = 1.23;
      parts.set('lid', lid);
      this.tools.label(lid, 'APPLE SILICON / SoC', 0, 0.08, 0, 3.5);
    } else if (section === 'memory') {
      const models = new MemoryModels(this.tools);
      if (variant === 'classic') models.classic(root, parts);
      else models.dimm(root, parts);
      datum = variant === 'classic' ? CLASSIC_BOARD_BASE : KINGSTON_BOARD_BASE;
      if (variant === 'classic') {
        const logical = new THREE.Group();
        logical.userData['part'] = 'memory-board';
        root.add(logical);
        this.tools.label(logical, 'VENTANA LÓGICA / 32 BYTES', 0, CLASSIC_BOARD_BASE + 0.006, 3.65, 5.8);
        for (let n = 0; n < 32; n++) {
          const cell = this.box(
            logical,
            0.42,
            0.06,
            0.43,
            ((n % 16) - 7.5) * 0.46,
            CLASSIC_BOARD_BASE + 0.03,
            4.15 + Math.floor(n / 16) * 0.48,
            this.tools.material('logical-cell', '#35483c', 0.9, 0.02),
          );
          cell.userData['part'] = 'cell-' + n;
          parts.set('cell-' + n, cell);
          this.tools.label(cell, '00', 0, 0.035, 0, 0.35);
        }
      }
    } else if (section === 'time') {
      // Chronoscope: a rig of its own. Its frames are the history slots the page writes into.
      const rig = new ChronoscopeModel(this.tools).build(root, (fn) => this.tools.animate(fn, 'subject'));
      historySlots.push(...rig.historySlots);
      datum = CHRONOSCOPE_BASE;
    } else {
      // La máquina: a board with three chips, copper buses, and the status lamps that run with the bus.
      new MachineBoardModel(this.tools).build(root, parts, (fn) => this.tools.animate(fn, 'subject'));
      datum = MACHINE_BOARD_BASE;
    }
    const packet = new THREE.Mesh(
      this.tools.track(new THREE.SphereGeometry(0.095, 16, 8)),
      this.tools.track(new THREE.MeshBasicMaterial({ color: '#ffe9a7' })),
    );
    packet.visible = false;
    root.add(packet);
    return { historySlots, packet, datum };
  }
}
