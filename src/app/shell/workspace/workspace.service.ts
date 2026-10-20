import { computed, Injectable, signal } from '@angular/core';
import type { Section } from '../../world/scene-inputs';
import { panelsFor } from './panel-registry';
import {
  applyPreset,
  arrange,
  closePanel,
  defaultLayout,
  dockPanel,
  floatPanel,
  maximizePanel,
  minimizePanel,
  openPanel,
  parseLayout,
  resizeZone,
  sizeClassOf,
  type Area,
  type DockZone,
  type Preset,
  type Rect,
  type WorkspaceLayout,
} from './workspace-layout';

export const WORKSPACE_STORAGE_KEY = 'silicio.workspace';

const SECTIONS: readonly Section[] = ['atrium', '8086', 'memory', 'time', 'apple', 'machine'];

/**
 * Open panels and their places, per experience and size class, stored apart from the academic session.
 * A change made on a phone never rewrites the desk layout, and returning to the desk restores it.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  readonly experience = signal<Section>('atrium');
  /** Size of the desk (between navigation and footer). */
  readonly area = signal<Area>({ width: 1280, height: 640 });
  /** Size of the whole window; it decides the size class. */
  readonly viewport = signal<Area>({ width: 1280, height: 800 });
  readonly specs = computed(() => panelsFor(this.experience()));
  readonly sizeClass = computed(() => sizeClassOf(this.viewport()));
  private readonly key = computed(() => `${this.experience()}|${this.sizeClass()}`);
  private readonly layouts = signal<Record<string, WorkspaceLayout>>(this.load());
  readonly layout = computed(
    () => this.layouts()[this.key()] ?? defaultLayout(this.specs(), this.area()),
  );
  readonly arrangement = computed(() => arrange(this.layout(), this.specs(), this.area(), this.sizeClass()));
  readonly notice = computed(() =>
    this.arrangement().adjusted
      ? 'Algún panel flota para que la escena y los instrumentos anclados quepan. Restablecer distribución lo ordena.'
      : null,
  );
  /** Asks the window with this id to take focus; `seq` makes a repeated request observable. */
  readonly focusRequest = signal<{ id: string; seq: number } | null>(null);
  private readonly openers = new Map<string, HTMLElement>();
  private seq = 0;

  setExperience(section: Section): void {
    this.experience.set(section);
  }

  setArea(area: Area, viewport: Area = area): void {
    const round = (a: Area) => ({ width: Math.round(a.width), height: Math.round(a.height) });
    const same = (a: Area, b: Area) => a.width === b.width && a.height === b.height;
    if (!same(round(area), this.area())) this.area.set(round(area));
    if (!same(round(viewport), this.viewport())) this.viewport.set(round(viewport));
  }

  isOpen(id: string): boolean {
    return this.layout().panels.some((p) => p.id === id && p.open && !p.minimized);
  }

  /** Opens a panel; with `focus` (a deliberate request) the panel takes focus and gives it back on close. */
  open(id: string, focus = true): void {
    this.update((l) => openPanel(l, id));
    if (!focus) return;
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (active instanceof HTMLElement && active !== document.body) this.openers.set(id, active);
    this.focusRequest.set({ id, seq: ++this.seq });
  }

  close(id: string): void {
    this.update((l) => closePanel(l, id));
    const opener = this.openers.get(id);
    this.openers.delete(id);
    if (opener?.isConnected) opener.focus();
  }

  toggle(id: string): void {
    if (this.isOpen(id)) this.close(id);
    else this.open(id);
  }

  minimize(id: string): void {
    this.update((l) => minimizePanel(l, id, true));
  }

  restore(id: string): void {
    this.update((l) => minimizePanel(l, id, false));
    this.focusRequest.set({ id, seq: ++this.seq });
  }

  dock(id: string, zone: DockZone): void {
    this.update((l) => dockPanel(l, id, zone));
  }

  float(id: string, rect: Rect | null = null): void {
    this.update((l) => floatPanel(l, id, rect));
  }

  maximize(id: string | null): void {
    this.update((l) => maximizePanel(l, id));
  }

  resize(zone: DockZone, size: number): void {
    this.update((l) => resizeZone(l, zone, size));
  }

  preset(preset: Preset): void {
    this.update((l) => applyPreset(l, this.specs(), this.area(), preset));
  }

  reset(): void {
    this.update(() => defaultLayout(this.specs(), this.area()));
  }

  private update(change: (layout: WorkspaceLayout) => WorkspaceLayout): void {
    const next = change(this.layout());
    this.layouts.update((all) => ({ ...all, [this.key()]: next }));
    this.save();
  }

  private load(): Record<string, WorkspaceLayout> {
    try {
      const raw = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? 'null');
      if (!raw || raw.version !== 1 || typeof raw.layouts !== 'object' || !raw.layouts) return {};
      const result: Record<string, WorkspaceLayout> = {};
      for (const [key, value] of Object.entries(raw.layouts as Record<string, unknown>)) {
        const section = key.split('|')[0] as Section;
        if (!SECTIONS.includes(section)) continue;
        const layout = parseLayout(value, panelsFor(section));
        if (layout) result[key] = layout;
      }
      return result;
    } catch {
      return {};
    }
  }

  private save(): void {
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ version: 1, layouts: this.layouts() }));
    } catch {
      // Storage full or blocked: the layout still works for this visit.
    }
  }
}
