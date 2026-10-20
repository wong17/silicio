import * as THREE from 'three';

/** A name shown next to its piece: text, full name for assistive technology and offset from the anchor. */
export interface LabelView {
  id: string;
  text: string;
  fullName: string;
  selected: boolean;
  /** Top-left of the plate relative to the anchor, CSS pixels. */
  dx: number;
  dy: number;
  width: number;
  lead: boolean;
}

interface LabelNode {
  plate: HTMLButtonElement;
  lead: HTMLSpanElement;
  view: LabelView;
}

/**
 * Plates over the canvas, one per named piece. The engine owns them (like a CSS2D layer): the set changes a
 * few times per second, the positions every frame, and none of it runs through Angular change detection.
 * They are a visual aid; the piece tray and the inspector are the accessible way to choose a piece.
 */
export class AnnotationLayer {
  private readonly nodes = new Map<string, LabelNode>();

  constructor(
    private readonly container: HTMLElement,
    private readonly onPick: (id: string) => void,
  ) {
    container.setAttribute('aria-hidden', 'true');
  }

  setLabels(labels: readonly LabelView[]): void {
    const keep = new Set(labels.map((l) => l.id));
    for (const [id, node] of this.nodes) {
      if (keep.has(id)) continue;
      node.plate.remove();
      node.lead.remove();
      this.nodes.delete(id);
    }
    for (const view of labels) {
      let node = this.nodes.get(view.id);
      if (!node) {
        const lead = document.createElement('span');
        lead.className = 'scene-label-lead';
        const plate = document.createElement('button');
        plate.type = 'button';
        plate.tabIndex = -1;
        plate.className = 'scene-label';
        plate.addEventListener('click', () => this.onPick(view.id));
        this.container.append(lead, plate);
        node = { plate, lead, view };
        this.nodes.set(view.id, node);
      }
      node.view = view;
      if (node.plate.textContent !== view.text) node.plate.textContent = view.text;
      node.plate.title = view.fullName;
      node.plate.classList.toggle('selected', view.selected);
      node.lead.hidden = !view.lead;
    }
  }

  /** Moves every plate with its anchor; called once per rendered frame. */
  position(anchors: ReadonlyMap<string, { x: number; y: number }>): void {
    for (const [id, node] of this.nodes) {
      const a = anchors.get(id);
      if (!a) {
        node.plate.style.visibility = 'hidden';
        node.lead.style.visibility = 'hidden';
        continue;
      }
      const { dx, dy, lead } = node.view;
      node.plate.style.visibility = '';
      node.plate.style.transform = `translate(${Math.round(a.x + dx)}px, ${Math.round(a.y + dy)}px)`;
      if (!lead) continue;
      // The guide runs from the anchor to the nearest point of the plate.
      const px = Math.min(Math.max(a.x, a.x + dx), a.x + dx + node.plate.offsetWidth);
      const py = Math.min(Math.max(a.y, a.y + dy), a.y + dy + node.plate.offsetHeight);
      const length = Math.hypot(px - a.x, py - a.y);
      const angle = Math.atan2(py - a.y, px - a.x);
      node.lead.style.visibility = '';
      node.lead.style.width = `${Math.round(length)}px`;
      node.lead.style.transform = `translate(${Math.round(a.x)}px, ${Math.round(a.y)}px) rotate(${angle}rad)`;
    }
  }

  clear(): void {
    this.setLabels([]);
  }

  dispose(): void {
    this.clear();
  }
}

/** Small round markers drawn in the 3D scene on each labelled piece; the geometry in front hides them. */
export class AnnotationMarkers {
  readonly points: THREE.Points;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material: THREE.PointsMaterial;
  private readonly texture: THREE.Texture;
  private capacity = 0;

  constructor() {
    this.texture = markerTexture();
    this.material = new THREE.PointsMaterial({
      size: 10,
      sizeAttenuation: false,
      map: this.texture,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.2,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this.points.name = 'annotation-markers';
  }

  /** `size` is in device pixels: CSS size times the renderer pixel ratio. */
  update(positions: readonly THREE.Vector3[], colors: readonly THREE.Color[], size: number): void {
    if (positions.length > this.capacity) {
      this.capacity = Math.max(positions.length, 16);
      this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.capacity * 3), 3));
      this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.capacity * 3), 3));
    }
    const position = this.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    const color = this.geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (!position || !color) return;
    positions.forEach((p, i) => position.setXYZ(i, p.x, p.y, p.z));
    colors.forEach((c, i) => color.setXYZ(i, c.r, c.g, c.b));
    position.needsUpdate = true;
    color.needsUpdate = true;
    this.geometry.setDrawRange(0, positions.length);
    this.material.size = size;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}

/** A disc with a dark rim, so the marker reads on light and dark parts alike. */
function markerTexture(): THREE.Texture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (g) {
    g.beginPath();
    g.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    g.fillStyle = '#101314';
    g.fill();
    g.beginPath();
    g.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
