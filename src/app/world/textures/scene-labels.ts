import * as THREE from 'three';
import { RENDER_ORDER } from '../render-order';
import { pickInk, hexLuminance, INK, type LabelOptions } from './label-ink';
import { LABEL_HEIGHT, LABEL_WIDTH, paintLabel } from './label-canvas';

interface LabelRecord {
  canvas: HTMLCanvasElement;
  text: string;
  ink: string;
  outline: string;
  plate: boolean;
  maxSize: number;
}

/** Relative luminance of the surface a legend is printed on; unknown hosts count as dark, as before. */
export function surfaceLuminance(parent: THREE.Object3D, host?: string): number {
  if (host) return hexLuminance(host);
  const material = (parent as THREE.Mesh).material;
  const m = Array.isArray(material) ? material[0] : material;
  const color = (m as THREE.MeshStandardMaterial | undefined)?.color;
  return color ? 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b : 0.02;
}

/** Printed legends placed on the bench. Canvases are kept so they can be repainted when fonts arrive. */
export class SceneLabels {
  private records = new Set<LabelRecord>();
  private disposed = false;

  constructor(private readonly track: <G extends THREE.Material | THREE.BufferGeometry | THREE.Texture>(r: G) => G) {
    void document.fonts?.ready.then(() => {
      if (!this.disposed) for (const r of this.records) paintLabel(r.canvas, r.text, r.ink, r.outline, r.plate, r.maxSize);
    });
  }

  create(
    parent: THREE.Object3D,
    text: string,
    x: number,
    y: number,
    z: number,
    width = 1.3,
    options: LabelOptions = {},
  ): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = LABEL_WIDTH;
    canvas.height = LABEL_HEIGHT;
    const mode = options.ink ?? 'auto';
    const inks: { ink: string; outline: string } =
      mode === 'light'
        ? { ink: INK.light, outline: INK.dark }
        : mode === 'dark'
          ? { ink: INK.dark, outline: INK.light }
          : pickInk(surfaceLuminance(parent, options.host));
    const plate = options.plate ?? false;
    const maxSize = options.maxSize ?? 26;
    if (options.color) inks.ink = options.color;
    paintLabel(canvas, text, inks.ink, inks.outline, plate, maxSize);
    const record = { canvas, text, ...inks, plate, maxSize };
    this.records.add(record);
    const texture = this.track(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const material = this.track(
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.85,
        metalness: 0,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    const label = new THREE.Mesh(
      this.track(new THREE.PlaneGeometry(width, (width * LABEL_HEIGHT) / LABEL_WIDTH)),
      material,
    );
    label.userData['labelRecord'] = record;
    label.renderOrder = RENDER_ORDER.label;
    label.rotation.x = options.upright ? 0 : -Math.PI / 2;
    label.position.set(x, y, z);
    parent.add(label);
    return label;
  }

  /** Repaints the legend of a label already in the scene (memory cells, history slots). */
  rewrite(object: THREE.Object3D, text: string): void {
    object.traverse((o) => {
      const record = o.userData['labelRecord'] as LabelRecord | undefined;
      if (!record || record.text === text) return;
      record.text = text;
      paintLabel(record.canvas, text, record.ink, record.outline, record.plate, record.maxSize);
      const material = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (material.map) material.map.needsUpdate = true;
    });
  }

  /** Forgets the legends of a subtree that is being discarded with its geometry. */
  release(object: THREE.Object3D): void {
    object.traverse((o) => {
      const record = o.userData['labelRecord'] as LabelRecord | undefined;
      if (record) this.records.delete(record);
    });
  }

  dispose(): void {
    this.disposed = true;
    this.records.clear();
  }
}
