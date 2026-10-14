import type * as T from 'three';
import type { StationActivity } from '../laboratory/station-activity';
import type { LabelOptions } from './textures/label-ink';
import type { SurfaceLook } from './textures/surface-library';

/** Per-frame update of one model part; `seconds` is scene time, frozen when reduced motion is on. */
export type Animator = (seconds: number) => void;

export interface WorkshopTools {
  track<G extends T.Material | T.BufferGeometry | T.Texture>(resource: G): G;
  material(
    id: string,
    color: string,
    roughness: number,
    metalness: number,
    look?: SurfaceLook,
  ): T.MeshStandardMaterial;
  label(
    parent: T.Object3D,
    text: string,
    x: number,
    y: number,
    z: number,
    width?: number,
    options?: LabelOptions,
  ): T.Object3D | void;
  /** Repaints a legend created with `label`. Optional so geometry-only test tools can omit it. */
  relabel?(label: T.Object3D, text: string): void;
  /**
   * Subscribes a model to the station activity. The subscription ends with the subject, and the model is
   * called at once with the current activity so a rebuilt station shows the live state.
   */
  onActivity?(listener: (activity: StationActivity) => void): void;
  /**
   * Registers an animator. The room scope lives as long as the bench; the subject scope is dropped
   * when the station changes, together with the geometry it drives.
   */
  animate(update: Animator, scope?: 'room' | 'subject'): void;
}
