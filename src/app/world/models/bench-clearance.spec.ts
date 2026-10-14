import { it, expect } from 'vitest';
import * as T from 'three';
import { WorkbenchRoomModel } from './workbench-room.model';
import { WorkbenchPropsModel } from './workbench-props.model';
import { BENCH } from './bench-layout';

/** Geometry-only tools: no canvas context is needed, so the models build headless. */
const tools = {
  track: <G>(resource: G): G => resource,
  material: (_id: string, color: string) => new T.MeshStandardMaterial({ color }),
  label: () => {},
  animate: () => {},
};

function bench(): { scene: T.Group; parts: Map<string, T.Object3D> } {
  const scene = new T.Group();
  const parts = new Map<string, T.Object3D>();
  new WorkbenchRoomModel(tools).build(scene, parts);
  scene.updateMatrixWorld(true);
  return { scene, parts };
}

// Under a millimetre of real scale (one unit is about 2 cm): enough to call an object resting on a surface.
const tolerance = 0.04;

it('objects on the worktop stand on it, with no gap and no sinking', () => {
  const { parts } = bench();
  for (const id of ['scope', 'power', 'multimeter', 'solder-station', 'solder-spool', 'parts', 'chips', 'notebook', 'mug']) {
    const object = parts.get(id);
    expect(object, id).toBeDefined();
    const bottom = new T.Box3().setFromObject(object!).min.y;
    expect(Math.abs(bottom - BENCH.top), id).toBeLessThan(tolerance);
  }
});

it('the probe lies on the mat, not in the air', () => {
  const { parts } = bench();
  const bottom = new T.Box3().setFromObject(parts.get('probe')!).min.y;
  expect(Math.abs(bottom - BENCH.matTop)).toBeLessThan(tolerance);
});

it('every tool rests on the tray top', () => {
  const { parts } = bench();
  const trayTop = BENCH.matTop + 0.12;
  for (const id of ['tool', 'tool-1', 'tool-2']) {
    const bottom = new T.Box3().setFromObject(parts.get(id)!).min.y;
    expect(Math.abs(bottom - trayTop), id).toBeLessThan(tolerance);
  }
});

it('leads never pass through the tray, the tools, the scope or the supply', () => {
  const { scene, parts } = bench();
  const trayBox = new T.Box3(
    new T.Vector3(BENCH.tray.x - 0.625, BENCH.matTop, BENCH.tray.z - 1.85),
    new T.Vector3(BENCH.tray.x + 0.625, BENCH.matTop + 0.12, BENCH.tray.z + 1.85),
  );
  const solids = ['scope', 'power', 'probe', 'tool', 'tool-1', 'tool-2', 'multimeter', 'solder-station'].map((id) =>
    new T.Box3().setFromObject(parts.get(id)!),
  );
  solids.push(trayBox);
  // Shrink each box a little: a lead may touch a surface, it may not sink into it.
  const inside = (p: T.Vector3) =>
    solids.some((b) => b.clone().expandByScalar(-0.02).containsPoint(p));
  const leads: T.Object3D[] = [];
  scene.traverse((o) => {
    if (o.userData['part'] === 'cable') leads.push(...o.children);
  });
  expect(leads.length).toBeGreaterThan(0);
  for (const lead of leads) {
    const positions = (lead as T.Mesh).geometry.getAttribute('position');
    const point = new T.Vector3();
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(lead.matrixWorld);
      expect(inside(point), `vertex ${i}`).toBe(false);
    }
  }
});

it('props that carry leads keep their leads out of the bench objects', () => {
  const scene = new T.Group();
  const parts = new Map<string, T.Object3D>();
  new WorkbenchPropsModel(tools).build(scene, parts);
  scene.updateMatrixWorld(true);
  const meter = parts.get('multimeter')!;
  const bounds = new T.Box3().setFromObject(meter);
  expect(bounds.min.y).toBeGreaterThan(BENCH.top - tolerance);
});

it('logical_window_rests_on_the_mat', async () => {
  const { StationBuilder } = await import('./station-builder');
  const { CLASSIC_BOARD_BASE } = await import('./intel-2164a-memory.model');
  const labels: { text: string; y: number }[] = [];
  const spy = {
    ...tools,
    label: (_p: T.Object3D, text: string, _x: number, y: number) => {
      labels.push({ text, y });
    },
  };
  const root = new T.Group();
  new StationBuilder(spy).build('memory', 'classic', root, new Map());
  const window = labels.find((l) => l.text.startsWith('VENTANA'))!;
  expect(window.y - CLASSIC_BOARD_BASE).toBeGreaterThan(0.004);
  expect(window.y - CLASSIC_BOARD_BASE).toBeLessThan(0.03);
});
