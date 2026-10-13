import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';
import { LABEL_FAMILY } from '../textures/label-canvas';

/** Chronoscope base: its underside is the station origin, so the rig rests on the mat. */
export const CHRONOSCOPE_BASE = 0;

const FRAMES = 16;
/** Ellipse the frames climb around the spindle; the spindle sits at the centre. */
const RX = 2.35;
const RZ = 1.65;

/**
 * Chronoscope: a base plate with a central spindle, sixteen history frames climbing around it on
 * arms, and a dial whose needle sweeps while the rig runs. The frame in the timeline's current
 * slot glows, so the station reads as a timeline with a playhead.
 */
export class ChronoscopeModel extends WorkshopGeometry {
  build(
    root: T.Group,
    animate: (fn: (t: number) => void) => void,
  ): { historySlots: T.Mesh[] } {
    const base = this.tools.material('chrono-base', '#2a2e33', 0.5, 0.35, { finish: 'paint', exposed: '#6d7075', wear: 0.3, dirt: 0.4, size: 128 });
    const brass = this.tools.material('chrono-brass', '#a8854f', 0.35, 0.8, { finish: 'steel', wear: 0.3, size: 64 });
    this.box(root, 6.2, 0.2, 5.6, 0, 0.1, 0, base);
    this.cylinder(root, 0.12, 2.7, 0, 0.2 + 1.35, 0, brass);
    this.cylinder(root, 0.22, 0.12, 0, 2.98, 0, brass);
    const historySlots: T.Mesh[] = [];
    const frame = this.tools.material('time', '#6a6885', 0.43, 0.5);
    for (let i = 0; i < FRAMES; i++) {
      const angle = i * 0.48;
      const x = Math.cos(angle) * RX,
        z = Math.sin(angle) * RZ,
        y = 0.4 + i * 0.15;
      // Each frame has its own material clone, so the playhead can light one of them alone.
      const material = this.tools.track(frame.clone());
      const tile = this.box(root, 0.7, 0.18, 0.85, x, y, z, material);
      tile.userData['part'] = 'frame-' + i;
      historySlots.push(tile);
      this.tools.label(tile, 'INICIO', 0, 0.1, 0, 0.65);
      // Arm from the spindle to the frame, lying horizontal at the frame's height.
      const length = Math.hypot(x, z);
      const arm = this.mesh(root, this.tools.track(new T.BoxGeometry(length, 0.045, 0.045)), base, x / 2, y - 0.02, z / 2);
      arm.rotation.y = -Math.atan2(z, x);
    }
    this.dial(root, animate, brass);
    this.playhead(historySlots, animate);
    return { historySlots };
  }

  /** The face is painted once (after the monospace face loads); only the needle moves. */
  private dial(root: T.Group, animate: (fn: (t: number) => void) => void, brass: T.Material): void {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    const paint = () => {
      if (!context) return;
      context.clearRect(0, 0, 256, 256);
      context.fillStyle = '#e9e1c8';
      context.beginPath();
      context.arc(128, 128, 126, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#3a3c3f';
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
        const long = i % 5 === 0;
        context.lineWidth = long ? 4 : 2;
        context.beginPath();
        context.moveTo(128 + Math.cos(a) * (long ? 96 : 104), 128 + Math.sin(a) * (long ? 96 : 104));
        context.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116);
        context.stroke();
      }
      context.fillStyle = '#2a2c2f';
      context.font = `600 26px ${LABEL_FAMILY}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      for (const [n, value] of [[0, '0'], [1, '15'], [2, '30'], [3, '45']] as const) {
        const a = (n / 4) * Math.PI * 2 - Math.PI / 2;
        context.fillText(value, 128 + Math.cos(a) * 74, 128 + Math.sin(a) * 74);
      }
    };
    paint();
    void document.fonts?.ready.then(paint);
    const texture = this.tools.track(new T.CanvasTexture(canvas));
    texture.colorSpace = T.SRGBColorSpace;
    const face = new T.Mesh(
      this.tools.track(new T.CircleGeometry(1.1, 48)),
      this.tools.track(new T.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0 })),
    );
    face.rotation.x = -Math.PI / 2;
    face.position.set(-3.7, 0.205, 0);
    root.add(face);
    const needle = new T.Group();
    needle.position.set(-3.7, 0.23, 0);
    root.add(needle);
    const hand = this.tools.track(
      new T.MeshStandardMaterial({ color: '#c0392b', roughness: 0.4, metalness: 0.2 }),
    );
    const blade = this.mesh(needle, this.tools.track(new T.BoxGeometry(0.05, 0.02, 0.95)), hand, 0, 0, 0.42);
    blade.userData['dynamic'] = true;
    this.cylinder(needle, 0.07, 0.04, 0, 0.02, 0, brass);
    animate((t) => {
      // One turn every twelve seconds: the needle reads the time the timeline has covered.
      needle.rotation.y = -(t / 12) * Math.PI * 2;
    });
  }

  /** A soft glow travels along the frames, so the current slot is visible even when nothing changes. */
  private playhead(slots: T.Mesh[], animate: (fn: (t: number) => void) => void): void {
    animate((t) => {
      const lit = Math.floor(t * 2) % FRAMES;
      slots.forEach((slot, i) => {
        const material = slot.material as T.MeshStandardMaterial;
        material.emissive.set(i === lit ? '#c8c2ff' : '#000000');
        material.emissiveIntensity = i === lit ? 0.5 + 0.4 * Math.sin(t * 8) : 0;
      });
    });
  }
}

