import { it, expect } from 'vitest';
import * as T from 'three';
import { MemoryModels } from './memory-models';
const tools = {
  track: <G extends T.Material | T.BufferGeometry | T.Texture>(g: G) => g,
  material: () => new T.MeshStandardMaterial(),
  label: () => {},
  animate: () => {},
};
it('classic_bank_capacity_matches_organization', () => {
  const g = new T.Group(),
    p = new Map<string, T.Object3D>();
  new MemoryModels(tools).classic(g, p);
  expect([...p.keys()].filter((k) => k.startsWith('dram-'))).toHaveLength(16);
  expect(g.userData['capacityBytes']).toBe(131072);
});
it('dimm_contacts_exist_on_both_faces', () => {
  const g = new T.Group(),
    p = new Map<string, T.Object3D>();
  new MemoryModels(tools).dimm(g, p);
  let counts: number[] = [];
  g.traverse((o) => {
    if (o instanceof T.InstancedMesh && o.name.startsWith('contacts-')) counts.push(o.count);
  });
  expect(counts).toEqual([144, 144]);
});
it('dimm_outline_matches_source', () => {
  const g = new T.Group(),
    p = new Map<string, T.Object3D>();
  new MemoryModels(tools).dimm(g, p);
  const board = g.getObjectByName('dimm-pcb')!;
  const size = new T.Box3().setFromObject(board).getSize(new T.Vector3());
  expect(size.x).toBeCloseTo(6.6675, 3);
  expect(size.y).toBeCloseTo(1.5625, 3);
  expect([...p.keys()].filter((k) => k.startsWith('dimm-chip-'))).toHaveLength(8);
});
it('classic_chip_packages_do_not_interpenetrate', () => {
  const g = new T.Group(),
    p = new Map<string, T.Object3D>();
  new MemoryModels(tools).classic(g, p);
  g.updateMatrixWorld(true);
  const chips = [...p]
    .filter(([id]) => id.startsWith('dram-'))
    .map(([, o]) => new T.Box3().setFromObject(o));
  for (let i = 0; i < chips.length; i++)
    for (let j = i + 1; j < chips.length; j++)
      expect(chips[i].intersectsBox(chips[j]), 'chips ' + i + ' / ' + j).toBe(false);
});

it('classic_terminal_feet_share_pcb_hole_axes', () => {
  const g = new T.Group(),
    p = new Map<string, T.Object3D>();
  new MemoryModels(tools).classic(g, p);
  g.updateMatrixWorld(true);
  const board = g.getObjectByName('classic-pcb') as T.Mesh;
  for (const name of ['dram-leads-front', 'dram-leads-rear']) {
    const leads = g.getObjectByName(name) as T.InstancedMesh;
    const vertices = leads.geometry.getAttribute('position'),
      foot: T.Vector3[] = [];
    for (let i = 0; i < vertices.count; i++) {
      const v = new T.Vector3().fromBufferAttribute(vertices, i);
      if (v.y < -0.2) foot.push(v);
    }
    expect(foot.length).toBeGreaterThan(0);
    const box = new T.Box3().setFromPoints(foot);
    expect(box.getCenter(new T.Vector3()).x).toBeCloseTo(0, 5);
    for (let i = 0; i < leads.count; i++) {
      const matrix = new T.Matrix4();
      leads.getMatrixAt(i, matrix);
      const center = new T.Vector3().setFromMatrixPosition(matrix);
      expect(
        new T.Raycaster(
          new T.Vector3(center.x, 1, center.z),
          new T.Vector3(0, -1, 0),
        ).intersectObject(board),
      ).toHaveLength(0);
      expect(box.min.y + center.y).toBeLessThan(0.155);
    }
  }
});
it('dimm_fingers_are_inserted_into_socket_clearance', () => {
  const g = new T.Group(),
    p = new Map<string, T.Object3D>();
  new MemoryModels(tools).dimm(g, p);
  g.updateMatrixWorld(true);
  const fingers = g.getObjectByName('contacts-1') as T.InstancedMesh;
  const socket = p.get('dimm-socket')!.children.find((o) => o instanceof T.Mesh)!;
  const bounds = new T.Box3().setFromObject(fingers),
    s = new T.Box3().setFromObject(socket);
  expect(bounds.min.y).toBeLessThan(s.max.y - 0.05);
  expect(bounds.min.y).toBeGreaterThan(s.min.y);
  expect(bounds.max.z).toBeLessThan(0.052 - 0.004);
});

it('dimm_latch_hooks_fit_retention_notches', () => {
  const g = new T.Group(),
    p = new Map<string, T.Object3D>();
  new MemoryModels(tools).dimm(g, p);
  g.updateMatrixWorld(true);
  for (const id of ['latch-left', 'latch-right']) {
    const latch = p.get(id)!,
      hook = new T.Box3().setFromObject(latch.children[1]);
    expect(hook.min.y).toBeGreaterThan(0.31 + 0.34);
    expect(hook.max.y).toBeLessThan(0.31 + 0.49);
    const inner = id === 'latch-left' ? -hook.max.x : hook.min.x;
    expect(inner).toBeGreaterThan(6.6675 / 2 - 0.08);
    expect(inner).toBeLessThan(6.6675 / 2);
  }
});
