import type * as T from 'three';
import type { WorkshopTools } from './workshop-tools';
import { Intel8086Model } from './models/intel-8086.model';
import { AppleSocModel } from './models/apple-soc.model';
export type { WorkshopTools } from './workshop-tools';
/** Model factory only. Renderer lifecycle belongs to the scene engine. */
export class ElectronicsWorkshop {
  constructor(private tools: WorkshopTools) {}
  cpu(root: T.Group, parts: Map<string, T.Object3D>): void {
    new Intel8086Model(this.tools).build(root, parts);
  }
  soc(root: T.Group): void {
    new AppleSocModel(this.tools).build(root);
  }
}
