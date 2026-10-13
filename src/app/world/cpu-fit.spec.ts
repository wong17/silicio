import { it, expect } from 'vitest';
import * as T from 'three';
import { ElectronicsWorkshop } from './electronics-workshop';
const tools = {
  track: <G extends T.Material | T.BufferGeometry | T.Texture>(g: G) => g,
  material: () => new T.MeshStandardMaterial(),
  label: () => {},
  animate: () => {},
};
it('all_40_lead_feet_are_centered_in_their_plated_contacts', () => {
  const root = new T.Group(),
    parts = new Map<string, T.Object3D>();
  new ElectronicsWorkshop(tools).cpu(root, parts);
  root.updateMatrixWorld(true);
  for (let n = 1; n <= 40; n++) {
    const pin = parts.get('pin-' + n)!.children[0] as T.Mesh,
      pad = root.getObjectByName('pad-' + n);
    expect(pad, 'contact ' + n).toBeDefined();
    const c = pad!.getWorldPosition(new T.Vector3()),
      foot = new T.Box3();
    const pos = pin.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const v = new T.Vector3().fromBufferAttribute(pos, i).applyMatrix4(pin.matrixWorld);
      if (v.y < 0.4) foot.expandByPoint(v);
    }
    const center = foot.getCenter(new T.Vector3());
    expect(center.x, 'pin ' + n + ' X').toBeCloseTo(c.x, 5);
    expect(center.z, 'pin ' + n + ' Z').toBeCloseTo(c.z, 5);
    expect(foot.min.y).toBeLessThan(0.14);
    expect(Math.hypot((foot.max.x - foot.min.x) / 2, (foot.max.z - foot.min.z) / 2)).toBeLessThan(
      0.072,
    );
  }
});
it('pcb_has_real_openings_at_every_lead_axis', () => {
  const root = new T.Group(),
    parts = new Map<string, T.Object3D>();
  new ElectronicsWorkshop(tools).cpu(root, parts);
  root.updateMatrixWorld(true);
  const pcb = root.getObjectByName('pcb')!;
  for (let n = 1; n <= 40; n++) {
    const pad = root.getObjectByName('pad-' + n);
    expect(pad).toBeDefined();
    const p = pad!.getWorldPosition(new T.Vector3());
    const ray = new T.Raycaster(new T.Vector3(p.x, 0.5, p.z), new T.Vector3(0, -1, 0));
    expect(ray.intersectObject(pcb)).toHaveLength(0);
  }
});

it('socket_channels_clear_all_terminal_shanks', () => {
  const root = new T.Group(),
    parts = new Map<string, T.Object3D>();
  new ElectronicsWorkshop(tools).cpu(root, parts);
  root.updateMatrixWorld(true);
  for (let n = 1; n <= 40; n++) {
    const center = root.getObjectByName('pad-' + n)!.getWorldPosition(new T.Vector3()),
      side = Math.sign(center.z);
    for (const dx of [-0.04, 0.04]) {
      const ray = new T.Raycaster(
        new T.Vector3(center.x + dx, 0.8, center.z - side * 0.03),
        new T.Vector3(0, -1, 0),
      );
      expect(ray.intersectObject(parts.get('socket')!, true), 'socket pin ' + n).toHaveLength(0);
    }
  }
});
it('ceramic_is_supported_above_socket_rails', () => {
  const root = new T.Group(),
    parts = new Map<string, T.Object3D>();
  new ElectronicsWorkshop(tools).cpu(root, parts);
  root.updateMatrixWorld(true);
  const body = new T.Box3().setFromObject(root.getObjectByName('ceramic-body')!);
  for (const rail of parts.get('socket')!.children.slice(1, 3)) {
    const box = new T.Box3().setFromObject(rail);
    expect(box.max.y).toBeLessThanOrEqual(body.min.y + 0.00001);
    expect(body.min.y - box.max.y).toBeLessThan(0.00001);
  }
  const board = new T.Box3().setFromObject(root.getObjectByName('pcb')!),
    socket = new T.Box3().setFromObject(parts.get('socket')!);
  expect(socket.min.y).toBeCloseTo(board.max.y, 5);
});
it('terminal_shoulders_enter_only_the_package_contact_band', () => {
  const root = new T.Group(),
    parts = new Map<string, T.Object3D>();
  new ElectronicsWorkshop(tools).cpu(root, parts);
  root.updateMatrixWorld(true);
  const body = new T.Box3().setFromObject(root.getObjectByName('ceramic-body')!);
  for (let n = 1; n <= 40; n++) {
    const pin = parts.get('pin-' + n)!.children[0] as T.Mesh,
      vertices = pin.geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const v = new T.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(pin.matrixWorld);
      if (Math.abs(v.z) < 1.006) {
        expect(Math.abs(v.z), 'inner edge pin ' + n).toBeGreaterThan(body.max.z - 0.016);
        expect(v.y).toBeGreaterThan(body.max.y - 0.014);
        expect(v.y).toBeLessThan(body.max.y + 0.065);
      }
    }
  }
});
it('closed_lid_clears_the_ceramic_sealing_surface', () => {
  const root = new T.Group(),
    parts = new Map<string, T.Object3D>();
  new ElectronicsWorkshop(tools).cpu(root, parts);
  root.updateMatrixWorld(true);
  const body = new T.Box3().setFromObject(root.getObjectByName('ceramic-body')!),
    lid = new T.Box3().setFromObject(parts.get('lid')!.children[0]);
  expect(lid.min.y - body.max.y).toBeCloseTo(0.008, 5);
});
