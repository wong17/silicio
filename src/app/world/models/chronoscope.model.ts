import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';
import { LABEL_FAMILY } from '../textures/label-canvas';
import {
  BRANCH_SLOTS,
  branchFrames,
  cursorSlot,
  EMPTY_TIMELINE,
  slotVisible,
  tapeOffset,
  TAPE_PITCH,
  TAPE_SLOTS,
  type TimelineState,
} from '../timeline-layout';

/** Chronoscope base: its underside is the station origin, so the rig rests on the mat. */
export const CHRONOSCOPE_BASE = 0;

const MAIN_Z = -0.9;
const BRANCH_Z = 0.55;
const FRAME_Y = 0.42;

export interface ChronoscopeRig {
  historySlots: T.Mesh[];
  /** Feeds the cursor, the total and the alternative lane; the rig animates toward them. */
  setTimeline(state: TimelineState, mainTexts: string[]): void;
  /** The branch frames, for tests and for the engine to hide them with the lane. */
  branchSlots: T.Mesh[];
}

/**
 * Chronoscope as a film strip. Every executed instruction is a frame with its mnemonic and the register
 * it changed; a fixed window marks the real cursor, and the tape slides so the cursor frame sits in it.
 * An archived alternative opens a second lane that forks from its origin frame. The dial needle reads
 * step over total, never the clock.
 */
export class ChronoscopeModel extends WorkshopGeometry {
  build(
    root: T.Group,
    parts: Map<string, T.Object3D>,
    animate: (fn: (t: number) => void) => void,
  ): ChronoscopeRig {
    const base = this.tools.material('chrono-base', '#2a2e33', 0.5, 0.35, { finish: 'paint', exposed: '#6d7075', wear: 0.2, dirt: 0.4, size: 128 });
    const brass = this.tools.material('chrono-brass', '#a8854f', 0.35, 0.8, { finish: 'steel', wear: 0.3, size: 64 });
    const named = (id: string): T.Group => {
      const group = new T.Group();
      group.userData['part'] = id;
      root.add(group);
      parts.set(id, group);
      return group;
    };

    const plate = named('chrono-base');
    this.box(plate, 8.0, 0.2, 5.2, 0, 0.1, 0, base);
    // Right of the dial (x -3.35..-1.45 at the same z), so the two never share the plate surface.
    this.tools.label(plate, 'CRONOSCOPIO · CINTA DE PASOS', 1.1, 0.206, 2.3, 4.2);

    const reels = named('chrono-reel');
    for (const x of [-3.9, 3.9]) {
      this.cylinder(reels, 0.55, 0.3, x, 0.35, MAIN_Z, brass);
      this.cylinder(reels, 0.12, 0.45, x, 0.58, MAIN_Z, base);
    }

    // The tape: a strip under the frames, long enough to span the sixteen slots as it slides.
    const tape = named('chrono-tape');
    tape.position.set(0, 0, MAIN_Z);
    const strip = this.mesh(
      tape,
      this.tools.track(new T.BoxGeometry(TAPE_SLOTS * TAPE_PITCH, 0.03, 0.98)),
      this.tools.track(new T.MeshStandardMaterial({ color: '#1b1d20', roughness: 0.7 })),
      ((TAPE_SLOTS - 1) * TAPE_PITCH) / 2,
      0.3,
      0,
    );
    strip.userData['dynamic'] = true;

    const frameMaterial = this.tools.material('time', '#9c7a45', 0.45, 0.4);
    const historySlots: T.Mesh[] = [];
    for (let i = 0; i < TAPE_SLOTS; i++) {
      // Each frame has its own material clone, so the cursor frame can glow alone.
      const material = this.tools.track(frameMaterial.clone());
      const tile = this.box(tape, 0.8, 0.12, 0.72, i * TAPE_PITCH, FRAME_Y, 0, material);
      tile.userData['part'] = 'frame-' + i;
      tile.userData['dynamic'] = true;
      tile.userData['textLabel'] = this.tools.label(tile, 'INICIO', 0, 0.072, -0.13, 0.74);
      tile.userData['changeLabel'] = this.tools.label(tile, '', 0, 0.072, 0.16, 0.74);
      historySlots.push(tile);
    }

    // Second lane for the archived alternative; frames hide until a branch exists.
    const branch = named('chrono-branch');
    const lane = new T.Group();
    lane.position.set(0, 0, BRANCH_Z);
    branch.add(lane);
    const branchMaterial = this.tools.material('time-branch', '#6f6a96', 0.45, 0.4);
    const branchSlots: T.Mesh[] = [];
    for (let i = 0; i < TAPE_SLOTS && branchSlots.length < BRANCH_SLOTS * 2; i++) {
      const material = this.tools.track(branchMaterial.clone());
      const tile = this.box(lane, 0.8, 0.12, 0.72, i * TAPE_PITCH, FRAME_Y, 0, material);
      tile.visible = false;
      tile.userData['dynamic'] = true;
      tile.userData['textLabel'] = this.tools.label(tile, '', 0, 0.072, -0.13, 0.74);
      branchSlots.push(tile);
    }

    // Fixed window: a frame of brass bars around the cursor position.
    const window = named('chrono-window');
    const windowZ = MAIN_Z;
    for (const dz of [-0.5, 0.5]) this.box(window, 1.05, 0.06, 0.05, 0, FRAME_Y + 0.1, windowZ + dz, brass);
    for (const dx of [-0.52, 0.52]) this.box(window, 0.05, 0.06, 1.05, dx, FRAME_Y + 0.1, windowZ, brass);
    this.tools.label(window, 'CURSOR', 0, 0.1, windowZ - 0.78 - 0.1, 0.9);

    const rig = this.dial(named('chrono-dial'), brass);
    let timeline: TimelineState = EMPTY_TIMELINE;
    let mainTexts: string[] = [];
    let offset = tapeOffset(timeline);
    let lastT = 0;
    let needleTarget = 0;
    animate((t) => {
      const dt = t - lastT;
      lastT = t;
      const target = tapeOffset(timeline);
      // With no elapsed time (reduced motion freezes the clock) the tape lands on its frame at once.
      offset = dt <= 0 || dt > 0.5 ? target : offset + (target - offset) * (1 - Math.exp(-dt * 9));
      tape.position.x = offset;
      lane.position.x = offset;
      const cursor = cursorSlot(timeline);
      historySlots.forEach((slot, i) => {
        const material = slot.material as T.MeshStandardMaterial;
        slot.visible = slot.userData['filled'] === true && slotVisible(i, timeline);
        const lit = timeline.cursor >= 0 && i === cursor;
        material.emissive.set(lit ? '#ffcf70' : '#000000');
        material.emissiveIntensity = lit ? 0.55 : 0;
      });
      const frames = branchFrames(timeline, mainTexts);
      branchSlots.forEach((slot, n) => {
        const f = frames[n];
        slot.visible = !!f && slotVisible(f.slot, timeline);
        if (!f) return;
        slot.position.x = f.slot * TAPE_PITCH;
        const material = slot.material as T.MeshStandardMaterial;
        material.emissive.set(f.differs ? '#ffb347' : '#000000');
        material.emissiveIntensity = f.differs ? 0.45 : 0;
      });
      const progress = timeline.total ? (timeline.cursor + 1) / timeline.total : 0;
      needleTarget = progress * Math.PI * 1.5 - Math.PI * 0.75;
      rig.needle.rotation.y = dt <= 0 ? -needleTarget : rig.needle.rotation.y + (-needleTarget - rig.needle.rotation.y) * (1 - Math.exp(-Math.max(dt, 0) * 8));
    });

    return {
      historySlots,
      branchSlots,
      setTimeline: (state, texts) => {
        timeline = state;
        mainTexts = texts;
        const frames = branchFrames(state, texts);
        branchSlots.forEach((slot, n) => {
          const f = frames[n];
          const label = slot.userData['textLabel'] as T.Object3D | undefined;
          if (label && f) this.tools.relabel?.(label, f.text.slice(0, 11));
          slot.userData['frame'] = f ? { slot: f.slot, differs: f.differs } : undefined;
        });
      },
    };
  }

  /** The face is painted once (after the monospace face loads); only the needle moves. */
  private dial(group: T.Group, brass: T.Material): { needle: T.Group } {
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
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * 0.75 + (i / 12) * Math.PI * 1.5;
        const long = i % 3 === 0;
        context.lineWidth = long ? 4 : 2;
        context.beginPath();
        context.moveTo(128 + Math.cos(a) * (long ? 92 : 102), 128 + Math.sin(a) * (long ? 92 : 102));
        context.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116);
        context.stroke();
      }
      context.fillStyle = '#2a2c2f';
      context.font = `600 24px ${LABEL_FAMILY}`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('INICIO', 128 - 54, 128 + 70);
      context.fillText('FIN', 128 + 54, 128 + 70);
      context.fillText('PASO', 128, 128 - 36);
    };
    paint();
    void document.fonts?.ready.then(paint);
    const texture = this.tools.track(new T.CanvasTexture(canvas));
    texture.colorSpace = T.SRGBColorSpace;
    const face = new T.Mesh(
      this.tools.track(new T.CircleGeometry(0.95, 48)),
      this.tools.track(new T.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0 })),
    );
    face.rotation.x = -Math.PI / 2;
    face.position.set(-2.4, 0.206, 1.75);
    group.add(face);
    const needle = new T.Group();
    needle.position.set(-2.4, 0.23, 1.75);
    group.add(needle);
    const hand = this.tools.track(new T.MeshStandardMaterial({ color: '#c0392b', roughness: 0.4, metalness: 0.2 }));
    const blade = this.mesh(needle, this.tools.track(new T.BoxGeometry(0.05, 0.02, 0.8)), hand, 0, 0, 0.36);
    blade.userData['dynamic'] = true;
    this.cylinder(needle, 0.07, 0.04, 0, 0.02, 0, brass);
    return { needle };
  }
}
