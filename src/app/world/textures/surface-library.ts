import * as THREE from 'three';
import { computeSurface, surfaceCanvases, type SurfaceFinish, type SurfaceSpec } from './surface-maps';

/** Optional authoring overrides; anything omitted is derived from the colour and roughness. */
export type SurfaceLook = Partial<
  Pick<SurfaceSpec, 'finish' | 'exposed' | 'grime' | 'dirt' | 'wear' | 'bump' | 'scratches' | 'metal' | 'size'>
> & {
  /** Tiles per UV unit; large panels repeat a patch instead of stretching one.*/
  repeat?: [number, number];
};

const GRIME = '#4b4a41';

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h;
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16),
    pb = parseInt(b.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return '#' + [16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('');
}

/** Derives a physically plausible worn surface from a flat colour when no look is authored. */
export function resolveSurface(
  id: string,
  color: string,
  roughness: number,
  metalness: number,
  look: SurfaceLook = {},
): SurfaceSpec {
  const metal = metalness >= 0.5;
  const finish: SurfaceFinish =
    look.finish ?? (metal ? 'steel' : roughness >= 0.85 ? 'rubber' : 'plastic');
  return {
    seed: hashString(id),
    finish,
    albedo: color,
    exposed: look.exposed ?? (metal ? '#c6c9cb' : mixHex(color, '#d8d2c0', 0.35)),
    grime: look.grime ?? GRIME,
    dirt: look.dirt ?? 0.35,
    wear: look.wear ?? (metal ? 0.4 : 0.12),
    roughness: [Math.max(0.05, roughness * 0.8), Math.min(1, roughness * 1.1 + 0.04)],
    bump: look.bump ?? (metal ? 0.35 : 0.5),
    scratches: look.scratches ?? (metal ? 6 : 2),
    metal: look.metal ?? metal,
    size: look.size ?? 128,
  };
}

/** Owns surface materials for the lifetime of the renderer; identical ids share one material. */
export class SurfaceLibrary {
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  constructor(private readonly track: <G extends THREE.Material | THREE.Texture>(r: G) => G) {}

  material(
    id: string,
    color: string,
    roughness: number,
    metalness: number,
    look?: SurfaceLook,
  ): THREE.MeshStandardMaterial {
    const cached = this.materials.get(id);
    if (cached) return cached;
    const spec = resolveSurface(id, color, roughness, metalness, look);
    const maps = surfaceCanvases(computeSurface(spec));
    const repeat = look?.repeat ?? [1, 1];
    const texture = (canvas: HTMLCanvasElement, srgb = false) => {
      const t = this.track(new THREE.CanvasTexture(canvas));
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
      return t;
    };
    // Maps carry the spatial variation; scalars keep the authored range.
    const mat = this.track(
      new THREE.MeshStandardMaterial({
        map: texture(maps.map, true),
        roughnessMap: texture(maps.roughnessMap),
        normalMap: texture(maps.normalMap),
        metalnessMap: spec.metal ? texture(maps.metalnessMap) : null,
        metalness: metalness,
        roughness: 1,
      }),
    );
    mat.name = id;
    this.materials.set(id, mat);
    return mat;
  }

  /** True for materials that outlive a station, so a subject rebuild must not dispose them. */
  owns(material: THREE.Material): boolean {
    return [...this.materials.values()].includes(material as THREE.MeshStandardMaterial);
  }

  dispose(): void {
    this.materials.clear();
  }
}
