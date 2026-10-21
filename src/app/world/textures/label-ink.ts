/** WCAG contrast ratio between two relative luminances (0 to 1). */
export function contrastRatio(a: number, b: number): number {
  const hi = Math.max(a, b),
    lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/** Relative luminance of an sRGB hex colour. */
export function hexLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

export const INK = { light: '#f1ead2', dark: '#15120c' } as const;

export interface LabelOptions {
  /** `auto` picks whichever ink reads better on the host surface. */
  ink?: 'auto' | 'light' | 'dark';
  /** Prints an opaque plate behind the text, for worn or busy surfaces. */
  plate?: boolean;
  /** Host surface colour (sRGB hex); defaults to the parent mesh colour. */
  host?: string;
  /** Exact ink colour, for legends that imitate a display (the monitor's phosphor). */
  color?: string;
  /** Largest font size, in px of a 512-wide canvas; the default suits a printed legend, a screen wants more. */
  maxSize?: number;
  /** Stands the legend up (facing +z) instead of lying it flat on the board. */
  upright?: boolean;
}

/** Ink and outline for a surface of the given relative luminance: the better-contrasting ink, outlined in the opposite tone. */
export function pickInk(surfaceLuminance: number): { ink: string; outline: string } {
  const light = contrastRatio(hexLuminance(INK.light), surfaceLuminance);
  const dark = contrastRatio(hexLuminance(INK.dark), surfaceLuminance);
  return light >= dark ? { ink: INK.light, outline: INK.dark } : { ink: INK.dark, outline: INK.light };
}
