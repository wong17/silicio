import * as T from 'three';
import { keepInsideRoom, maxDistanceWithin, type Point3 } from './room-bounds';

/** What the rig needs from the orbit controls: the look-at point and the zoom limits. */
export interface RigControls {
  target: T.Vector3;
  minDistance: number;
  maxDistance: number;
}

/** An off-axis window: where the full-size frustum is shifted so the subject sits in the free region. */
export interface ViewWindow {
  fullWidth: number;
  fullHeight: number;
  x: number;
  y: number;
}

export interface CameraPose {
  position: T.Vector3;
  target: T.Vector3;
  /** Absent clears the view offset (the plain, centred frustum). */
  view?: ViewWindow;
}

/** Seconds a command takes to settle (about 95 %): 0.22 for wheel and buttons, 0.6 for framing and home. */
export const RIG_SMOOTH = { input: 0.22, frame: 0.6 } as const;

interface Goal {
  target: T.Vector3;
  azimuth: number;
  polar: number;
  distance: number;
  view?: ViewWindow;
  smooth: number;
}

const EPS = { angle: 0.0005, length: 0.001, pixels: 0.05 };

function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Owns every programmatic camera movement. Commands set a goal in spherical coordinates around the target;
 * `update` eases the camera toward it, so a button never teleports and a new command retargets the one
 * running. With reduced motion the goal is reached in a single update.
 */
export class CameraRig {
  private goal?: Goal;
  private reduced = false;
  private boundary = true;
  private readonly baseMaxDistance: number;
  private readonly spherical = new T.Spherical();
  private readonly offset = new T.Vector3();

  constructor(
    private readonly camera: T.PerspectiveCamera,
    private readonly controls: RigControls,
  ) {
    this.baseMaxDistance = controls.maxDistance;
  }

  get azimuth(): number {
    return this.read().theta;
  }
  get distance(): number {
    return this.read().radius;
  }
  get moving(): boolean {
    return !!this.goal;
  }

  setReduced(reduced: boolean): void {
    this.reduced = reduced;
  }

  /** The room limit is soft: the camera is eased back in, never snapped, so the view cannot flip. */
  setBoundary(enabled: boolean): void {
    this.boundary = enabled;
  }

  /** Stops the running transition where it is. Called when the user takes the camera. */
  cancel(): void {
    this.goal = undefined;
  }

  orbitBy(azimuth: number, polar = 0): void {
    const g = this.begin(RIG_SMOOTH.input);
    g.azimuth += azimuth;
    g.polar = T.MathUtils.clamp(g.polar + polar, 0.2, Math.PI * 0.48);
  }

  orbitTo(azimuth: number): void {
    const g = this.begin(RIG_SMOOTH.input);
    g.azimuth = azimuth;
  }

  /** Moves to an absolute azimuth and distance around the current target (used by shared links). */
  setView(azimuth: number, distance: number): void {
    const g = this.begin(RIG_SMOOTH.frame);
    g.azimuth = azimuth;
    g.distance = T.MathUtils.clamp(distance, this.controls.minDistance, this.controls.maxDistance);
  }

  dollyBy(factor: number): void {
    const g = this.begin(RIG_SMOOTH.input);
    g.distance = T.MathUtils.clamp(g.distance * factor, this.controls.minDistance, this.controls.maxDistance);
  }

  /** Moves to a pose computed elsewhere (framing a piece, going home). */
  moveTo(pose: CameraPose, smooth: number = RIG_SMOOTH.frame): void {
    const s = new T.Spherical().setFromVector3(pose.position.clone().sub(pose.target));
    this.goal = {
      target: pose.target.clone(),
      azimuth: s.theta,
      polar: s.phi,
      distance: s.radius,
      view: pose.view,
      smooth,
    };
  }

  /** Advances the transition. Returns true while the camera is still moving. */
  update(dt: number): boolean {
    const g = this.goal;
    if (g) {
      const k = this.reduced || g.smooth <= 0 ? 1 : 1 - Math.exp((-3 * Math.max(0, dt)) / g.smooth);
      const cur = this.read();
      const center = this.controls.target;
      center.lerp(g.target, k);
      const theta = cur.theta + wrap(g.azimuth - cur.theta) * k;
      const phi = cur.phi + (g.polar - cur.phi) * k;
      const radius = cur.radius + (g.distance - cur.radius) * k;
      this.place(center, radius, phi, theta);
      this.stepView(g, k);
      const done =
        Math.abs(wrap(g.azimuth - theta)) < EPS.angle &&
        Math.abs(g.polar - phi) < EPS.angle &&
        Math.abs(g.distance - radius) < EPS.length &&
        center.distanceTo(g.target) < EPS.length;
      if (done || k === 1) {
        // Land exactly on the goal so repeated commands do not accumulate drift.
        center.copy(g.target);
        this.place(center, g.distance, g.polar, g.azimuth);
        this.stepView(g, 1);
        this.goal = undefined;
      }
    }
    const kept = this.keepInside(dt);
    return !!this.goal || kept;
  }

  dispose(): void {
    this.goal = undefined;
  }

  private place(center: T.Vector3, radius: number, phi: number, theta: number): void {
    this.spherical.set(radius, phi, theta);
    this.camera.position.copy(center).add(this.offset.setFromSpherical(this.spherical));
    this.camera.lookAt(center);
  }

  private begin(smooth: number): Goal {
    const cur = this.read();
    const g: Goal = this.goal ?? {
      target: this.controls.target.clone(),
      azimuth: cur.theta,
      polar: cur.phi,
      distance: cur.radius,
      view: this.currentView(),
      smooth,
    };
    g.smooth = smooth;
    this.goal = g;
    return g;
  }

  private read(): T.Spherical {
    return this.spherical.setFromVector3(this.offset.copy(this.camera.position).sub(this.controls.target));
  }

  private currentView(): ViewWindow | undefined {
    const v = this.camera.view;
    return v && v.enabled
      ? { fullWidth: v.fullWidth, fullHeight: v.fullHeight, x: v.offsetX, y: v.offsetY }
      : undefined;
  }

  /** Eases the off-axis window; an absent goal window eases back to centre and then clears the offset. */
  private stepView(g: Goal, k: number): void {
    const now = this.currentView();
    const wanted = g.view;
    if (!now && !wanted) return;
    const full = wanted ?? now!;
    const fromX = now ? now.x : 0,
      fromY = now ? now.y : 0;
    const toX = wanted ? wanted.x : 0,
      toY = wanted ? wanted.y : 0;
    const x = fromX + (toX - fromX) * k,
      y = fromY + (toY - fromY) * k;
    if (!wanted && Math.abs(x) < EPS.pixels && Math.abs(y) < EPS.pixels) this.camera.clearViewOffset();
    else this.camera.setViewOffset(full.fullWidth, full.fullHeight, x, y, full.fullWidth, full.fullHeight);
    this.camera.updateProjectionMatrix();
  }

  /**
   * The zoom-out limit follows the room: the orbit controls may never take the lens beyond the box, so the
   * box and the controls agree and nothing pulls the camera back and forth. A direct clamp stays as a net.
   */
  private keepInside(_dt: number): boolean {
    if (!this.boundary) return false;
    const center = this.controls.target;
    const offset = this.offset.copy(this.camera.position).sub(center);
    const length = offset.length();
    if (length > 1e-6) {
      const limit = maxDistanceWithin(center, { x: offset.x / length, y: offset.y / length, z: offset.z / length });
      this.controls.maxDistance = Math.max(this.controls.minDistance, Math.min(this.baseMaxDistance, limit));
    }
    const p: Point3 = { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z };
    if (!keepInsideRoom(p)) return false;
    this.camera.position.set(p.x, p.y, p.z);
    return true;
  }
}
