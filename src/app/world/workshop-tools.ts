import type * as T from 'three';
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
  ): void;
  /**
   * Registers an animator. The room scope lives as long as the bench; the subject scope is dropped
   * when the station changes, together with the geometry it drives.
   */
  animate(update: Animator, scope?: 'room' | 'subject'): void;
}
