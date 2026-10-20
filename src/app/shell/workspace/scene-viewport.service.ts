import { Injectable, signal } from '@angular/core';
import { freeRectFor, type Occlusion, type ViewportLayout } from './scene-viewport';

type Edge = Occlusion['edge'];

/**
 * Measures what covers the 3D view (title, toolbar, drawers, floating windows) relative to the stage and
 * publishes the free rectangle. Elements register through the `appOccludes` directive; measurements
 * requested in the same task are batched.
 */
@Injectable({ providedIn: 'root' })
export class SceneViewportService {
  readonly layout = signal<ViewportLayout | null>(null);
  private stage?: HTMLElement;
  private readonly items = new Map<HTMLElement, Edge>();
  private observer?: ResizeObserver;
  private frame?: ReturnType<typeof setTimeout>;

  attachStage(stage: HTMLElement): void {
    this.stage = stage;
    if (typeof ResizeObserver === 'function' && !this.observer)
      this.observer = new ResizeObserver(() => this.refresh());
    this.observer?.observe(stage);
    this.refresh();
  }

  detachStage(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.stage = undefined;
    clearTimeout(this.frame);
  }

  register(element: HTMLElement, edge?: Edge): void {
    this.items.set(element, edge);
    this.observer?.observe(element);
    this.refresh();
  }

  unregister(element: HTMLElement): void {
    this.items.delete(element);
    this.observer?.unobserve(element);
    this.refresh();
  }

  /**
   * Measures once the current change detection has written the DOM; repeated calls collapse into one.
   * A timer, not an animation frame: a page in the background still has to report its overlays.
   */
  refresh(): void {
    clearTimeout(this.frame);
    this.frame = setTimeout(() => this.measure(), 0);
  }

  measure(): void {
    const stage = this.stage;
    if (!stage) return;
    const box = stage.getBoundingClientRect();
    const area = { width: Math.round(box.width), height: Math.round(box.height) };
    const occlusions: Occlusion[] = [];
    for (const [element, edge] of this.items) {
      if (!element.isConnected || !element.getClientRects().length) continue;
      const r = element.getBoundingClientRect();
      const x = Math.max(0, r.left - box.left),
        y = Math.max(0, r.top - box.top);
      const width = Math.min(area.width, r.right - box.left) - x,
        height = Math.min(area.height, r.bottom - box.top) - y;
      if (width <= 0 || height <= 0) continue;
      occlusions.push({ rect: { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }, edge });
    }
    // Overlays that belong to an edge cut first, so a floating window never decides where the toolbar ends.
    occlusions.sort((a, b) => Number(!a.edge) - Number(!b.edge));
    const next: ViewportLayout = {
      ...area,
      freeRect: freeRectFor(area, occlusions),
      occlusions: occlusions.map((o) => o.rect),
    };
    if (JSON.stringify(next) !== JSON.stringify(this.layout())) this.layout.set(next);
  }
}
