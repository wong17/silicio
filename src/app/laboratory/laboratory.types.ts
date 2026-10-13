import type { Snapshot, Trace } from '../simulation/cpu8086';

export type PieceId = string;

export interface LaboratorySources {
  snapshot: () => Snapshot;
  event: () => Trace | undefined;
  selection: () => PieceId;
  experience: () => string;
}
