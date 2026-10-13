/** Diagnostic ownership probe; does not inspect contents or alter uploaded data. */ export class GpuResources {
  private live = new Set<WebGLBuffer>();
  private create: WebGL2RenderingContext['createBuffer'];
  private remove: WebGL2RenderingContext['deleteBuffer'];
  constructor(private gl: WebGL2RenderingContext) {
    this.create = gl.createBuffer;
    this.remove = gl.deleteBuffer;
    gl.createBuffer = () => {
      const buffer = this.create.call(gl);
      if (buffer) this.live.add(buffer);
      return buffer;
    };
    gl.deleteBuffer = (buffer) => {
      if (buffer) this.live.delete(buffer);
      this.remove.call(gl, buffer);
    };
  }
  get bufferCount() {
    return this.live.size;
  }
  dispose(): void {
    this.gl.createBuffer = this.create;
    this.gl.deleteBuffer = this.remove;
    this.live.clear();
  }
}
