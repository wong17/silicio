/** Printed legends for the bench. Text shrinks to the canvas instead of being clipped at its edges. */
export const LABEL_FAMILY = '"IBM Plex Mono", ui-monospace, monospace';
export const LABEL_WIDTH = 512;
export const LABEL_HEIGHT = 96;
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
export function paintLabel(canvas: HTMLCanvasElement, text: string, color = '#ede5ca'): number {
  const c = canvas.getContext('2d')!;
  const measure = (size: number) => {
    c.font = `${size}px ${LABEL_FAMILY}`;
    return c.measureText(text).width;
  };
  const size = fitFontSize(measure, canvas.width - PADDING * 2);
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.font = `${size}px ${LABEL_FAMILY}`;
  c.fillStyle = color;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.fillText(text, canvas.width / 2, canvas.height * 0.62);
  return size;
}
