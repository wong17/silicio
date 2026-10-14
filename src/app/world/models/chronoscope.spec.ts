import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { ChronoscopeModel } from './chronoscope.model';
import { cursorSlot, forkOrigin, tapeOffset, TAPE_PITCH, branchFrames } from '../timeline-layout';
import { accessibleCatalog } from '../piece-definitions';
import { classifySubject } from '../piece-catalog';

function build() {
  const animators: ((t: number) => void)[] = [];
  const tools = {
    track: <G>(r: G): G => r,
    material: (_id: string, color: string) => new T.MeshStandardMaterial({ color }),
    label: () => new T.Object3D(),
    relabel: () => {},
    animate: (fn: (t: number) => void) => animators.push(fn),
  };
  const root = new T.Group();
  const parts = new Map<string, T.Object3D>();
  const rig = new ChronoscopeModel(tools).build(root, parts, (fn) => animators.push(fn));
  rig.historySlots.forEach((s) => (s.userData['filled'] = true));
  return { root, parts, rig, run: (t: number) => animators.forEach((fn) => fn(t)) };
}

describe('cronoscopio: cinta de pasos', () => {
  it('playhead_sits_on_the_cursor_frame', () => {
    const { parts, rig, run } = build();
    const tape = parts.get('chrono-tape')!;
    rig.setTimeline({ cursor: 5, total: 12 }, []);
    run(0);
    // At the cursor slot the tape is shifted so that frame is under the window (x = 0).
    expect(tape.position.x + cursorSlot({ cursor: 5, total: 12 }) * TAPE_PITCH).toBeCloseTo(0, 5);
    expect(tapeOffset({ cursor: 5, total: 12 })).toBeCloseTo(-5 * TAPE_PITCH, 5);
    const frame = rig.historySlots[5];
    const world = new T.Vector3();
    tape.updateMatrixWorld(true);
    frame.getWorldPosition(world);
    expect(world.x).toBeCloseTo(0, 4);
  });

  it('only_frames_near_the_window_are_drawn', () => {
    const { rig, run } = build();
    rig.setTimeline({ cursor: 8, total: 16 }, []);
    run(0);
    const shown = rig.historySlots.map((s, i) => (s.visible ? i : -1)).filter((i) => i >= 0);
    expect(shown).toEqual([5, 6, 7, 8, 9, 10, 11]);
  });

  it('branch_forks_at_its_origin_frame', () => {
    const main = ['MOV', 'ADD', 'SUB', 'HLT'];
    const other = ['MOV', 'ADD', 'INC', 'HLT'];
    const origin = forkOrigin(main, other);
    expect(origin).toBe(2);
    const frames = branchFrames({ cursor: 3, total: 4, branch: { origin, texts: other.slice(origin) } }, main);
    expect(frames[0]).toMatchObject({ slot: 2, text: 'INC', differs: true });
    expect(frames[1]).toMatchObject({ slot: 3, text: 'HLT', differs: false });
  });

  it('chronoscope_pieces_have_their_own_names', () => {
    const { root, parts } = build();
    classifySubject(root, parts);
    for (const id of ['logic', 'markings', 'board']) expect(parts.has(id), id).toBe(false);
    const names = accessibleCatalog('time', 'classic', 0).filter((p) => p.id.startsWith('chrono-')).map((p) => p.name);
    expect(names).toEqual([
      'Base del cronoscopio',
      'Carrete de la cinta',
      'Cinta de pasos',
      'Ventanilla del cursor',
      'Dial de progreso',
      'Rama alternativa',
    ]);
  });

  it('needle_reads_step_over_total_not_the_clock', () => {
    const { root, rig, run } = build();
    const needle = (root.children.find((c) => c.userData['part'] === 'chrono-dial') as T.Group).children.find(
      (c) => c.children.length > 0 && !(c as T.Mesh).isMesh,
    )!;
    rig.setTimeline({ cursor: -1, total: 10 }, []);
    run(0);
    const start = needle.rotation.y;
    run(5);
    expect(needle.rotation.y).toBeCloseTo(start, 3);
    rig.setTimeline({ cursor: 9, total: 10 }, []);
    run(0);
    expect(needle.rotation.y).not.toBeCloseTo(start, 1);
  });
});
