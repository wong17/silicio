/** A name to place next to its anchor, with the size of its plate (CSS pixels). */
export interface LabelRequest {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedLabel extends Box {
  id: string;
  /** Index of the candidate position; kept between frames while it stays free. */
  candidate: number;
  /** The plate stands far from its anchor and needs a short guide line. */
  lead: boolean;
}

const NEAR = 12;
const FAR = 40;
const DOT = 10;
const MARGIN = 4;
const MAX_WIDTH = 176;
const CHAR = 8;
const PADDING = 18;
export const LINE_HEIGHT = { one: 26, two: 42 };

/** Plate size for a name: one line up to 176 px, otherwise two lines; never cut. */
export function estimateLabelSize(text: string): { width: number; height: number } {
  const oneLine = PADDING + text.length * CHAR;
  return oneLine <= MAX_WIDTH
    ? { width: Math.ceil(oneLine), height: LINE_HEIGHT.one }
    : { width: MAX_WIDTH, height: LINE_HEIGHT.two };
}

/** Eight places around the anchor (right first), near and then far. */
function candidate(index: number, r: LabelRequest): Box {
  const g = index < 8 ? NEAR : FAR;
  const d = g * 0.7;
  const { x, y, width: w, height: h } = r;
  const spots: [number, number][] = [
    [x + g, y - h / 2],
    [x - g - w, y - h / 2],
    [x - w / 2, y - g - h],
    [x - w / 2, y + g],
    [x + d, y - d - h],
    [x - d - w, y - d - h],
    [x + d, y + d],
    [x - d - w, y + d],
  ];
  const [cx, cy] = spots[index % 8];
  return { x: Math.round(cx), y: Math.round(cy), width: w, height: h };
}

const CANDIDATES = 16;

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const inside = (a: Box, b: Box) =>
  a.x >= b.x + MARGIN && a.y >= b.y + MARGIN && a.x + a.width <= b.x + b.width - MARGIN && a.y + a.height <= b.y + b.height - MARGIN;

/**
 * Places each name, in priority order, at the first free spot around its own anchor, keeping last frame's
 * spot while it stays free. A name with no free spot is left out (its marker remains): names are never
 * pushed into a column or across the model.
 */
export function placeLabels(
  requests: readonly LabelRequest[],
  obstacles: readonly Box[],
  bounds: Box,
  previous: ReadonlyMap<string, number>,
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  for (const r of requests) {
    const dots = requests
      .filter((o) => o.id !== r.id)
      .map((o) => ({ x: o.x - DOT / 2, y: o.y - DOT / 2, width: DOT, height: DOT }));
    const free = (box: Box) =>
      inside(box, bounds) &&
      !obstacles.some((o) => overlaps(box, o)) &&
      !placed.some((p) => overlaps(box, p)) &&
      !dots.some((d) => overlaps(box, d));
    const kept = previous.get(r.id);
    const order = kept !== undefined ? [kept, ...Array.from({ length: CANDIDATES }, (_, i) => i).filter((i) => i !== kept)] : Array.from({ length: CANDIDATES }, (_, i) => i);
    for (const index of order) {
      const box = candidate(index, r);
      if (!free(box)) continue;
      placed.push({ id: r.id, ...box, candidate: index, lead: index >= 8 });
      break;
    }
  }
  return placed;
}
