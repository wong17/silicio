import { it, expect } from 'vitest';
import { GpuResources } from './gpu-resources';
it('gpu_resource_meter_tracks_native_allocation_and_release', () => {
  let id = 0,
    deleted = 0;
  const gl = {
    createBuffer: () => ({ id: ++id }),
    deleteBuffer: (_buffer?: { id: number }) => {
      deleted++;
    },
  };
  const original = gl.createBuffer,
    meter = new GpuResources(gl as unknown as WebGL2RenderingContext),
    one = gl.createBuffer();
  gl.createBuffer();
  expect(meter.bufferCount).toBe(2);
  gl.deleteBuffer(one);
  expect(meter.bufferCount).toBe(1);
  expect(deleted).toBe(1);
  meter.dispose();
  expect(gl.createBuffer).toBe(original);
  expect(one).toBeDefined();
});
