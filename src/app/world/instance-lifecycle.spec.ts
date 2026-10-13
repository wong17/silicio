import { it, expect } from 'vitest';
import * as T from 'three';
import { releaseInstanceBuffers } from './instance-lifecycle';
it('retired_instances_release_gpu_buffers', () => {
  const root = new T.Group(),
    g = new T.BoxGeometry(),
    m = new T.MeshBasicMaterial();
  let released = 0;
  for (let i = 0; i < 4; i++) {
    const instance = new T.InstancedMesh(g, m, 20);
    instance.addEventListener('dispose', () => released++);
    root.add(instance);
  }
  root.add(new T.Mesh(g, m));
  releaseInstanceBuffers(root);
  expect(released).toBe(4);
});
