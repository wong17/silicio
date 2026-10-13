import type { Snapshot, Trace } from '../simulation/cpu8086';
import type { SceneCommand } from '../world/scene-controls.component';
export type PieceId = string;
export interface LaboratorySources {
  snapshot: () => Snapshot;
  event: () => Trace | undefined;
  selection: () => PieceId;
  experience: () => string;
}
export type LaboratoryIntent =
  | { kind: 'scene'; command: SceneCommand }
  | { kind: 'instrument'; command: 'step' | 'run' | 'pause' | 'load' | 'back' };
export interface LaboratoryHandlers {
  scene: (command: SceneCommand) => void;
  instrument: (command: Extract<LaboratoryIntent, { kind: 'instrument' }>['command']) => void;
}
