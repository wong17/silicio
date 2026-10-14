import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { WorldEngine } from './world-engine';
import { readSceneInputs, type SceneInputs, type Section, type QualityTier } from './scene-inputs';
import type { PieceDefinition } from './interaction-registry';
import type { LampTarget } from './lamp-limits';
import { IDLE_ACTIVITY, type StationActivity } from '../laboratory/station-activity';
import type { CameraView, PieceAnchor, ScreenAnchor } from './scene-inputs';
export type { Section } from './scene-inputs';

/** Angular adapter for the 3D bench: inputs go to the engine, callbacks return inside the zone. */
@Component({
  selector: 'app-atrium-scene',
  templateUrl: './atrium-scene.component.html',
  styleUrl: './atrium-scene.component.scss',
})
export class AtriumSceneComponent implements AfterViewInit, OnChanges, OnDestroy, SceneInputs {
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() section: Section = 'atrium';
  @Input() exploded = false;
  @Input() explodedAmount = 1;
  @Input() activePart = '';
  @Input() tick = 0;
  @Input() memoryCells: { address: number; value: number }[] = [];
  @Input() history: { address: number; text: string; ax: number }[] = [];
  @Input() memoryBase = 0;
  @Input() viewMode: 'material' | 'wireframe' = 'material';
  @Input() manipulate = false;
  @Input() inspection = false;
  @Input() memoryModel: 'classic' | 'dimm' = 'classic';
  @Input() reduced = false;
  @Input() quality: QualityTier = 'high';
  @Input() signalChannel = 'ALE';
  @Input() readAccess = false;
  @Input() writeAccess = false;
  @Input() lamp: LampTarget = { x: -0.8, z: 0.6, height: 5 };
  @Input() lampOn = true;
  @Input() activity: StationActivity = IDLE_ACTIVITY;
  @Output() pieces = new EventEmitter<PieceDefinition[]>();
  @Output() picked = new EventEmitter<string>();
  @Output() hovered = new EventEmitter<string | null>();
  @Output() lampMoved = new EventEmitter<LampTarget>();
  @Output() holding = new EventEmitter<string | null>();
  @Output() anchors = new EventEmitter<PieceAnchor[]>();
  @Output() view = new EventEmitter<CameraView>();
  @Output() callouts = new EventEmitter<ScreenAnchor[]>();
  readonly supported = signal(true);
  private engine?: WorldEngine;
  private markReady!: () => void;
  private readonly ready = new Promise<void>((resolve) => (this.markReady = resolve));
  constructor(private zone: NgZone) {}
  ngAfterViewInit(): void {
    try {
      this.zone.runOutsideAngular(() => {
        this.engine = new WorldEngine(this.canvasRef.nativeElement, readSceneInputs(this), {
          pieces: (p) => this.zone.run(() => this.pieces.emit(p)),
          picked: (id) => this.zone.run(() => this.picked.emit(id)),
          hovered: (id) => this.zone.run(() => this.hovered.emit(id)),
          lampMoved: (target) => this.zone.run(() => this.lampMoved.emit(target)),
          holding: (id) => this.zone.run(() => this.holding.emit(id)),
          anchors: (a) => this.zone.run(() => this.anchors.emit(a)),
          view: (v) => this.zone.run(() => this.view.emit(v)),
          callouts: (c) => this.zone.run(() => this.callouts.emit(c)),
          unavailable: () => this.zone.run(() => this.supported.set(false)),
        });
        this.engine.initialize();
        this.engine.update(readSceneInputs(this), new Set());
      });
      this.markReady();
    } catch {
      this.engine?.dispose();
      this.engine = undefined;
      this.supported.set(false);
      this.markReady();
    }
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.zone.runOutsideAngular(() =>
      this.engine?.update(
        readSceneInputs(this),
        new Set(Object.keys(changes) as (keyof SceneInputs)[]),
      ),
    );
  }
  rotate(direction: number): void {
    this.engine?.rotate(direction);
  }
  zoom(factor: number): void {
    this.engine?.zoom(factor);
  }
  orbitTo(azimuth: number): void {
    this.engine?.orbitTo(azimuth);
  }
  setCallouts(on: boolean): void {
    this.engine?.setCallouts(on);
  }
  /** Resolves once the engine exists (or never does, on a device without WebGL: then null). */
  async thumbnail(id: string, size = 128): Promise<Blob | null> {
    if (!this.engine) await this.ready;
    return this.engine?.thumbnail(id, size) ?? null;
  }
  resetView(): void {
    this.engine?.resetView();
  }
  focusSelected(): void {
    this.engine?.focusSelected();
  }
  aimLampAt(id: string): 'aimed' | 'limit' | 'missing' {
    return this.engine?.aimLampAt(id) ?? 'missing';
  }
  resetTools(): void {
    this.engine?.resetTools();
  }
  releaseTool(): void {
    this.engine?.releaseTool();
  }
  toggleLatch(id: string): void {
    this.engine?.toggleLatch(id);
  }
  reloadScene(): void {
    location.reload();
  }
  ngOnDestroy(): void {
    this.engine?.dispose();
  }
}
