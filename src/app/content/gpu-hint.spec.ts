import { describe, expect, it } from 'vitest';
import { isWeakGpu } from './gpu-hint';

describe('pista de GPU débil', () => {
  it('flags_old_and_software_renderers', () => {
    expect(isWeakGpu('ANGLE (NVIDIA, NVIDIA GeForce GT 730 (0x00001287) Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe(true);
    expect(isWeakGpu('ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11)')).toBe(true);
    expect(isWeakGpu('Google SwiftShader')).toBe(true);
  });
  it('leaves_capable_gpus_alone', () => {
    expect(isWeakGpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)')).toBe(false);
    expect(isWeakGpu('ANGLE (Apple, Apple M2, OpenGL 4.1)')).toBe(false);
    expect(isWeakGpu(undefined)).toBe(false);
  });
});
