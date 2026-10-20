import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { InstrumentWindowComponent } from './instrument-window.component';
import { WorkspaceService } from './workspace.service';
import { LIMITS, type DockZone } from './workspace-layout';

/**
 * The desk: the scene and the instrument windows that share the area between navigation and footer.
 * Every window is rendered once, in a single list tracked by id, so docking or floating it never
 * recreates its content.
 */
@Component({
  selector: 'app-workspace',
  imports: [NgTemplateOutlet, InstrumentWindowComponent],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
})
export class WorkspaceComponent implements AfterViewInit, OnDestroy {
  /** Content of each panel, by panel id. */
  readonly templates = input<Record<string, TemplateRef<unknown>>>({});
  /** Phone modes: only the scene, both, or only the instruments. */
  readonly phoneLayout = input<'scene' | 'shared' | 'instrument'>('shared');

  readonly ws = inject(WorkspaceService);
  private readonly desk = viewChild.required<ElementRef<HTMLElement>>('desk');
  private observer?: ResizeObserver;
  private resized = () => this.measure();

  readonly arrangement = this.ws.arrangement;
  readonly absolute = computed(() => this.arrangement().mode === 'absolute');
  readonly windows = computed(() => {
    const titles = new Map(this.ws.specs().map((s) => [s.id, s.title]));
    return this.arrangement().placements.map((placement) => ({
      id: placement.id,
      title: titles.get(placement.id) ?? placement.id,
      placement,
    }));
  });
  readonly minimized = computed(() => {
    const titles = new Map(this.ws.specs().map((s) => [s.id, s.title]));
    return this.arrangement().minimized.map((id) => ({ id, title: titles.get(id) ?? id }));
  });
  /** Edge between the scene and a docked zone, or null when that zone is empty. */
  readonly bottomEdge = computed(() => {
    const p = this.arrangement().placements.find((p) => p.zone === 'bottom');
    return this.absolute() && p ? p.rect.y : null;
  });
  readonly rightEdge = computed(() => {
    const p = this.arrangement().placements.find((p) => p.zone === 'right');
    return this.absolute() && p ? p.rect.x : null;
  });
  /** Splitter position while it is dragged; the layout changes once, on release. */
  readonly preview = signal<{ zone: DockZone; at: number } | null>(null);
  private dragging?: { zone: DockZone; pointer: number };

  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'function') {
      this.observer = new ResizeObserver(this.resized);
      this.observer.observe(this.desk().nativeElement);
    }
    window.addEventListener('resize', this.resized);
    this.measure();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    window.removeEventListener('resize', this.resized);
  }

  private measure(): void {
    const box = this.desk().nativeElement.getBoundingClientRect();
    if (!box.width || !box.height) return;
    this.ws.setArea(
      { width: box.width, height: box.height },
      { width: window.innerWidth, height: window.innerHeight },
    );
  }

  splitterValue(zone: DockZone): number {
    const area = this.ws.area();
    const edge = zone === 'bottom' ? this.bottomEdge() : this.rightEdge();
    return edge === null ? 0 : zone === 'bottom' ? area.height - edge : area.width - edge;
  }

  splitterMax(zone: DockZone): number {
    const area = this.ws.area();
    return zone === 'bottom' ? area.height - LIMITS.sceneHeight : area.width - LIMITS.sceneWidth;
  }

  startSplit(event: PointerEvent, zone: DockZone): void {
    if (event.button !== 0) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragging = { zone, pointer: event.pointerId };
    this.preview.set({ zone, at: zone === 'bottom' ? this.bottomEdge() ?? 0 : this.rightEdge() ?? 0 });
  }

  moveSplit(event: PointerEvent): void {
    const d = this.dragging;
    if (!d || d.pointer !== event.pointerId) return;
    const box = this.desk().nativeElement.getBoundingClientRect();
    const area = this.ws.area();
    if (d.zone === 'bottom') {
      const at = Math.min(Math.max(event.clientY - box.top, LIMITS.sceneHeight), area.height - LIMITS.panelHeight);
      this.preview.set({ zone: 'bottom', at });
    } else {
      const at = Math.min(Math.max(event.clientX - box.left, LIMITS.sceneWidth), area.width - LIMITS.panelWidth);
      this.preview.set({ zone: 'right', at });
    }
  }

  endSplit(event: PointerEvent): void {
    const d = this.dragging;
    if (!d || d.pointer !== event.pointerId) return;
    this.dragging = undefined;
    const p = this.preview();
    this.preview.set(null);
    if (!p) return;
    const area = this.ws.area();
    this.ws.resize(p.zone, p.zone === 'bottom' ? area.height - p.at : area.width - p.at);
  }

  /** Arrows resize the docked zone by 16 px; Home and End go to its limits. */
  splitKey(event: KeyboardEvent, zone: DockZone): void {
    const grow = zone === 'bottom' ? ['ArrowUp'] : ['ArrowLeft'];
    const shrink = zone === 'bottom' ? ['ArrowDown'] : ['ArrowRight'];
    const value = this.splitterValue(zone);
    let next: number | null = null;
    if (grow.includes(event.key)) next = value + 16;
    else if (shrink.includes(event.key)) next = value - 16;
    else if (event.key === 'Home') next = zone === 'bottom' ? LIMITS.panelHeight : LIMITS.panelWidth;
    else if (event.key === 'End') next = this.splitterMax(zone);
    if (next === null) return;
    event.preventDefault();
    this.ws.resize(zone, next);
  }
}
