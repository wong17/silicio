import type { QualityTier } from './effects/effects-pipeline';
import type { PieceDefinition } from './interaction-registry';
import type { LampTarget } from './lamp-limits';
export type { QualityTier };

export type Section = 'atrium' | '8086' | 'memory' | 'time' | 'apple' | 'machine';

export interface SceneInputs {
  section: Section;
  exploded: boolean;
  activePart: string;
  tick: number;
  memoryCells: { address: number; value: number }[];
  history: { address: number; text: string; ax: number }[];
  memoryBase: number;
  viewMode: 'material' | 'wireframe';
  manipulate: boolean;
  inspection: boolean;
  memoryModel: 'classic' | 'dimm';
  reduced: boolean;
  quality: QualityTier;
  signalChannel: string;
  readAccess: boolean;
  writeAccess: boolean;
  /** Aim point and head height of the articulated lamp. */
  lamp: LampTarget;
  lampOn: boolean;
}

export interface SceneCallbacks {
  pieces: (pieces: PieceDefinition[]) => void;
  picked: (id: string) => void;
  /** Piece under the pointer, or null when the pointer leaves every piece. */
  hovered: (id: string | null) => void;
  /** Lamp dragged on the bench; emitted at a limited rate and once more at the end. */
  lampMoved: (target: LampTarget) => void;
  /** Tool in hand, or null when the hand is empty. */
  holding: (id: string | null) => void;
  unavailable: () => void;
}

export function readSceneInputs(source: SceneInputs): SceneInputs {
  return {
    section: source.section,
    exploded: source.exploded,
    activePart: source.activePart,
    tick: source.tick,
    memoryCells: source.memoryCells,
    history: source.history,
    memoryBase: source.memoryBase,
    viewMode: source.viewMode,
    manipulate: source.manipulate,
    inspection: source.inspection,
    memoryModel: source.memoryModel,
    reduced: source.reduced,
    quality: source.quality,
    signalChannel: source.signalChannel,
    readAccess: source.readAccess,
    writeAccess: source.writeAccess,
    lamp: source.lamp,
    lampOn: source.lampOn,
  };
}
