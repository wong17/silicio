export function bindCancellation(
  canvas: HTMLElement,
  host: Window,
  cancel: () => void,
): () => void {
  const events = ['pointercancel', 'lostpointercapture'];
  for (const e of events) canvas.addEventListener(e, cancel);
  host.addEventListener('blur', cancel);
  return () => {
    for (const e of events) canvas.removeEventListener(e, cancel);
    host.removeEventListener('blur', cancel);
  };
}
export function applyInputPolicy(
  controls: { enableRotate: boolean; enabled: boolean },
  canvas: HTMLElement,
  mobile: boolean,
  manipulate: boolean,
): void {
  controls.enableRotate = !mobile || manipulate;
  canvas.style.touchAction = mobile && !manipulate ? 'pan-y' : 'none';
}
