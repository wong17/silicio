import type * as T from 'three';
import type { WorkshopTools } from '../workshop-tools';
import { Intel2164aMemoryModel } from './intel-2164a-memory.model';
import { KingstonDimmModel } from './kingston-dimm.model';
/** Reference-specific factories; no CPU or renderer ownership. */ export class MemoryModels {
  constructor(private tools: WorkshopTools) {}
  classic(root: T.Group, parts: Map<string, T.Object3D>): void {
    new Intel2164aMemoryModel(this.tools).build(root, parts);
  }
  dimm(root: T.Group, parts: Map<string, T.Object3D>): void {
    new KingstonDimmModel(this.tools).build(root, parts);
  }
}
