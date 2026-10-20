/**
 * The shared-buffer exercise of the SoC: an 8×8 mosaic of gray levels is prepared by the CPU, inverted by the
 * GPU (255 − value) and received by the CPU. With shared memory the same buffer is handed over; with separate
 * memories the 64 bytes are copied to the device and back. It counts the explicit copies and nothing else:
 * no latency and no throughput, because none of it is measured here.
 */
export const TILE_SIZE = 64;
export type MemoryMode = 'shared' | 'separate';
export type ReadResult = { kind: 'waiting'; reason: string } | { kind: 'ready'; values: readonly number[] };

export interface BufferView {
  input: { id: string; values: number[] };
  output: { id: string; values: number[] };
  completed: boolean;
  stage: 0 | 1 | 2;
  version: number;
}

export const defaultTile = (): number[] => Array.from({ length: TILE_SIZE }, (_, i) => Math.round((i * 255) / 63));

export function validTile(values: readonly number[]): boolean {
  return values.length === TILE_SIZE && values.every((v) => Number.isInteger(v) && v >= 0 && v <= 255);
}

export class BufferExperiment {
  view: BufferView = {
    input: { id: 'B0', values: defaultTile() },
    output: { id: 'B1', values: [] },
    completed: false,
    stage: 0,
    version: 0,
  };
  mode: MemoryMode = 'shared';
  /** Bytes copied by explicit transfers: to the device before the GPU, back to the CPU after it. */
  copies = { toDevice: 0, fromDevice: 0 };

  setInput(values: readonly number[]): void {
    if (!validTile(values)) throw Error('El mosaico necesita 64 valores de 0 a 255.');
    this.view = { ...this.view, input: { id: 'B0', values: [...values] }, output: { id: 'B1', values: [] }, completed: false, stage: 0 };
    this.copies = { toDevice: 0, fromDevice: 0 };
  }

  setMode(mode: MemoryMode): void {
    this.mode = mode;
    this.reset();
  }

  /** Back to the start with the same input and mode. */
  reset(): void {
    this.view = { ...this.view, output: { id: 'B1', values: [] }, completed: false, stage: 0 };
    this.copies = { toDevice: 0, fromDevice: 0 };
  }

  /** The three steps of the dependency; after the last one it starts over. */
  advance(): void {
    const stage = ((this.view.stage + 1) % 3) as 0 | 1 | 2;
    if (stage === 0) {
      this.reset();
      return;
    }
    if (stage === 1) {
      if (this.mode === 'separate') this.copies = { ...this.copies, toDevice: TILE_SIZE };
      this.view = { ...this.view, stage, completed: false };
      return;
    }
    if (this.mode === 'separate') this.copies = { ...this.copies, fromDevice: TILE_SIZE };
    this.view = {
      ...this.view,
      stage,
      completed: true,
      version: this.view.version + 1,
      output: { id: 'B1', values: this.view.input.values.map((v) => 255 - v) },
    };
  }

  /** The CPU asks for B1: before the GPU signals completion there is nothing valid to read. */
  readOutput(): ReadResult {
    if (!this.view.completed)
      return { kind: 'waiting', reason: 'La GPU aún no ha señalado el fin: B1 no es válido todavía.' };
    return { kind: 'ready', values: this.view.output.values };
  }

  /** Puts the dependency at a stage by replaying it from the start (the copies follow). */
  restoreStage(stage: 0 | 1 | 2): void {
    this.reset();
    for (let n = 0; n < stage; n++) this.advance();
  }

  get explicitCopyBytes(): number {
    return this.copies.toDevice + this.copies.fromDevice;
  }
}
