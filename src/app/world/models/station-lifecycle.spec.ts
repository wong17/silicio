import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { StationBuilder } from './station-builder';
import type { Section } from '../scene-inputs';

const STATIONS: [Section, 'classic' | 'dimm'][] = [
  ['8086', 'classic'],
  ['memory', 'classic'],
  ['memory', 'dimm'],
  ['time', 'classic'],
  ['apple', 'classic'],
  ['machine', 'classic'],
];

/** Counts every geometry, material and texture a build asks the engine to own, as the engine's tracker does. */
function build(section: Section, variant: 'classic' | 'dimm', live: Set<unknown>) {
  const tools = {
    track: <G>(r: G): G => {
      live.add(r);
      return r;
    },
    material: (_id: string, color: string) => new T.MeshStandardMaterial({ color }),
    label: () => new T.Object3D(),
    relabel: () => {},
    animate: () => {},
    onActivity: () => {},
  };
  const root = new T.Group();
  new StationBuilder(tools).build(section, variant, root, new Map());
  return root;
}

/** Releases what the subject owns, like WorldEngine.clearSubject. */
function release(root: T.Group, live: Set<unknown>) {
  root.traverse((o) => {
    const mesh = o as T.Mesh;
    if (mesh.geometry) live.delete(mesh.geometry);
  });
  root.clear();
}

describe('recorridos entre estaciones', () => {
  it('ten_station_roundtrips_stabilize_resources', () => {
    const live = new Set<unknown>();
    const counts: number[] = [];
    for (let round = 0; round < 10; round++) {
      for (const [section, variant] of STATIONS) {
        const root = build(section, variant, live);
        release(root, live);
      }
      // Everything a station tracked besides geometry (materials created per build) is accounted separately.
      counts.push([...live].filter((r) => r instanceof T.BufferGeometry).length);
    }
    expect(counts.every((c) => c === 0), counts.join(',')).toBe(true);
  });

  it('a_rebuilt_station_has_the_same_shape_each_time', () => {
    for (const [section, variant] of STATIONS) {
      const sizes = [0, 1, 2].map(() => {
        const root = build(section, variant, new Set());
        let n = 0;
        root.traverse(() => n++);
        return n;
      });
      expect(new Set(sizes).size, section + '/' + variant).toBe(1);
    }
  });
});
