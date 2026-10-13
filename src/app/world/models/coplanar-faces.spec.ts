import { expect, it } from 'vitest';
import * as T from 'three';
import { CAMERA_LIMITS } from '../room-bounds';
import { BENCH } from './bench-layout';
import { WorkbenchRoomModel } from './workbench-room.model';

/** Geometry-only tools, as in bench-clearance.spec.ts: the model builds headless. */
const tools = {
  track: <G>(resource: G): G => resource,
  material: (_id: string, color: string) => new T.MeshStandardMaterial({ color }),
  label: () => {},
  animate: () => {},
};

/**
 * A flat face in world space: it faces +/- one axis, lies at `c` on that axis and spans `lo`..`hi` on the others.
 * Two faces facing the same way on the same plane, and overlapping, z-fight: the depth buffer cannot tell them
 * apart, so the pixel flickers between their colours as the camera moves.
 */
interface Face {
  id: string;
  axis: number;
  sign: number;
  c: number;
  lo: [number, number];
  hi: [number, number];
  at: string;
}

const EPS = 0.002;
/**
 * Where the camera can stand: inside the walls, above the worktop and below the ceiling. A face is seen only from
 * the side its normal points to, so a face whose side the camera can never reach is left out.
 */
const REACH: [number, number][] = [
  [CAMERA_LIMITS.x[0], CAMERA_LIMITS.x[1]],
  [BENCH.top + 0.01, CAMERA_LIMITS.y[1]],
  [CAMERA_LIMITS.z[0], CAMERA_LIMITS.z[1]],
];

function worldBox(m: T.Matrix4, local: T.Box3): T.Box3 {
  const out = new T.Box3();
  const p = new T.Vector3();
  for (const x of [local.min.x, local.max.x])
    for (const y of [local.min.y, local.max.y])
      for (const z of [local.min.z, local.max.z]) out.expandByPoint(p.set(x, y, z).applyMatrix4(m));
  return out;
}

function axisAligned(m: T.Matrix4): boolean {
  const e = m.elements;
  for (let col = 0; col < 3; col++) {
    const nonZero = [e[col * 4], e[col * 4 + 1], e[col * 4 + 2]].filter((v) => Math.abs(v) > 1e-6).length;
    if (nonZero !== 1) return false;
  }
  return true;
}

function faceAt(box: T.Box3, axis: number, sign: number, id: string, faces: Face[]): void {
  const mn = [box.min.x, box.min.y, box.min.z],
    mx = [box.max.x, box.max.y, box.max.z];
  const c = sign > 0 ? mx[axis] : mn[axis];
  const [low, high] = REACH[axis];
  if (sign > 0 ? c >= high : c <= low) return;
  const others = [0, 1, 2].filter((a) => a !== axis);
  const centre = box.getCenter(new T.Vector3());
  faces.push({
    id,
    axis,
    sign,
    c,
    lo: [mn[others[0]], mn[others[1]]],
    hi: [mx[others[0]], mx[others[1]]],
    at: `(${centre.x.toFixed(2)}, ${centre.y.toFixed(2)}, ${centre.z.toFixed(2)})`,
  });
}

function addObject(m: T.Matrix4, local: T.Box3, kind: 'box' | 'plane', id: string, faces: Face[]): void {
  if (!axisAligned(m)) return;
  const box = worldBox(m, local);
  if (kind === 'box') {
    for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) faceAt(box, axis, sign, id, faces);
    return;
  }
  const size = box.getSize(new T.Vector3());
  const axis = [size.x, size.y, size.z].findIndex((s) => s < 1e-6);
  if (axis < 0) return;
  const normal = new T.Vector3(0, 0, 1).transformDirection(m);
  faceAt(box, axis, Math.sign(normal.getComponent(axis)) || 1, id, faces);
}

it('lists visible flat faces that share a plane and overlap (z-fighting)', () => {
  const scene = new T.Group();
  new WorkbenchRoomModel(tools).build(scene, new Map());
  scene.updateMatrixWorld(true);

  const faces: Face[] = [];
  const instance = new T.Matrix4();
  const world = new T.Matrix4();
  let serial = 0;
  scene.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const type = o.geometry.type;
    const kind = type.endsWith('BoxGeometry') ? 'box' : type === 'PlaneGeometry' ? 'plane' : null;
    if (!kind) return;
    o.geometry.computeBoundingBox();
    const local = o.geometry.boundingBox!;
    if (o instanceof T.InstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, instance);
        world.multiplyMatrices(o.matrixWorld, instance);
        addObject(world, local, kind, `${o.name || type}#${serial++}`, faces);
      }
    } else {
      addObject(o.matrixWorld, local, kind, `${o.name || type}#${serial++}`, faces);
    }
  });

  const groups = new Map<string, Face[]>();
  for (const f of faces) {
    const key = `${f.axis}:${f.sign}`;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  const found: { area: number; text: string }[] = [];
  for (const [key, list] of groups) {
    list.sort((a, b) => a.c - b.c);
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length && list[j].c - list[i].c <= EPS; j++) {
        const a = list[i],
          b = list[j];
        if (a.id === b.id) continue;
        const o0 = Math.min(a.hi[0], b.hi[0]) - Math.max(a.lo[0], b.lo[0]);
        const o1 = Math.min(a.hi[1], b.hi[1]) - Math.max(a.lo[1], b.lo[1]);
        if (o0 > 0.005 && o1 > 0.005)
          found.push({
            area: o0 * o1,
            text: `${key} c=${a.c.toFixed(3)} area=${(o0 * o1).toFixed(3)} | ${a.id} ${a.at} <> ${b.id} ${b.at}`,
          });
      }
  }
  // Slivers under 0.05 square units are seams between two sheets, not a fight a viewer can see.
  const visible = found.filter((f) => f.area > 0.05).sort((a, b) => b.area - a.area);
  const top = visible.slice(0, 60).map((f) => f.text);
  expect(faces.length, 'the bench was built').toBeGreaterThan(100);
  expect(top, `${visible.length} coplanar overlapping pairs, largest first:\n${top.join('\n')}`).toEqual([]);
});
