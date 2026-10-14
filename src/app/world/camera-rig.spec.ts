import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { CameraRig } from './camera-rig';
import { framePose } from './camera-director';
import { CAMERA_LIMITS } from './room-bounds';

function rig() {
  const camera = new T.PerspectiveCamera(38, 1.5, 0.1, 140);
  camera.position.set(5.8, 9.2, 10.8);
  const controls = { target: new T.Vector3(-0.45, 0.7, 0), minDistance: 1.6, maxDistance: 32 };
  camera.lookAt(controls.target);
  return { camera, controls, rig: new CameraRig(camera, controls) };
}

describe('CameraRig', () => {
  it('orbit_command_eases_instead_of_jumping', () => {
    const { rig: r } = rig();
    const before = r.azimuth;
    r.orbitBy(Math.PI / 8);
    r.update(1 / 60);
    const moved = r.azimuth - before;
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(Math.PI / 8);
  });

  it('reduced_motion_reaches_the_pose_in_one_update', () => {
    const { rig: r } = rig();
    r.setReduced(true);
    const before = r.azimuth;
    r.orbitBy(Math.PI / 8);
    r.update(1 / 60);
    expect(r.azimuth - before).toBeCloseTo(Math.PI / 8, 5);
    expect(r.moving).toBe(false);
  });

  it('a_new_command_retargets_a_running_transition', () => {
    const { rig: r } = rig();
    const start = r.azimuth;
    r.orbitBy(Math.PI / 8);
    r.update(1 / 60);
    r.orbitBy(Math.PI / 8);
    for (let i = 0; i < 600; i++) r.update(1 / 60);
    expect(r.azimuth - start).toBeCloseTo(Math.PI / 4, 3);
  });

  it('dolly_never_leaves_the_zoom_limits', () => {
    const { rig: r } = rig();
    r.setReduced(true);
    r.dollyBy(0.0001);
    r.update(1 / 60);
    expect(r.distance).toBeGreaterThanOrEqual(1.6 - 1e-6);
  });

  it('boundary_never_flips_the_view', () => {
    const { camera, controls, rig: r } = rig();
    camera.position.set(80, 9, 80);
    camera.lookAt(controls.target);
    const wanted = controls.target.clone().sub(camera.position).normalize();
    for (let i = 0; i < 120; i++) r.update(1 / 60);
    const now = controls.target.clone().sub(camera.position).normalize();
    expect(now.dot(wanted)).toBeGreaterThan(0.9);
    expect(camera.position.x).toBeLessThanOrEqual(34 + 1e-3);
  });

  it('moveTo_clears_the_view_offset_when_the_pose_has_none', () => {
    const { camera, rig: r } = rig();
    camera.setViewOffset(800, 600, 40, -30, 800, 600);
    r.setReduced(true);
    r.moveTo({ position: new T.Vector3(5, 5, 5), target: new T.Vector3() });
    r.update(1 / 60);
    expect(camera.view?.enabled ?? false).toBe(false);
  });
});

it('framing_pose_is_pure', () => {
  const box = new T.Box3(new T.Vector3(-1, 0, -1), new T.Vector3(1, 1, 1));
  const a = framePose(38, box, { x: 0, y: 0, width: 400, height: 300 }, { width: 400, height: 300 });
  const b = framePose(38, box, { x: 0, y: 0, width: 400, height: 300 }, { width: 400, height: 300 });
  expect(a.position.equals(b.position)).toBe(true);
  expect(a.target.x).toBe(0);
});

describe('metas fuera de la sala', () => {
  it('a_goal_beyond_the_ceiling_settles_without_shaking', () => {
    const { camera, controls, rig: r } = rig();
    // 14 units out at a steep angle would be above the ceiling: the goal must be cut, then the rig must rest.
    r.moveTo({ position: new T.Vector3(3, 15, 6), target: new T.Vector3(0, 0.7, -1) });
    const positions: T.Vector3[] = [];
    for (let i = 0; i < 400; i++) {
      r.update(1 / 60);
      if (i > 300) positions.push(camera.position.clone());
    }
    expect(r.moving).toBe(false);
    for (const p of positions) expect(p.distanceTo(positions[0])).toBeLessThan(1e-6);
    expect(camera.position.y).toBeLessThanOrEqual(CAMERA_LIMITS.y[1] + 1e-6);
    expect(controls.target.z).toBeCloseTo(-1, 3);
  });
});
