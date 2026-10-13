import * as T from 'three';
import { createLampPose, solveLamp, type LampPose } from './lamp-rig';
import type { LampRig } from './models/articulated-lamp.model';
import { BENCH } from './models/bench-layout';
import { seededRandom } from './textures/noise';

import { clampLampTarget, LAMP_LIMITS, type LampTarget } from './lamp-limits';

export { clampLampTarget, LAMP_LIMITS, type LampTarget };

const DUST = 150;
const UP = new T.Vector3(0, 1, 0);
const DOWN = new T.Vector3(0, -1, 0);
const BEAM_ANGLE = 0.5;

/**
 * Owns the articulated lamp at run time: the desired aim point is smoothed, solved into joint
 * positions every frame and mirrored by the spot light that casts the bench shadows.
 */
export class LampController {
  private desired: LampTarget = { x: -0.8, z: 0.6, height: 5 };
  private current: LampTarget = { ...this.desired };
  private pose: LampPose = createLampPose();
  private shoulder = new T.Vector3();
  private aim = new T.Vector3();
  private direction = new T.Vector3();
  private orientation = new T.Quaternion();
  private time = 0;
  private on = true;
  private boost = 1;
  private readonly dustSeeds: Float32Array;
  readonly light: T.SpotLight;
  private readonly lightTarget = new T.Object3D();
  private readonly marker: T.Mesh;

  constructor(
    private readonly rig: LampRig,
    private readonly scene: T.Scene,
    private readonly track: <G extends T.Material | T.BufferGeometry | T.Texture>(r: G) => G,
  ) {
    this.light = new T.SpotLight('#ffd6a0', 40, 40, BEAM_ANGLE, 0.7, 2);
    this.light.target = this.lightTarget;
    this.light.shadow.mapSize.set(1024, 1024);
    this.light.shadow.bias = -0.0002;
    this.light.shadow.normalBias = 0.02;
    this.light.shadow.camera.near = 0.5;
    this.light.shadow.camera.far = 40;
    scene.add(this.light, this.lightTarget);
    // Pool of light on the bench: it shows where the head is pointing before anyone looks up.
    this.marker = new T.Mesh(
      track(new T.RingGeometry(0.62, 0.74, 56)),
      track(new T.MeshBasicMaterial({ color: '#ffd6a0', transparent: true, opacity: 0.32, depthWrite: false })),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    scene.add(this.marker);
    const random = seededRandom(31);
    this.dustSeeds = new Float32Array(DUST * 4);
    for (let i = 0; i < DUST * 4; i++) this.dustSeeds[i] = random();
    this.apply(0);
  }

  get target(): LampTarget {
    return { ...this.desired };
  }

  get powered(): boolean {
    return this.on;
  }

  get handle(): T.Object3D {
    return this.rig.handle;
  }

  setTarget(target: LampTarget): void {
    this.desired = clampLampTarget(target);
  }

  aimAt(x: number, z: number): void {
    this.setTarget({ ...this.desired, x, z });
  }

  setPower(on: boolean): void {
    this.on = on;
  }

  /** Shadow resolution follows the quality tier; the map is released so the next frame reallocates it. */
  setShadowQuality(size: number): void {
    const next = Math.max(256, size);
    if (this.light.shadow.mapSize.x === next) return;
    this.light.shadow.mapSize.set(next, next);
    this.light.shadow.map?.dispose();
    this.light.shadow.map = null;
  }

  /** Inspection boost raises the spot intensity for close reading; it never changes the pose. */
  setBoost(factor: number): void {
    this.boost = factor;
  }

  /** `dt` in seconds; `reduced` snaps to the target instead of easing toward it. */
  update(dt: number, reduced: boolean, castShadow: boolean): void {
    this.time += dt;
    const ease = reduced ? 1 : 1 - Math.exp(-dt * 7);
    this.current.x += (this.desired.x - this.current.x) * ease;
    this.current.z += (this.desired.z - this.current.z) * ease;
    this.current.height += (this.desired.height - this.current.height) * ease;
    this.apply(reduced ? 0 : this.time);
    this.light.castShadow = castShadow;
  }

  private apply(time: number): void {
    const { rig } = this;
    this.shoulder.set(BENCH.lamp.x, BENCH.top + rig.columnHeight, BENCH.lamp.z);
    this.aim.set(this.current.x, BENCH.top, this.current.z);
    solveLamp(this.shoulder, this.aim, this.current.height, this.pose);
    const { shoulder, elbow, wrist } = this.pose;
    rig.shoulder.position.copy(shoulder);
    rig.elbow.position.copy(elbow);
    rig.wrist.position.copy(wrist);
    this.placeSegment(rig.upper, shoulder, elbow);
    this.placeSegment(rig.fore, elbow, wrist);
    rig.head.position.copy(wrist);
    this.direction.subVectors(this.aim, wrist);
    const length = this.direction.length();
    this.direction.divideScalar(length);
    this.orientation.setFromUnitVectors(DOWN, this.direction);
    rig.head.quaternion.copy(this.orientation);
    this.light.position.copy(wrist).addScaledVector(DOWN, 0.35);
    this.lightTarget.position.copy(this.aim);
    // The spot falls off with the square of its distance, so its power follows the head: the pool on the bench keeps
    // the brightness it had with the head at 3.2 (a light-to-aim distance of 2.85).
    this.light.intensity = this.on ? 40 * this.boost * ((length - 0.35) / 2.85) ** 2 : 0;
    (rig.lens.material as T.MeshStandardMaterial).emissiveIntensity = this.on ? 1.6 : 0.05;
    rig.beam.visible = this.on;
    rig.beam.position.copy(wrist);
    rig.beam.quaternion.copy(this.orientation);
    const spread = Math.tan(BEAM_ANGLE * 0.9) * length;
    rig.beam.scale.set(spread, length, spread);
    this.marker.visible = this.on;
    this.marker.position.set(this.aim.x, BENCH.top + 0.012, this.aim.z);
    this.updateDust(time, length);
  }

  private placeSegment(mesh: T.Mesh, from: T.Vector3, to: T.Vector3): void {
    mesh.position.addVectors(from, to).multiplyScalar(0.5);
    this.direction.subVectors(to, from).normalize();
    mesh.quaternion.setFromUnitVectors(UP, this.direction);
  }

  /** Motes drift slowly inside the cone between the head and the bench. */
  private updateDust(time: number, length: number): void {
    const { dust } = this.rig;
    dust.visible = this.on && this.boost > 1;
    if (!dust.visible) return;
    const attr = dust.geometry.getAttribute('position') as T.BufferAttribute;
    const { wrist } = this.pose;
    const axisX = this.direction.clone();
    const side = new T.Vector3().crossVectors(axisX, UP).normalize();
    const forward = new T.Vector3().crossVectors(side, axisX).normalize();
    const p = new T.Vector3();
    for (let i = 0; i < DUST; i++) {
      const s = this.dustSeeds;
      const along = (s[i * 4] + 0.05 * Math.sin(time * 0.7 + i)) % 1;
      const radius = 0.15 + along * Math.tan(BEAM_ANGLE * 0.9) * length * (0.5 + s[i * 4 + 1] * 0.5);
      const angle = s[i * 4 + 2] * Math.PI * 2 + time * 0.05;
      p.copy(wrist)
        .addScaledVector(axisX, along * length)
        .addScaledVector(side, Math.cos(angle) * radius * s[i * 4 + 3])
        .addScaledVector(forward, Math.sin(angle) * radius * s[i * 4 + 3]);
      attr.setXYZ(i, p.x, p.y, p.z);
    }
    attr.needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.light, this.lightTarget, this.marker);
  }
}
