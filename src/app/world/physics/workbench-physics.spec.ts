import { it, expect } from 'vitest';
import * as T from 'three';
import { FixedStep, WorkbenchPhysics } from './workbench-physics';
it('fixed_step_caps_substeps', () => {
  const s = new FixedStep();
  let count = 0;
  s.advance(10, () => count++);
  expect(count).toBe(4);
});
it('hidden_tab_resume_does_not_fast_forward', () => {
  const s = new FixedStep();
  let count = 0;
  s.advance(0.01, () => count++);
  s.reset();
  s.advance(0.01, () => count++);
  expect(count).toBe(0);
});
it('tool_rests_in_tray', async () => {
  const p = new WorkbenchPhysics(),
    o = new T.Group();
  o.position.set(6.1, 1, 1.02);
  await p.initialize(new Map([['tool', o]]));
  p.drop();
  for (let n = 0; n < 240; n++) p.step(1 / 60);
  expect(o.position.y).toBeGreaterThan(-0.04);
  expect(o.position.y).toBeLessThan(0.2);
  p.dispose();
});

it('pointer_cancel_ends_drag', async () => {
  const p = new WorkbenchPhysics(),
    o = new T.Group();
  o.position.set(6.1, 0, 1);
  await p.initialize(new Map([['tool', o]]));
  p.beginDrag('tool');
  p.moveDrag(new T.Vector3(6.3, 1, 1));
  p.step(1 / 60);
  expect(o.position.y).toBeGreaterThan(0.8);
  p.endDrag();
  for (let n = 0; n < 180; n++) p.step(1 / 60);
  expect(o.position.y).toBeLessThan(0.2);
  p.dispose();
});

it('kinematic_mechanism_tracks_visual_owner_without_rewriting_it', async () => {
  const physics = new WorkbenchPhysics(),
    lid = new T.Group();
  await physics.initialize(new Map());
  physics.registerMechanism('lid', lid, new T.Vector3(1, 0.1, 1));
  lid.position.set(2, 3, 4);
  lid.rotation.z = 0.4;
  physics.step(1 / 60);
  const pose = physics.mechanismPose('lid')!;
  expect(pose.position.x).toBeCloseTo(0.04, 5);
  expect(pose.position.y).toBeCloseTo(0.06, 5);
  expect(pose.position.z).toBeCloseTo(0.08, 5);
  expect(lid.position.toArray()).toEqual([2, 3, 4]);
  physics.clearMechanisms();
  expect(physics.mechanismCount).toBe(0);
  physics.dispose();
});
