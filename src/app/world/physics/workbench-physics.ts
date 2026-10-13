import * as T from 'three';
import type * as R from '@dimforge/rapier3d-compat';
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
export class WorkbenchPhysics {
  private world?: R.World;
  private api?: typeof R;
  private fixed = new FixedStep();
  private bodies = new Map<string, { body: R.RigidBody; object: T.Object3D; home: T.Vector3 }>();
  private disposed = false;
  private dragging?: R.RigidBody;
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
      this.world.createCollider(
        api.ColliderDesc.cuboid(0.11 * SCALE, 0.095 * SCALE, 0.45 * SCALE)
          .setTranslation(0, -0.05 * SCALE, 0.78 * SCALE)
          .setFriction(0.9)
          .setRestitution(0.05),
        body,
      );
      this.world.createCollider(
        api.ColliderDesc.cuboid(0.025 * SCALE, 0.025 * SCALE, 0.75 * SCALE)
          .setTranslation(0, 0, -0.4 * SCALE)
          .setFriction(0.8),
        body,
      );
      this.bodies.set(id, { body, object, home });
    }
    const tray = this.world.createRigidBody(
      api.RigidBodyDesc.fixed().setTranslation(6.1 * SCALE, -0.22 * SCALE, 1.4 * SCALE),
    );
    this.world.createCollider(
      api.ColliderDesc.cuboid(0.7 * SCALE, 0.06 * SCALE, 2 * SCALE).setFriction(0.9),
      tray,
    );
  }
  beginDrag(id: string): void {
    this.endDrag();
    const record = this.bodies.get(id);
    if (!record || !this.api) return;
    this.dragging = record.body;
    this.dragging.setBodyType(this.api.RigidBodyType.KinematicPositionBased, true);
  }
  moveDrag(target: T.Vector3): void {
    this.dragging?.setNextKinematicTranslation({
      x: T.MathUtils.clamp(target.x, 5.45, 6.75) * SCALE,
      y: T.MathUtils.clamp(target.y, 0.2, 1.8) * SCALE,
      z: T.MathUtils.clamp(target.z, 0.25, 2.2) * SCALE,
    });
  }
  endDrag(): void {
    if (this.dragging && this.api) {
      this.dragging.setBodyType(this.api.RigidBodyType.Dynamic, true);
      this.dragging.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    this.dragging = undefined;
  }
  step(dt: number): void {
    if (!this.world || this.disposed) return;
    this.fixed.advance(dt, () => this.world!.step());
    for (const { body, object } of this.bodies.values()) {
      const p = body.translation(),
        q = body.rotation();
      object.position.set(p.x / SCALE, p.y / SCALE, p.z / SCALE);
      object.quaternion.set(q.x, q.y, q.z, q.w);
    }
  }
  drop(): void {
    for (const { body, home } of this.bodies.values()) {
      body.setTranslation(
        { x: home.x * SCALE, y: (home.y + 1.2) * SCALE, z: home.z * SCALE },
        true,
      );
      body.setAngvel({ x: 0, y: 2, z: 1 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  }
  reset(): void {
    this.endDrag();
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
  suspend(): void {
    this.endDrag();
    this.fixed.reset();
  }
  get awakeCount(): number {
    return [...this.bodies.values()].filter((v) => !v.body.isSleeping()).length;
  }
  dispose(): void {
    this.disposed = true;
    this.world?.free();
    this.world = undefined;
    this.bodies.clear();
  }
}
