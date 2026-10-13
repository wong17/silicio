import { it, expect } from 'vitest';
import { bindCancellation, applyInputPolicy } from './scene-input';
it('capture_loss_and_blur_cancel_manipulation', () => {
  const canvas = document.createElement('canvas');
  let held = true;
  const dispose = bindCancellation(canvas, window, () => (held = false));
  canvas.dispatchEvent(new Event('lostpointercapture'));
  expect(held).toBe(false);
  held = true;
  window.dispatchEvent(new Event('blur'));
  expect(held).toBe(false);
  dispose();
  held = true;
  window.dispatchEvent(new Event('blur'));
  expect(held).toBe(true);
});
it('mobile_starts_with_scroll_and_explicit_orbit', () => {
  const c = { enabled: true, enableRotate: true },
    canvas = document.createElement('canvas');
  applyInputPolicy(c, canvas, true, false);
  expect(c.enableRotate).toBe(false);
  expect(canvas.style.touchAction).toBe('pan-y');
  applyInputPolicy(c, canvas, true, true);
  expect(c.enableRotate).toBe(true);
  expect(canvas.style.touchAction).toBe('none');
});
