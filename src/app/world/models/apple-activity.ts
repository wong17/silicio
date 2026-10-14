import * as T from 'three';
import { APPLE_UNITS, BUFFER_STAGE_UNITS } from '../../content/apple-m5';
import type { StationActivity } from '../../laboratory/station-activity';
import type { WorkshopTools } from '../workshop-tools';
import { APPLE_PARTS } from './station-layouts';

const TILE_TOP = 0.14;

/**
 * Shared-buffer dependency of the SoC, drawn from StationActivity. B0 and B1 are two physical slabs on
 * the unified-memory strip and they never move; what changes is which unit is linked to them. The
 * contrast switch shows the alternative, where each unit has its own memory and B0 is copied across.
 */
export class AppleActivityView {
  private readonly links = new Map<string, T.Mesh>();
  private b0?: T.Mesh;
  private b1?: T.Mesh;
  private readonly separate: T.Object3D[] = [];
  private copy?: T.Mesh;
  private copyTarget = 0;
  private copyX = 0;
  private lastT = 0;
  private stage = 0;
  private completed = false;
  private isSeparate = false;
  readonly coreMeshes: T.Mesh[] = [];

  constructor(private readonly tools: WorkshopTools) {}

  /** Positions of the two buffer slabs, for tests (they must stay put across stages). */
  get bufferPositions(): { b0: T.Vector3; b1: T.Vector3 } | undefined {
    return this.b0 && this.b1 ? { b0: this.b0.position.clone(), b1: this.b1.position.clone() } : undefined;
  }

  build(parts: Map<string, T.Object3D>, animate: (fn: (t: number) => void) => void): void {
    this.buildCores(parts);
    this.buildBuffers(parts);
    animate((t) => this.tick(t));
    this.tools.onActivity?.((a) => this.apply(a));
  }

  private buildCores(parts: Map<string, T.Object3D>): void {
    for (const unit of APPLE_UNITS) {
      if (!unit.cores) continue;
      const tile = parts.get(unit.id);
      const layout = APPLE_PARTS.find((p) => p.id === unit.id);
      if (!tile || !layout) continue;
      const columns = unit.cores <= 6 ? Math.ceil(unit.cores / 2) : Math.ceil(unit.cores / 2);
      const rows = Math.ceil(unit.cores / columns);
      const cw = (layout.w * 0.8) / columns,
        cd = (layout.d * 0.5) / rows;
      const material = this.tools.track(
        new T.MeshStandardMaterial({ color: unit.color, roughness: 0.4, metalness: 0.3, emissive: '#000000' }),
      );
      for (let i = 0; i < unit.cores; i++) {
        const col = i % columns,
          row = Math.floor(i / columns);
        const core = new T.Mesh(
          this.tools.track(new T.BoxGeometry(cw * 0.78, 0.03, cd * 0.7)),
          this.tools.track(material.clone()),
        );
        core.position.set(
          -layout.w * 0.4 + cw * (col + 0.5),
          TILE_TOP + 0.012,
          layout.d * 0.1 - layout.d * 0.2 + cd * (row + 0.5) - (rows * cd) / 2 + layout.d * 0.1,
        );
        core.name = `core-${unit.id}-${i}`;
        core.userData['noBounds'] = true;
        tile.add(core);
        this.coreMeshes.push(core);
      }
    }
  }

  private buildBuffers(parts: Map<string, T.Object3D>): void {
    const unified = parts.get('unified');
    const unifiedLayout = APPLE_PARTS.find((p) => p.id === 'unified');
    if (!unified || !unifiedLayout) return;
    const slab = (name: string, x: number, color: string) => {
      const m = new T.Mesh(
        this.tools.track(new T.BoxGeometry(1.0, 0.07, 0.34)),
        this.tools.track(new T.MeshStandardMaterial({ color, roughness: 0.4, emissive: '#000000' })),
      );
      m.position.set(x, TILE_TOP + 0.04, 0);
      m.name = name;
      m.userData['part'] = undefined;
      unified.add(m);
      this.tools.label?.(m, name === 'buffer-b0' ? 'B0' : 'B1', 0, 0.045, 0, 0.5);
      return m;
    };
    this.b0 = slab('buffer-b0', -0.85, '#c9a24a');
    this.b1 = slab('buffer-b1', 0.85, '#7ea68a');

    // Links run from each unit tile to the strip, drawn on the strip's own frame so they rise with it.
    const linkMaterial = this.tools.track(new T.MeshBasicMaterial({ color: '#ffd27a' }));
    for (const unit of ['performance', 'gpu']) {
      const layout = APPLE_PARTS.find((p) => p.id === unit);
      if (!layout) continue;
      for (const [target, buffer] of [['b0', this.b0], ['b1', this.b1]] as const) {
        const dx = layout.x - buffer.position.x - unifiedLayout.x;
        const dz = layout.z - unifiedLayout.z;
        const length = Math.hypot(dx, dz);
        const link = new T.Mesh(this.tools.track(new T.BoxGeometry(length, 0.02, 0.04)), linkMaterial);
        link.position.set(buffer.position.x + dx / 2, TILE_TOP + 0.09, dz / 2);
        link.rotation.y = -Math.atan2(dz, dx);
        link.visible = false;
        link.name = `link-${unit}-${target}`;
        link.userData['noBounds'] = true;
        unified.add(link);
        this.links.set(`${unit}:${target}`, link);
      }
    }

    // Contrast mode: two separate memories and a copy of B0 that travels between them.
    const memory = (id: string, x: number, color: string) => {
      const m = new T.Mesh(
        this.tools.track(new T.BoxGeometry(1.4, 0.12, 0.55)),
        this.tools.track(new T.MeshStandardMaterial({ color, roughness: 0.5 })),
      );
      m.position.set(x, TILE_TOP + 0.08, 0.62);
      m.visible = false;
      m.name = id;
      m.userData['noBounds'] = true;
      unified.add(m);
      this.tools.label?.(m, id === 'memory-cpu' ? 'MEM CPU' : 'MEM GPU', 0, 0.07, 0, 0.9);
      this.separate.push(m);
    };
    memory('memory-cpu', -1.1, '#6b5b3a');
    memory('memory-gpu', 1.1, '#3f5a6b');
    this.copy = new T.Mesh(
      this.tools.track(new T.BoxGeometry(0.7, 0.06, 0.3)),
      this.tools.track(new T.MeshStandardMaterial({ color: '#e0b84f', emissive: '#6b4f10', roughness: 0.4 })),
    );
    this.copy.position.set(-1.1, TILE_TOP + 0.19, 0.62);
    this.copy.visible = false;
    this.copy.name = 'buffer-b0-copy';
    this.copy.userData['noBounds'] = true;
    unified.add(this.copy);
    this.separate.push(this.copy);
    this.tools.label?.(this.copy, "B0'", 0, 0.04, 0, 0.4);
  }

  apply(a: StationActivity): void {
    const buffer = a.buffer;
    this.stage = buffer?.stage ?? 0;
    this.completed = buffer?.completed ?? false;
    this.isSeparate = buffer?.separate ?? false;
    const active = a.blocks;
    for (const core of this.coreMeshes) {
      const unit = core.name.split('-')[1];
      const material = core.material as T.MeshStandardMaterial;
      const lit = active.includes(unit) && unit !== 'unified';
      material.emissive.set(lit ? '#ffcf70' : '#000000');
      material.emissiveIntensity = lit ? 0.6 : 0;
    }
    const wired = this.stage === 0 ? ['performance:b0'] : this.stage === 1 ? ['gpu:b0', 'gpu:b1'] : ['performance:b1'];
    for (const [key, link] of this.links) link.visible = !this.isSeparate && !!buffer && wired.includes(key);
    for (const m of this.separate) m.visible = this.isSeparate && !!buffer;
    // In the shared design B1 is only readable once the completion signal arrived.
    if (this.b1) (this.b1.material as T.MeshStandardMaterial).emissive.set(this.completed ? '#2f7a4a' : '#000000');
    if (this.b0) (this.b0.material as T.MeshStandardMaterial).emissive.set(this.stage === 0 ? '#6b4f10' : '#000000');
    this.copyTarget = this.stage === 0 ? -1.1 : 1.1;
  }

  /** Eases the copy toward its memory; with a frozen clock (reduced motion) it lands at once. */
  private tick(t: number): void {
    const dt = t - this.lastT;
    this.lastT = t;
    if (!this.copy) return;
    this.copyX = dt <= 0 || dt > 0.5 ? this.copyTarget : this.copyX + (this.copyTarget - this.copyX) * (1 - Math.exp(-dt * 6));
    this.copy.position.x = this.copyX;
  }
}

export { BUFFER_STAGE_UNITS };
