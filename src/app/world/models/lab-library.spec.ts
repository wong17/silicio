import { afterAll, beforeAll, it, expect, vi } from 'vitest';
import * as T from 'three';
import { LabLibraryModel } from './lab-library.model';
import { BENCH } from './bench-layout';

/**
 * jsdom has no 2D canvas. A recording stand-in lets the painters run here, so a broken painter fails in the
 * test instead of in the browser, where the atlases are painted while the room is built.
 */
function stubContext(): CanvasRenderingContext2D {
  const known: Record<string, unknown> = {
    measureText: () => ({ width: 40 }),
    createRadialGradient: () => ({ addColorStop: () => undefined }),
  };
  return new Proxy(known, {
    get: (target, key) => (key in target ? Reflect.get(target, key) : () => undefined),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => stubContext() as never);
});

afterAll(() => {
  vi.restoreAllMocks();
});

/** Geometry-only tools: label canvases and surface maps are skipped, so the model builds headless. */
const tools = {
  track: <G>(resource: G): G => resource,
  material: (_id: string, color: string) => new T.MeshStandardMaterial({ color }),
  label: () => {},
  animate: () => {},
};

function library(): T.Group {
  const scene = new T.Group();
  new LabLibraryModel(tools).build(scene);
  scene.updateMatrixWorld(true);
  return scene;
}

/** Visits every mesh with its world box. An instanced mesh is visited once per instance, from its matrices. */
function forEachBox(scene: T.Object3D, visit: (box: T.Box3, name: string) => void): void {
  const instance = new T.Matrix4();
  const world = new T.Matrix4();
  scene.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    if (o instanceof T.InstancedMesh) {
      o.geometry.computeBoundingBox();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, instance);
        world.multiplyMatrices(o.matrixWorld, instance);
        visit(new T.Box3().copy(o.geometry.boundingBox!).applyMatrix4(world), `instance ${i}`);
      }
    } else {
      visit(new T.Box3().setFromObject(o, true), o.name || o.type);
    }
  });
}

// Scene units: x from the left wall (-38) to the right wall (38), z from the back plaster (-9.7) to the front (38).
const room = { min: new T.Vector3(-38.6, -8.4, -10), max: new T.Vector3(38.6, 18.4, 38.6) };

it('builds headless, casts no shadows and stays within a light mesh budget', () => {
  const scene = new T.Group();
  expect(() => new LabLibraryModel(tools).build(scene)).not.toThrow();
  let meshes = 0;
  scene.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    meshes++;
    expect(o.castShadow).toBe(false);
  });
  expect(meshes).toBeGreaterThanOrEqual(40);
  expect(meshes).toBeLessThan(250);
});

it('keeps every mesh and every instance inside the room shell and above the floor', () => {
  const outside: string[] = [];
  forEachBox(library(), (box, name) => {
    const inside =
      box.min.x >= room.min.x &&
      box.max.x <= room.max.x &&
      box.min.z >= room.min.z &&
      box.max.z <= room.max.z &&
      box.min.y >= BENCH.floor - 0.02 &&
      box.max.y <= room.max.y;
    if (!inside) outside.push(name);
  });
  expect(outside).toEqual([]);
});

it('leaves the walkway in front of the bench clear', () => {
  const blocked: string[] = [];
  forEachBox(library(), (box, name) => {
    if (box.min.x < 24 && box.max.x > -24 && box.min.z < 20) blocked.push(name);
  });
  expect(blocked).toEqual([]);
});
