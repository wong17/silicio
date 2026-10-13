import { FrameProfile } from './frame-profile';
interface TimerExtension {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}
export class GpuProfile {
  readonly profile = new FrameProfile();
  private ext: TimerExtension | null;
  private pending: WebGLQuery[] = [];
  private active?: WebGLQuery;
  constructor(private gl: WebGL2RenderingContext) {
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  }
  get enabled() {
    return !!this.ext;
  }
  begin(): void {
    this.poll();
    if (!this.ext || this.active || this.pending.length >= 2) return;
    const q = this.gl.createQuery();
    if (q) {
      this.active = q;
      this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    }
  }
  end(): void {
    if (this.active && this.ext) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.pending.push(this.active);
      this.active = undefined;
    }
  }
  poll(): void {
    if (!this.ext) return;
    const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    this.pending = this.pending.filter((q) => {
      const available = this.gl.getQueryParameter(q, this.gl.QUERY_RESULT_AVAILABLE);
      if (available && !disjoint)
        this.profile.sample(this.gl.getQueryParameter(q, this.gl.QUERY_RESULT) / 1e9);
      if (available || disjoint) {
        this.gl.deleteQuery(q);
        return false;
      }
      return true;
    });
  }
  reset(): void {
    this.end();
    for (const q of this.pending) this.gl.deleteQuery(q);
    this.pending = [];
    this.profile.reset();
  }
  dispose(): void {
    this.end();
    for (const q of this.pending) this.gl.deleteQuery(q);
    this.pending = [];
  }
}
