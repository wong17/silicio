import type { QualityTier } from './effects/effects-pipeline';
import type { PieceDefinition } from './interaction-registry';
import type { LampTarget } from './lamp-limits';
export type { QualityTier };

export type Section = 'atrium' | '8086' | 'memory' | 'time' | 'apple' | 'machine';

export interface SceneInputs {
  section: Section;
  exploded: boolean;
  /** Opening of the chip, 0 to 1. */
  explodedAmount: number;
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

/** Where a piece stands on the worktop (map) and, when callouts are on, on the canvas (CSS pixels). */
export interface PieceAnchor {
  id: string;
  name: string;
  x: number;
  z: number;
  scope: 'model' | 'bench';
}
export interface ScreenAnchor {
  id: string;
  name: string;
  x: number;
  y: number;
}
export interface CameraView {
  azimuth: number;
  distance: number;
}

export interface SceneCallbacks {
  /** Model and bench piece positions, emitted when the station is (re)built. */
  anchors: (anchors: PieceAnchor[]) => void;
  /** Camera azimuth and distance, at most 10 times per second and only when they changed. */
  view: (view: CameraView) => void;
  /** Projected positions of the main model pieces, at most 10 times per second while callouts are on. */
  callouts: (anchors: ScreenAnchor[]) => void;
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
    explodedAmount: source.explodedAmount,
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
