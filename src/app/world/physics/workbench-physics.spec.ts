import { it, expect } from 'vitest';
import * as T from 'three';
import { FixedStep, WorkbenchPhysics } from './workbench-physics';
import { BENCH } from '../models/bench-layout';

/** A tool sits on the tray: its origin is the tray top, as in the room model. */
const TRAY_TOP = BENCH.matTop + 0.12;

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

it('empty_hand_release_moves_nothing', async () => {
  const p = new WorkbenchPhysics(),
    o = new T.Group();
  o.position.set(6.1, TRAY_TOP, 1.02);
  await p.initialize(new Map([['tool', o]]));
  // The button with nothing in hand must not lift, spin or drop any tool.
  expect(p.release()).toBe(false);
  for (let n = 0; n < 60; n++) p.step(1 / 60);
  // A hair of contact settling is allowed (under 0.005 units); a lift or a spin is not.
  expect(o.position.y).toBeCloseTo(TRAY_TOP, 2);
  expect(o.position.x).toBeCloseTo(6.1, 2);
  p.dispose();
});

it('held_tool_follows_pointer_and_stays_until_released', async () => {
  const p = new WorkbenchPhysics(),
    o = new T.Group();
  o.position.set(6.1, TRAY_TOP, 1.02);
  await p.initialize(new Map([['tool', o]]));
  p.beginDrag('tool');
  p.moveDrag(new T.Vector3(6.3, 1, 1));
  for (let n = 0; n < 30; n++) p.step(1 / 60);
  expect(o.position.y).toBeGreaterThan(0.8);
  // Pointer up: the tool stays where it was left, in hand.
  p.hold();
  for (let n = 0; n < 60; n++) p.step(1 / 60);
  expect(o.position.y).toBeGreaterThan(0.8);
  expect(p.heldId).toBe('tool');
  expect(p.release()).toBe(true);
  expect(p.heldId).toBeUndefined();
  for (let n = 0; n < 180; n++) p.step(1 / 60);
  expect(o.position.y).toBeLessThan(0.3);
  p.dispose();
});

it('grabbing_another_tool_lets_the_first_one_fall', async () => {
  const p = new WorkbenchPhysics(),
    a = new T.Group(),
    b = new T.Group();
  a.position.set(6.1, TRAY_TOP, 1.02);
  b.position.set(6.4, TRAY_TOP, 1.02);
  await p.initialize(
    new Map([
      ['tool', a],
      ['tool-1', b],
    ]),
  );
  p.beginDrag('tool');
  p.moveDrag(new T.Vector3(6.1, 1, 1));
  for (let n = 0; n < 20; n++) p.step(1 / 60);
  p.hold();
  p.beginDrag('tool-1');
  expect(p.heldId).toBe('tool-1');
  for (let n = 0; n < 180; n++) p.step(1 / 60);
  expect(a.position.y).toBeLessThan(0.3);
  p.dispose();
});

it('reset_returns_tools_home_and_empties_the_hand', async () => {
  const p = new WorkbenchPhysics(),
    o = new T.Group();
  o.position.set(6.1, TRAY_TOP, 1.02);
  await p.initialize(new Map([['tool', o]]));
  p.beginDrag('tool');
  p.moveDrag(new T.Vector3(6.3, 1.2, 1));
  for (let n = 0; n < 20; n++) p.step(1 / 60);
  p.reset();
  expect(p.heldId).toBeUndefined();
  expect(o.position.y).toBeCloseTo(TRAY_TOP, 5);
  expect(o.position.x).toBeCloseTo(6.1, 5);
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
