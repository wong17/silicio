import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { StationBuilder } from './station-builder';
import { APPLE_UNITS } from '../../content/apple-m5';
import { IDLE_ACTIVITY, projectBufferActivity, type StationActivity } from '../../laboratory/station-activity';

function harness() {
  let listener: ((a: StationActivity) => void) | undefined;
  const animators: ((t: number) => void)[] = [];
  const tools = {
    track: <G>(r: G): G => r,
    material: (_id: string, color: string) => new T.MeshStandardMaterial({ color }),
    label: () => new T.Object3D(),
    relabel: () => {},
    animate: (fn: (t: number) => void) => {
      animators.push(fn);
    },
    onActivity: (fn: (a: StationActivity) => void) => {
      listener = fn;
      fn(IDLE_ACTIVITY);
    },
  };
  const root = new T.Group();
  const parts = new Map<string, T.Object3D>();
  new StationBuilder(tools).build('apple', 'classic', root, parts);
  root.updateMatrixWorld(true);
  const send = (stage: 0 | 1 | 2, separate = false) => {
    listener!(projectBufferActivity({ stage, completed: stage === 2, separate, version: stage === 2 ? 1 : 0 }, 's', stage));
    animators.forEach((fn) => fn(0));
    root.updateMatrixWorld(true);
  };
  return { root, parts, send };
}

describe('Apple M5: dependencia de buffer', () => {
  it('buffer_tile_never_moves_between_units', () => {
    const { root, send } = harness();
    const b0 = root.getObjectByName('buffer-b0')!;
    send(0);
    const first = b0.getWorldPosition(new T.Vector3());
    for (const stage of [1, 2, 0] as const) {
      send(stage);
      const now = b0.getWorldPosition(new T.Vector3());
      expect(now.distanceTo(first)).toBeLessThan(1e-9);
    }
  });

  it('core_counts_match_the_panel', () => {
    const { root } = harness();
    for (const unit of APPLE_UNITS.filter((u) => u.cores)) {
      let n = 0;
      root.traverse((o) => {
        if (o.name.startsWith('core-' + unit.id + '-')) n++;
      });
      expect(n, unit.id).toBe(unit.cores);
    }
    expect(APPLE_UNITS.find((u) => u.id === 'performance')!.cores).toBe(4);
    expect(APPLE_UNITS.find((u) => u.id === 'efficiency')!.cores).toBe(6);
  });

  it('gpu_stage_links_the_gpu_to_the_same_buffer', () => {
    const { root, send } = harness();
    send(1);
    expect(root.getObjectByName('link-gpu-b0')!.visible).toBe(true);
    expect(root.getObjectByName('link-gpu-b1')!.visible).toBe(true);
    expect(root.getObjectByName('link-performance-b0')!.visible).toBe(false);
  });

  it('cpu_reads_b1_only_after_completion', () => {
    const { root, send } = harness();
    send(1);
    expect(root.getObjectByName('link-performance-b1')!.visible).toBe(false);
    send(2);
    expect(root.getObjectByName('link-performance-b1')!.visible).toBe(true);
  });

  it('separate_memory_shows_a_copy_instead_of_links', () => {
    const { root, send } = harness();
    send(1, true);
    expect(root.getObjectByName('buffer-b0-copy')!.visible).toBe(true);
    expect(root.getObjectByName('link-gpu-b0')!.visible).toBe(false);
    const copy = root.getObjectByName('buffer-b0-copy')!;
    const gpu = root.getObjectByName('memory-gpu')!;
    expect(copy.position.x).toBeCloseTo(gpu.position.x, 5);
  });
});
