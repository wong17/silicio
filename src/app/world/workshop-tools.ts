import type * as T from 'three';
export interface WorkshopTools {
  track<G extends T.Material | T.BufferGeometry | T.Texture>(resource: G): G;
  material(id: string, color: string, roughness: number, metalness: number): T.MeshStandardMaterial;
  label(parent: T.Object3D, text: string, x: number, y: number, z: number, width?: number): void;
}
