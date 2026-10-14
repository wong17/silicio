/** Printed legends for the bench. Text shrinks to the canvas instead of being clipped at its edges. */
export const LABEL_FAMILY = '"IBM Plex Mono", ui-monospace, monospace';
export const LABEL_WIDTH = 1024;
export const LABEL_HEIGHT = 192;
const PADDING = 24;

/** Largest size from `max` down to `min` whose measured width fits; `min` is the floor. */
export function fitFontSize(
  measure: (size: number) => number,
  maxWidth: number,
  max = 26,
  min = 12,
): number {
  for (let size = max; size > min; size--) if (measure(size) <= maxWidth) return size;
  return min;
}

/** Draws `text` centred on a label canvas and returns the font size actually used. */
export function paintLabel(
  canvas: HTMLCanvasElement,
  text: string,
  ink = '#ede5ca',
  outline = '#15120c',
  plate = false,
): number {
  const c = canvas.getContext('2d')!;
  const scale = canvas.width / 512;
  const font = (size: number) => `600 ${size}px ${LABEL_FAMILY}`;
  const measure = (size: number) => {
    c.font = font(size);
    return c.measureText(text).width;
  };
  const size = fitFontSize(measure, canvas.width - PADDING * 2 * scale, 26 * scale, 12 * scale);
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.font = font(size);
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  const baseline = canvas.height * 0.62;
  if (plate) {
    const w = Math.min(canvas.width - 8, measure(size) + 40 * scale);
    c.fillStyle = outline;
    c.globalAlpha = 0.88;
    c.fillRect((canvas.width - w) / 2, canvas.height * 0.12, w, canvas.height * 0.76);
    c.globalAlpha = 1;
  }
  c.lineJoin = 'round';
  c.lineWidth = 2 * scale;
  c.strokeStyle = outline;
  c.globalAlpha = 0.35;
  c.strokeText(text, canvas.width / 2, baseline);
  c.globalAlpha = 1;
  c.fillStyle = ink;
  c.fillText(text, canvas.width / 2, baseline);
  return size;
}
