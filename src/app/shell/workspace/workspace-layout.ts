/**
 * Pure layout of the instrument desk: which panels are open, where they sit (docked at the bottom,
 * docked on the right or floating) and the rectangles that follow from a given area. No Angular, no DOM:
 * the workspace service stores a layout, this module turns it into placements for any size.
 */
export type DockZone = 'bottom' | 'right';
export type Zone = DockZone | 'float';
export type Preset = 'study' | 'explore' | 'compare';
export type SizeClass = 'wide' | 'medium' | 'narrow' | 'short';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Area {
  width: number;
  height: number;
}

/** What an experience offers: the panel, where it docks by default and whether it starts open. */
export interface PanelSpec {
  id: string;
  title: string;
  zone: DockZone;
  open: boolean;
  /** Share of its zone when several panels dock together (1 by default). */
  weight?: number;
}

export interface PanelState {
  id: string;
  open: boolean;
  minimized: boolean;
  zone: Zone;
  float: Rect | null;
}

export interface WorkspaceLayout {
  version: 1;
  preset: Preset;
  /** Height of the bottom zone in CSS pixels. */
  bottom: number;
  /** Width of the right zone in CSS pixels. */
  right: number;
  maximized: string | null;
  panels: PanelState[];
}

export interface Placement {
  id: string;
  zone: Zone;
  rect: Rect;
}

export interface Arrangement {
  /** `flow`: narrow or short screens stack the panels under (or beside) the scene in reading order. */
  mode: 'absolute' | 'flow';
  scene: Rect;
  placements: Placement[];
  minimized: string[];
  maximized: string | null;
  /** True when a panel had to move to keep the minimum sizes. */
  adjusted: boolean;
}

export const LIMITS = {
  panelWidth: 320,
  panelHeight: 160,
  sceneWidth: 320,
  sceneHeight: 220,
  header: 44,
  floatWidth: 440,
  floatHeight: 200,
  rightDefault: 380,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export function sizeClassOf(area: Area): SizeClass {
  if (area.width < 800) return 'narrow';
  if (area.height <= 520) return 'short';
  if (area.width < 1024 || area.height < 720) return 'medium';
  return 'wide';
}

function studyBottom(area: Area): number {
  return Math.round(area.height * 0.52);
}

export function defaultLayout(specs: readonly PanelSpec[], area: Area, preset: Preset = 'study'): WorkspaceLayout {
  return {
    version: 1,
    preset,
    bottom: preset === 'compare' ? area.height - LIMITS.sceneHeight : studyBottom(area),
    right: LIMITS.rightDefault,
    maximized: null,
    panels: specs.map((s) => ({
      id: s.id,
      open: s.open,
      minimized: preset === 'explore',
      zone: s.zone,
      float: null,
    })),
  };
}

/** Same open panels, arranged as the preset says. */
export function applyPreset(
  layout: WorkspaceLayout,
  specs: readonly PanelSpec[],
  area: Area,
  preset: Preset,
): WorkspaceLayout {
  const fresh = defaultLayout(specs, area, preset);
  const open = new Map(layout.panels.map((p) => [p.id, p.open]));
  return { ...fresh, panels: fresh.panels.map((p) => ({ ...p, open: open.get(p.id) ?? p.open })) };
}

function patch(layout: WorkspaceLayout, id: string, change: Partial<PanelState>): WorkspaceLayout {
  return { ...layout, panels: layout.panels.map((p) => (p.id === id ? { ...p, ...change } : p)) };
}

export function openPanel(layout: WorkspaceLayout, id: string): WorkspaceLayout {
  return patch(layout, id, { open: true, minimized: false });
}

export function closePanel(layout: WorkspaceLayout, id: string): WorkspaceLayout {
  const next = patch(layout, id, { open: false });
  return layout.maximized === id ? { ...next, maximized: null } : next;
}

export function minimizePanel(layout: WorkspaceLayout, id: string, minimized: boolean): WorkspaceLayout {
  const next = patch(layout, id, { minimized });
  return minimized && layout.maximized === id ? { ...next, maximized: null } : next;
}

export function dockPanel(layout: WorkspaceLayout, id: string, zone: DockZone): WorkspaceLayout {
  return patch(layout, id, { zone, float: null, open: true, minimized: false });
}

export function floatPanel(layout: WorkspaceLayout, id: string, rect: Rect | null = null): WorkspaceLayout {
  return patch(layout, id, { zone: 'float', float: rect, open: true, minimized: false });
}

export function maximizePanel(layout: WorkspaceLayout, id: string | null): WorkspaceLayout {
  return { ...layout, maximized: id };
}

export function resizeZone(layout: WorkspaceLayout, zone: DockZone, size: number): WorkspaceLayout {
  return zone === 'bottom' ? { ...layout, bottom: Math.round(size) } : { ...layout, right: Math.round(size) };
}

/** Keeps a floating window inside the area, with its whole title bar reachable. */
export function clampFloat(rect: Rect, area: Area): Rect {
  const width = clamp(rect.width, Math.min(LIMITS.panelWidth, area.width), area.width);
  const height = clamp(rect.height, Math.min(LIMITS.floatHeight, area.height), area.height);
  return {
    x: Math.round(clamp(rect.x, 0, area.width - width)),
    y: Math.round(clamp(rect.y, 0, area.height - LIMITS.header)),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** A window that starts floating opens at the top right of the scene, never over a docked panel. */
function defaultFloat(index: number, scene: Rect, area: Area): Rect {
  const width = Math.min(LIMITS.floatWidth, scene.width);
  const height = Math.min(420, Math.round(scene.height * 0.6), area.height);
  const x = Math.max(0, scene.x + scene.width - width - 16 - index * 24);
  return clampFloat({ x, y: scene.y + 16 + index * 24, width, height }, area);
}

/** Splits a length among weights in whole pixels; the last share takes the remainder. */
function split(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const sizes = weights.map((w) => Math.floor((total * w) / sum));
  sizes[sizes.length - 1] += total - sizes.reduce((a, b) => a + b, 0);
  return sizes;
}

/**
 * Rectangles for every visible panel and for the scene. `size` is the class of the whole viewport (the
 * table of §2.3 speaks of the screen, not of the desk); it defaults to the class of the area itself.
 */
export function arrange(
  layout: WorkspaceLayout,
  specs: readonly PanelSpec[],
  area: Area,
  size: SizeClass = sizeClassOf(area),
): Arrangement {
  const known = new Map(specs.map((s) => [s.id, s]));
  const open = layout.panels.filter((p) => known.has(p.id) && p.open);
  const minimized = open.filter((p) => p.minimized).map((p) => p.id);
  const visible = open.filter((p) => !p.minimized);
  const whole: Rect = { x: 0, y: 0, width: area.width, height: area.height };
  if (size === 'narrow' || size === 'short')
    return {
      mode: 'flow',
      scene: whole,
      placements: visible.map((p) => ({ id: p.id, zone: p.zone, rect: { x: 0, y: 0, width: 0, height: 0 } })),
      minimized,
      maximized: null,
      adjusted: false,
    };

  let adjusted = false;
  let right = visible.filter((p) => p.zone === 'right');
  let bottom = visible.filter((p) => p.zone === 'bottom');
  const floats = visible.filter((p) => p.zone === 'float');
  const moved: PanelState[] = [];

  let rightWidth = right.length ? clamp(layout.right, LIMITS.panelWidth, area.width - LIMITS.sceneWidth) : 0;
  const bottomNeeds = () => Math.max(LIMITS.sceneWidth, bottom.length * LIMITS.panelWidth);
  if (right.length && area.width - rightWidth < bottomNeeds()) {
    rightWidth = LIMITS.panelWidth;
    if (area.width - rightWidth < bottomNeeds()) {
      moved.push(...right);
      right = [];
      rightWidth = 0;
      adjusted = true;
    }
  }
  const capacity = Math.max(1, Math.floor((area.width - rightWidth) / LIMITS.panelWidth));
  if (bottom.length > capacity) {
    moved.push(...bottom.slice(capacity));
    bottom = bottom.slice(0, capacity);
    adjusted = true;
  }

  const bottomHeight = bottom.length
    ? clamp(layout.bottom, LIMITS.panelHeight, area.height - LIMITS.sceneHeight)
    : 0;
  const scene: Rect = { x: 0, y: 0, width: area.width - rightWidth, height: area.height - bottomHeight };
  const placements: Placement[] = [];

  let x = 0;
  split(scene.width, bottom.map((p) => known.get(p.id)?.weight ?? 1)).forEach((width, i) => {
    placements.push({ id: bottom[i].id, zone: 'bottom', rect: { x, y: scene.height, width, height: bottomHeight } });
    x += width;
  });
  let y = 0;
  split(area.height, right.map((p) => known.get(p.id)?.weight ?? 1)).forEach((height, i) => {
    placements.push({ id: right[i].id, zone: 'right', rect: { x: scene.width, y, width: rightWidth, height } });
    y += height;
  });
  [...floats, ...moved].forEach((p, i) =>
    placements.push({
      id: p.id,
      zone: 'float',
      rect: p.zone === 'float' && p.float ? clampFloat(p.float, area) : defaultFloat(i, scene, area),
    }),
  );

  const order = new Map(layout.panels.map((p, i) => [p.id, i]));
  placements.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const maximized = layout.maximized && placements.some((p) => p.id === layout.maximized) ? layout.maximized : null;
  if (maximized) {
    const target = placements.find((p) => p.id === maximized)!;
    target.rect = { ...whole };
  }
  return { mode: 'absolute', scene, placements, minimized, maximized, adjusted };
}

const isRect = (value: unknown): value is Rect =>
  !!value &&
  typeof value === 'object' &&
  ['x', 'y', 'width', 'height'].every((k) => Number.isFinite((value as Record<string, unknown>)[k]));

/** Reads a stored layout; anything malformed yields null so the caller falls back to the preset. */
export function parseLayout(raw: unknown, specs: readonly PanelSpec[]): WorkspaceLayout | null {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data['version'] !== 1 || !Array.isArray(data['panels'])) return null;
  const stored = new Map<string, PanelState>();
  for (const item of data['panels'] as unknown[]) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    if (typeof p['id'] !== 'string' || !specs.some((s) => s.id === p['id'])) continue;
    const zone = p['zone'];
    if (zone !== 'bottom' && zone !== 'right' && zone !== 'float') continue;
    stored.set(p['id'], {
      id: p['id'],
      open: p['open'] === true,
      minimized: p['minimized'] === true,
      zone,
      float: isRect(p['float']) ? p['float'] : null,
    });
  }
  const preset = data['preset'];
  const maximized = data['maximized'];
  return {
    version: 1,
    preset: preset === 'explore' || preset === 'compare' ? preset : 'study',
    bottom: Number.isFinite(data['bottom']) ? (data['bottom'] as number) : 300,
    right: Number.isFinite(data['right']) ? (data['right'] as number) : LIMITS.rightDefault,
    maximized: typeof maximized === 'string' && stored.has(maximized) ? maximized : null,
    panels: specs.map(
      (s) => stored.get(s.id) ?? { id: s.id, open: s.open, minimized: false, zone: s.zone, float: null },
    ),
  };
}
