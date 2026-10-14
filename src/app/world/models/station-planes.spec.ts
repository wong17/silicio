import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { StationBuilder } from './station-builder';
import type { Section } from '../scene-inputs';

interface LabelCall {
  parent: T.Object3D;
  text: string;
  y: number;
}

function build(section: Section, variant: 'classic' | 'dimm') {
  const labels: LabelCall[] = [];
  const tools = {
    track: <G>(resource: G): G => resource,
    material: (_id: string, color: string) => new T.MeshStandardMaterial({ color }),
    label: (parent: T.Object3D, text: string, _x: number, y: number) => labels.push({ parent, text, y }),
    animate: () => {},
  };
  const root = new T.Group();
  new StationBuilder(tools).build(section, variant, root, new Map());
  root.updateMatrixWorld(true);
  return { root, labels };
}

const STATIONS: [Section, 'classic' | 'dimm'][] = [
  ['8086', 'classic'],
  ['memory', 'classic'],
  ['memory', 'dimm'],
  ['apple', 'classic'],
  ['time', 'classic'],
  ['machine', 'classic'],
];

interface Face {
  id: string;
  axis: number;
  sign: number;
  c: number;
  lo: [number, number];
  hi: [number, number];
}

function axisAligned(m: T.Matrix4): boolean {
  const e = m.elements;
  for (let col = 0; col < 3; col++) {
    const n = [e[col * 4], e[col * 4 + 1], e[col * 4 + 2]].filter((v) => Math.abs(v) > 1e-6).length;
    if (n !== 1) return false;
  }
  return true;
}

function boxFaces(root: T.Object3D): Face[] {
  const faces: Face[] = [];
  let serial = 0;
  root.traverse((o) => {
    if (!(o instanceof T.Mesh) || !axisAligned(o.matrixWorld)) return;
    if (!o.geometry.type.endsWith('BoxGeometry')) return;
    o.geometry.computeBoundingBox();
    const box = o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld);
    const id = `${o.name || o.geometry.type}#${serial++}`;
    const mn = [box.min.x, box.min.y, box.min.z],
      mx = [box.max.x, box.max.y, box.max.z];
    for (let axis = 0; axis < 3; axis++) {
      const others = [0, 1, 2].filter((a) => a !== axis);
      for (const sign of [-1, 1])
        faces.push({
          id,
          axis,
          sign,
          c: sign > 0 ? mx[axis] : mn[axis],
          lo: [mn[others[0]], mn[others[1]]],
          hi: [mx[others[0]], mx[others[1]]],
        });
    }
  });
  return faces;
}

describe('estaciones: planos y apoyos', () => {
  it('stations_have_no_coplanar_faces', () => {
    for (const [section, variant] of STATIONS) {
      const { root } = build(section, variant);
      const faces = boxFaces(root).filter((f) => f.axis === 1 && f.sign > 0);
      expect(faces.length, section + ' has box faces').toBeGreaterThan(5);
      const found: string[] = [];
      for (let i = 0; i < faces.length; i++)
        for (let j = i + 1; j < faces.length; j++) {
          const a = faces[i],
            b = faces[j];
          if (Math.abs(a.c - b.c) > 0.002) continue;
          const o0 = Math.min(a.hi[0], b.hi[0]) - Math.max(a.lo[0], b.lo[0]);
          const o1 = Math.min(a.hi[1], b.hi[1]) - Math.max(a.lo[1], b.lo[1]);
          if (o0 > 0.005 && o1 > 0.005 && o0 * o1 > 0.05)
            found.push(`${a.id} <> ${b.id} y=${a.c.toFixed(3)} area=${(o0 * o1).toFixed(2)}`);
        }
      expect(found, `${section}/${variant}`).toEqual([]);
    }
  });

  it('labels_sit_above_their_host_surface', () => {
    for (const [section, variant] of STATIONS) {
      const { labels } = build(section, variant);
      const bad: string[] = [];
      expect(labels.length, section + ' has labels').toBeGreaterThan(0);
      for (const l of labels) {
        const host = l.parent;
        if (!(host instanceof T.Mesh)) continue;
        host.geometry.computeBoundingBox();
        const top = host.geometry.boundingBox!.max.y * host.scale.y;
        const lift = l.y - top;
        if (lift < 0.004 || lift > 0.03) bad.push(`${l.text} lift=${lift.toFixed(4)}`);
      }
      expect(bad, `${section}/${variant}`).toEqual([]);
    }
  });
});
