import { Component, computed, ElementRef, inject, output, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LabSession } from '../../laboratory/lab-session.service';
import { clampLampTarget, LAMP_LIMITS, LAMP_REACH } from '../../world/lamp-limits';
import { BENCH } from '../../world/models/bench-layout';

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
  selector: 'app-light-pad',
  imports: [DecimalPipe],
  templateUrl: './light-pad.component.html',
  styleUrl: './light-pad.component.scss',
})
export class LightPadComponent {
  readonly session = inject(LabSession);
  /** The parent aims the lamp at the selected piece, because the 3D scene owns its positions. */
  readonly aimSelected = output<void>();
  readonly pad = viewChild.required<ElementRef<SVGSVGElement>>('pad');
  readonly width = VIEW_WIDTH;
  readonly scale = SCALE;
  readonly height = VIEW_HEIGHT;
  readonly limits = LAMP_LIMITS;
  readonly lamp = BENCH.lamp;
  /** Radius of the arm’s reach on the pad, so a point outside the dashed ring cannot be lit. */
  readonly reachRadius = LAMP_REACH * SCALE;
  readonly target = this.session.lampTarget;
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

  pointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.dragging = true;
    this.pad().nativeElement.setPointerCapture(event.pointerId);
    this.moveTo(event);
  }

  pointerMove(event: PointerEvent): void {
    if (this.dragging) this.moveTo(event);
  }

  pointerUp(event: PointerEvent): void {
    this.dragging = false;
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
