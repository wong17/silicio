import * as T from 'three';
import type * as R from '@dimforge/rapier3d-compat';
import { BENCH } from '../models/bench-layout';

export class FixedStep {
  private accumulator = 0;
  advance(dt: number, fn: () => void): number {
    this.accumulator = Math.min(0.1, this.accumulator + Math.max(0, Math.min(0.1, dt)));
    let n = 0;
    while (this.accumulator >= 1 / 60 && n < 4) {
      fn();
      this.accumulator -= 1 / 60;
      n++;
    }
    if (n === 4) this.accumulator = 0;
    return n;
  }
  reset(): void {
    this.accumulator = 0;
  }
}

const SCALE = 0.02; // Visual units -> metres; transform conversion only at this boundary.
/** Where a tool in hand may travel: the open right side of the worktop, clear of the stations. */
const HAND = { x: [4.6, 12.5], y: [0.2, 2.4], z: [-7, 9] } as const;
/** Clearance kept above a tall object when a tool in hand is carried over it. */
const STEP_OVER = 0.4;
/** Objects lower than this above the worktop never block a tool in hand. */
const LOW_OBJECT = 0.3;

interface Obstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number;
}

/**
 * Rigid bodies for the bench tools. A tool is either lying free (dynamic), or in hand: kinematic and
 * following the pointer while it is held down, then kept in place until it is released.
 */
export class WorkbenchPhysics {
  private world?: R.World;
  private api?: typeof R;
  private fixed = new FixedStep();
  private bodies = new Map<string, { body: R.RigidBody; object: T.Object3D; home: T.Vector3 }>();
  private disposed = false;
  private held?: { id: string; body: R.RigidBody };
  private following = false;
  private obstacles: Obstacle[] = [];
  private mechanisms = new Map<string, { body: R.RigidBody; object: T.Object3D }>();
  registerMechanism(
    id: string,
    object: T.Object3D,
    halfSize: T.Vector3,
    offset = new T.Vector3(),
  ): void {
    if (!this.world || !this.api || this.mechanisms.has(id)) return;
    object.updateWorldMatrix(true, false);
    const position = object.getWorldPosition(new T.Vector3()).multiplyScalar(SCALE),
      rotation = object.getWorldQuaternion(new T.Quaternion());
    const body = this.world.createRigidBody(
      this.api.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(position.x, position.y, position.z)
        .setRotation(rotation),
    );
    this.world.createCollider(
      this.api.ColliderDesc.cuboid(
        halfSize.x * SCALE,
        halfSize.y * SCALE,
        halfSize.z * SCALE,
      ).setTranslation(offset.x * SCALE, offset.y * SCALE, offset.z * SCALE),
      body,
    );
    this.mechanisms.set(id, { body, object });
  }
  clearMechanisms(): void {
    if (this.world)
      for (const { body } of this.mechanisms.values()) this.world.removeRigidBody(body);
    this.mechanisms.clear();
  }
  get mechanismCount(): number {
    return this.mechanisms.size;
  }
  mechanismPose(id: string): { position: R.Vector; rotation: R.Rotation } | undefined {
    const body = this.mechanisms.get(id)?.body;
    return body ? { position: body.translation(), rotation: body.rotation() } : undefined;
  }
  private syncMechanisms(): void {
    for (const { body, object } of this.mechanisms.values()) {
      object.updateWorldMatrix(true, false);
      const position = object.getWorldPosition(new T.Vector3()).multiplyScalar(SCALE),
        rotation = object.getWorldQuaternion(new T.Quaternion());
      body.setNextKinematicTranslation(position);
      body.setNextKinematicRotation(rotation);
    }
  }
  /** Identifier of the tool in hand, or undefined when the hand is empty. */
  get heldId(): string | undefined {
    return this.held?.id;
  }
  async initialize(tools: Map<string, T.Object3D>): Promise<void> {
    const api = await import('@dimforge/rapier3d-compat');
    await api.init();
    if (this.disposed) return;
    this.api = api;
    this.world = new api.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 60;
    this.world.integrationParameters.lengthUnit = SCALE;
    const floor = this.world.createRigidBody(
      api.RigidBodyDesc.fixed().setTranslation(0, -0.52 * SCALE, 0),
    );
    this.world.createCollider(
      api.ColliderDesc.cuboid(0.3, 0.225 * SCALE, 0.22).setFriction(0.8),
      floor,
    );
    // The anti-static mat and the tray are real surfaces: tools land on their tops.
    this.staticBox(
      BENCH.mat.x,
      BENCH.matTop - 0.03,
      BENCH.mat.z,
      BENCH.mat.width / 2,
      0.03,
      BENCH.mat.depth / 2,
    );
    this.staticBox(BENCH.tray.x, BENCH.matTop + 0.06, BENCH.tray.z, 0.625, 0.06, 1.85);
    // The room floor catches anything that leaves the worktop, so a dropped tool never falls forever.
    this.staticBox(0, BENCH.floor - 0.25, 0, 24, 0.25, 20);
    for (const [id, object] of tools) {
      if (!id.startsWith('tool')) continue;
      const home = object.position.clone(),
        body = this.world.createRigidBody(
          api.RigidBodyDesc.dynamic()
            .setTranslation(home.x * SCALE, home.y * SCALE, home.z * SCALE)
            .setLinearDamping(1)
            .setAngularDamping(2)
            .setCcdEnabled(true),
        );
      // Colliders follow the handle and shaft built in the room model; the origin is the tray top.
      this.world.createCollider(
        api.ColliderDesc.cuboid(0.11 * SCALE, 0.095 * SCALE, 0.45 * SCALE)
          .setTranslation(0, 0.095 * SCALE, 0.78 * SCALE)
          .setFriction(0.9)
          .setRestitution(0.05),
        body,
      );
      this.world.createCollider(
        api.ColliderDesc.cuboid(0.025 * SCALE, 0.025 * SCALE, 0.75 * SCALE)
          .setTranslation(0, 0.025 * SCALE, -0.4 * SCALE)
          .setFriction(0.8),
        body,
      );
      this.bodies.set(id, { body, object, home });
    }
    this.obstacles = this.footprints(tools);
  }
  private staticBox(x: number, y: number, z: number, hx: number, hy: number, hz: number): void {
    if (!this.world || !this.api) return;
    const body = this.world.createRigidBody(this.api.RigidBodyDesc.fixed());
    this.world.createCollider(
      this.api.ColliderDesc.cuboid(hx * SCALE, hy * SCALE, hz * SCALE)
        .setTranslation(x * SCALE, y * SCALE, z * SCALE)
        .setFriction(0.8),
      body,
    );
  }
  /** Tall bench objects, from their world boxes, that a tool in hand must step over. */
  private footprints(tools: Map<string, T.Object3D>): Obstacle[] {
    const found: Obstacle[] = [];
    for (const [id, object] of tools) {
      if (id.startsWith('tool') || id.startsWith('lamp') || id === 'lid') continue;
      object.updateWorldMatrix(true, true);
      const box = new T.Box3().setFromObject(object);
      if (box.isEmpty() || box.max.y < BENCH.top + LOW_OBJECT) continue;
      found.push({
        minX: box.min.x,
        maxX: box.max.x,
        minZ: box.min.z,
        maxZ: box.max.z,
        top: box.max.y,
      });
    }
    return found;
  }
  /** Lowest height at which a tool in hand clears every tall object under (x, z). */
  private clearanceAt(x: number, z: number): number {
    let floor = 0;
    for (const o of this.obstacles)
      if (x >= o.minX && x <= o.maxX && z >= o.minZ && z <= o.maxZ)
        floor = Math.max(floor, o.top + STEP_OVER);
    return floor;
  }
  /** Takes the tool under the pointer. A different tool in hand is let go first. */
  beginDrag(id: string): void {
    const record = this.bodies.get(id);
    if (!record || !this.api) return;
    if (this.held?.body !== record.body) this.release();
    this.held = { id, body: record.body };
    record.body.setBodyType(this.api.RigidBodyType.KinematicPositionBased, true);
    this.following = true;
  }
  /** Follows the pointer only while it is held down; the tool keeps its place afterwards. */
  moveDrag(target: T.Vector3): void {
    if (!this.following || !this.held) return;
    const x = T.MathUtils.clamp(target.x, HAND.x[0], HAND.x[1]),
      z = T.MathUtils.clamp(target.z, HAND.z[0], HAND.z[1]);
    const y = T.MathUtils.clamp(
      Math.max(target.y, this.clearanceAt(x, z)),
      HAND.y[0],
      HAND.y[1],
    );
    this.held.body.setNextKinematicTranslation({ x: x * SCALE, y: y * SCALE, z: z * SCALE });
  }
  /** The pointer went up: the tool stays in hand until it is released. */
  hold(): void {
    this.following = false;
  }
  /** Lets the tool in hand fall. Returns false, and moves nothing, when the hand is empty. */
  release(): boolean {
    if (!this.held || !this.api) {
      this.held = undefined;
      this.following = false;
      return false;
    }
    this.held.body.setBodyType(this.api.RigidBodyType.Dynamic, true);
    this.held.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.held.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.held = undefined;
    this.following = false;
    return true;
  }
  step(dt: number): void {
    if (!this.world || this.disposed) return;
    this.fixed.advance(dt, () => {
      this.syncMechanisms();
      this.world!.step();
    });
    for (const { body, object } of this.bodies.values()) {
      const p = body.translation(),
        q = body.rotation();
      object.position.set(p.x / SCALE, p.y / SCALE, p.z / SCALE);
      object.quaternion.set(q.x, q.y, q.z, q.w);
    }
  }
  /** Puts every tool back on its tray place and empties the hand. */
  reset(): void {
    this.release();
    this.fixed.reset();
    for (const { body, home, object } of this.bodies.values()) {
      body.setTranslation({ x: home.x * SCALE, y: home.y * SCALE, z: home.z * SCALE }, true);
      body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      object.position.copy(home);
      object.quaternion.identity();
    }
  }
  /** Pauses the pointer's control without dropping a tool that is in hand. */
  suspend(): void {
    this.following = false;
    this.fixed.reset();
  }
  get awakeCount(): number {
    return [...this.bodies.values()].filter((v) => !v.body.isSleeping()).length;
  }
  dispose(): void {
    this.disposed = true;
    this.clearMechanisms();
    this.world?.free();
    this.world = undefined;
    this.bodies.clear();
    this.held = undefined;
  }
}
