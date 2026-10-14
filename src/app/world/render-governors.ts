/**
 * Adaptive resolution that settles. It moves in steps of 0.05, only when the median frame time leaves a
 * dead band, and after three reversals of direction it stops adapting until the load changes a lot.
 */
export class ResolutionGovernor {
  private scale = 1;
  private lastDirection: 1 | -1 | 0 = 0;
  private reversals = 0;
  private hold = 0;

  static readonly STEP = 0.05;
  static readonly MIN = 0.5;
  static readonly HOLD_SAMPLES = 2;
  static readonly MAX_REVERSALS = 3;
  /** Median above this steps the resolution down; below `UP` it may step back up. */
  static readonly DOWN = 18;
  static readonly UP = 13.5;

  get value(): number {
    return this.scale;
  }

  get settled(): boolean {
    return this.reversals >= ResolutionGovernor.MAX_REVERSALS;
  }

  /** Feeds one median frame time (ms) and returns the scale to use. Call once per sampling window. */
  update(p50: number): number {
    if (this.hold > 0) {
      this.hold--;
      return this.scale;
    }
    // A clear overload (far above the band) lifts the lock; ordinary swings inside it never do.
    if (this.settled && p50 > ResolutionGovernor.DOWN * 1.5) {
      this.reversals = 0;
      this.lastDirection = 0;
    }
    if (this.settled) return this.scale;
    let direction: 1 | -1 | 0 = 0;
    if (p50 > ResolutionGovernor.DOWN && this.scale > ResolutionGovernor.MIN) direction = -1;
    else if (p50 < ResolutionGovernor.UP && this.scale < 1) direction = 1;
    if (!direction) return this.scale;
    if (this.lastDirection && direction !== this.lastDirection) this.reversals++;
    this.lastDirection = direction;
    this.scale = Math.min(1, Math.max(ResolutionGovernor.MIN, +(this.scale + direction * ResolutionGovernor.STEP).toFixed(2)));
    this.hold = ResolutionGovernor.HOLD_SAMPLES;
    return this.scale;
  }

  reset(): void {
    this.scale = 1;
    this.lastDirection = 0;
    this.reversals = 0;
    this.hold = 0;
  }
}

/**
 * Drops the render rate to half when nothing has asked for a frame for a while, and goes back to full
 * at the first event. Animations that explain behaviour count as work and keep the full rate.
 */
export class IdleGovernor {
  private lastInput = 0;
  private parity = 0;

  constructor(private readonly idleMs = 3000) {}

  /** Records user input or a state change at `now` (ms). */
  touch(now: number): void {
    this.lastInput = now;
  }

  idle(now: number): boolean {
    return now - this.lastInput >= this.idleMs;
  }

  /** True when this frame should be drawn: every frame while active, every other frame while idle. */
  frameAllowed(now: number, busy: boolean): boolean {
    if (busy || !this.idle(now)) {
      this.parity = 0;
      return true;
    }
    this.parity ^= 1;
    return this.parity === 1;
  }
}

export type Tier = 'high' | 'balanced' | 'low';
const ORDER: Tier[] = ['low', 'balanced', 'high'];

/**
 * Picks the graphics profile from what the frames cost. It steps down when the resolution had to fall and
 * the frame is still slow for several windows, and steps up only after a long calm stretch at full
 * resolution. Never more than one tier per decision, and a cool-down between decisions.
 */
export class QualityGovernor {
  private slow = 0;
  private fast = 0;
  private cooldown = 0;

  static readonly SLOW_WINDOWS = 3;
  static readonly FAST_WINDOWS = 8;
  static readonly COOLDOWN = 4;

  /** `p50` in ms, `scale` the resolution governor's value. Returns a tier to move to, or undefined. */
  update(tier: Tier, p50: number, scale: number): Tier | undefined {
    if (this.cooldown > 0) {
      this.cooldown--;
      return undefined;
    }
    const i = ORDER.indexOf(tier);
    this.slow = p50 > 24 && scale <= 0.8 ? this.slow + 1 : 0;
    this.fast = p50 > 0 && p50 < 11 && scale >= 1 ? this.fast + 1 : 0;
    if (this.slow >= QualityGovernor.SLOW_WINDOWS && i > 0) {
      this.slow = this.fast = 0;
      this.cooldown = QualityGovernor.COOLDOWN;
      return ORDER[i - 1];
    }
    if (this.fast >= QualityGovernor.FAST_WINDOWS && i < ORDER.length - 1) {
      this.slow = this.fast = 0;
      this.cooldown = QualityGovernor.COOLDOWN;
      return ORDER[i + 1];
    }
    return undefined;
  }

  reset(): void {
    this.slow = this.fast = this.cooldown = 0;
  }
}
