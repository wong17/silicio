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
export type { Section } from './scene-inputs';
@Component({
  selector: 'app-atrium-scene',
  templateUrl: './atrium-scene.component.html',
  styleUrl: './atrium-scene.component.scss',
})
export class AtriumSceneComponent implements AfterViewInit, OnChanges, OnDestroy, SceneInputs {
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() section: Section = 'atrium';
  @Input() exploded = false;
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
  @Output() pieces = new EventEmitter<PieceDefinition[]>();
  @Output() picked = new EventEmitter<string>();
  readonly supported = signal(true);
  private engine?: WorldEngine;
  constructor(private zone: NgZone) {}
  ngAfterViewInit(): void {
    try {
      this.zone.runOutsideAngular(() => {
        this.engine = new WorldEngine(this.canvasRef.nativeElement, readSceneInputs(this), {
          pieces: (p) => this.zone.run(() => this.pieces.emit(p)),
          picked: (id) => this.zone.run(() => this.picked.emit(id)),
          unavailable: () => this.zone.run(() => this.supported.set(false)),
        });
        this.engine.initialize();
        this.engine.update(readSceneInputs(this), new Set());
      });
    } catch {
      this.engine?.dispose();
      this.engine = undefined;
      this.supported.set(false);
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
  resetView(): void {
    this.engine?.resetView();
  }
  focusSelected(): void {
    this.engine?.focusSelected();
  }
  resetTools(): void {
    this.engine?.resetTools();
  }
  dropTool(): void {
    void this.engine?.dropTool();
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
