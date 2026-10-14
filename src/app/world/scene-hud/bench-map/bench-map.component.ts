import { Component, computed, ElementRef, inject, output, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LabSession } from '../../../laboratory/lab-session.service';
import { clampLampTarget, LAMP_LIMITS, LAMP_REACH } from '../../lamp-limits';
import { BENCH } from '../../models/bench-layout';

/** The pad shows the whole worktop with a margin, centred on the bench: x from -18 to 18 and z from -13 to 13. */
const WINDOW = { x: [-18, 18], z: [-13, 13] } as const;
const VIEW_WIDTH = 300;
const SCALE = VIEW_WIDTH / (WINDOW.x[1] - WINDOW.x[0]);
const VIEW_HEIGHT = (WINDOW.z[1] - WINDOW.z[0]) * SCALE;

/**
 * Top-down map of the bench. Dragging the light spot moves the 3D lamp, and the spot's radius shows
 * how wide the pool of light becomes at the chosen head height.
 */
@Component({
  selector: 'app-bench-map',
  imports: [DecimalPipe],
  templateUrl: './bench-map.component.html',
  styleUrl: './bench-map.component.scss',
})
export class BenchMapComponent {
  readonly session = inject(LabSession);
  /** The parent aims the lamp at the selected piece, because the 3D scene owns its positions. */
  readonly aimSelected = output<void>();
  /** A piece marker was chosen (click) or asked to be framed (double click). */
  readonly picked = output<string>();
  readonly focused = output<string>();
  /** The camera wedge was dragged: world azimuth the camera should orbit to. */
  readonly orbit = output<number>();
  readonly pad = viewChild.required<ElementRef<SVGSVGElement>>('pad');
  readonly width = VIEW_WIDTH;
  readonly scale = SCALE;
  readonly height = VIEW_HEIGHT;
  readonly limits = LAMP_LIMITS;
  readonly lamp = BENCH.lamp;
  /** Radius of the arm’s reach on the pad, so a point outside the dashed ring cannot be lit. */
  readonly reachRadius = LAMP_REACH * SCALE;
  readonly target = this.session.lampTarget;
  readonly markers = computed(() =>
    this.session
      .anchors()
      .filter((a) => a.scope === 'model')
      .map((a) => ({ ...a, cx: this.toPx(a.x), cy: this.toPy(a.z), selected: a.id === this.session.activePart() })),
  );
  /** Wedge on the border of the map: where the camera stands, looking at the bench centre. */
  readonly wedge = computed(() => {
    const { azimuth } = this.session.cameraView();
    const cx = VIEW_WIDTH / 2,
      cy = VIEW_HEIGHT / 2;
    const radius = Math.min(cx, cy) - 8;
    const x = cx + Math.sin(azimuth) * radius,
      y = cy + Math.cos(azimuth) * radius;
    const side = 0.22;
    const arm = (a: number) => [cx + Math.sin(a) * (radius - 14), cy + Math.cos(a) * (radius - 14)];
    const [lx, ly] = arm(azimuth - side),
      [rx, ry] = arm(azimuth + side);
    return { x, y, path: `M${x} ${y}L${lx} ${ly}L${rx} ${ry}Z`, degrees: Math.round((azimuth * 180) / Math.PI) };
  });
  private wedgeDragging = false;
  private dragging = false;

  readonly spot = computed(() => {
    const t = this.target();
    return {
      cx: (t.x - WINDOW.x[0]) * SCALE,
      cy: (t.z - WINDOW.z[0]) * SCALE,
      radius: Math.max(10, t.height * Math.tan(0.5) * 0.9 * SCALE),
    };
  });

  toPx(x: number): number {
    return (x - WINDOW.x[0]) * SCALE;
  }

  toPy(z: number): number {
    return (z - WINDOW.z[0]) * SCALE;
  }

  private moveTo(event: PointerEvent): void {
    const rect = this.pad().nativeElement.getBoundingClientRect();
    const u = (event.clientX - rect.left) / rect.width,
      v = (event.clientY - rect.top) / rect.height;
    this.setTarget({
      x: WINDOW.x[0] + u * (WINDOW.x[1] - WINDOW.x[0]),
      z: WINDOW.z[0] + v * (WINDOW.z[1] - WINDOW.z[0]),
    });
  }

  setTarget(partial: { x?: number; z?: number; height?: number }): void {
    this.target.set(clampLampTarget({ ...this.target(), ...partial }));
  }

  /** A marker takes the pointer so the light spot does not jump under it. */
  markerDown(event: PointerEvent, id: string): void {
    event.stopPropagation();
    this.picked.emit(id);
  }

  wedgeDown(event: PointerEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.wedgeDragging = true;
    this.pad().nativeElement.setPointerCapture(event.pointerId);
  }

  private orbitFrom(event: PointerEvent): void {
    const rect = this.pad().nativeElement.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2),
      dz = event.clientY - (rect.top + rect.height / 2);
    if (dx === 0 && dz === 0) return;
    this.orbit.emit(Math.atan2(dx, dz));
  }

  pointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.dragging = true;
    this.pad().nativeElement.setPointerCapture(event.pointerId);
    this.moveTo(event);
  }

  pointerMove(event: PointerEvent): void {
    if (this.wedgeDragging) this.orbitFrom(event);
    else if (this.dragging) this.moveTo(event);
  }

  pointerUp(event: PointerEvent): void {
    this.dragging = false;
    this.wedgeDragging = false;
    if (this.pad().nativeElement.hasPointerCapture(event.pointerId))
      this.pad().nativeElement.releasePointerCapture(event.pointerId);
  }

  /** Arrow keys nudge the spot by half a unit; Shift makes larger steps. */
  keyNudge(event: KeyboardEvent): void {
    const step = event.shiftKey ? 1.5 : 0.5;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    this.setTarget({ x: this.target().x + move[0], z: this.target().z + move[1] });
  }

  setHeight(value: string): void {
    this.setTarget({ height: Number(value) });
  }

  togglePower(): void {
    this.session.lampOn.set(!this.session.lampOn());
  }
}
