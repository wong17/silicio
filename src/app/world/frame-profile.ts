/** RAF interval distribution, not a GPU timer. Long tab-resume stalls are excluded. */
export class FrameProfile {
  private values: number[] = [];
  sample(dt: number): void {
    if (dt <= 0 || dt > 0.2 || !Number.isFinite(dt)) return;
    this.values.push(dt * 1000);
    if (this.values.length > 240) this.values.shift();
  }
  get result() {
    const v = [...this.values].sort((a, b) => a - b);
    return {
      samples: v.length,
      p50: v[Math.max(0, Math.ceil(v.length * 0.5) - 1)] ?? 0,
      p95: v[Math.max(0, Math.ceil(v.length * 0.95) - 1)] ?? 0,
    };
  }
  reset(): void {
    this.values = [];
  }
}
