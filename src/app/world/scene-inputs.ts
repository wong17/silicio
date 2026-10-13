import type { QualityTier } from './effects/effects-pipeline';
import type { PieceDefinition } from './interaction-registry';
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
}
export interface SceneCallbacks {
  pieces: (pieces: PieceDefinition[]) => void;
  picked: (id: string) => void;
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
  };
}
