import * as THREE from 'three';
import { LABEL_HEIGHT, LABEL_WIDTH, paintLabel } from './label-canvas';

interface LabelRecord {
  canvas: HTMLCanvasElement;
  text: string;
}

/** Printed legends placed on the bench. Canvases are kept so they can be repainted when fonts arrive. */
export class SceneLabels {
  private records = new Set<LabelRecord>();
  private disposed = false;

  constructor(private readonly track: <G extends THREE.Material | THREE.BufferGeometry | THREE.Texture>(r: G) => G) {
    void document.fonts?.ready.then(() => {
      if (!this.disposed) for (const r of this.records) paintLabel(r.canvas, r.text);
    });
  }

  create(parent: THREE.Object3D, text: string, x: number, y: number, z: number, width = 1.3): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = LABEL_WIDTH;
    canvas.height = LABEL_HEIGHT;
    paintLabel(canvas, text);
    const record = { canvas, text };
    this.records.add(record);
    const texture = this.track(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = this.track(
      new THREE.MeshBasicMaterial({
        map: texture,
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
    label.rotation.x = -Math.PI / 2;
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
      paintLabel(record.canvas, text);
      const material = (o as THREE.Mesh).material as THREE.MeshBasicMaterial;
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
