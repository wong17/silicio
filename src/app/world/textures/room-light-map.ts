import * as T from 'three';

/**
 * Baked light for the room shell. `u` runs across a wall (0 to 1) and `v` from the floor up. The result is a
 * multiplier around 0.2 to 1: a pool under each luminaire, a soft fall-off into the corners and above the
 * baseboard, never black, so distant walls read even when the dynamic lights do not reach them.
 */
export function lightMapLuminance(u: number, v: number): number {
  const pools = [0.18, 0.5, 0.82].reduce((sum, c) => sum + Math.exp(-((u - c) ** 2) / 0.018), 0);
  const corner = 1 - 0.55 * Math.max(0, 1 - Math.min(u, 1 - u) / 0.14) ** 2;
  const floorBand = 0.62 + 0.38 * Math.min(1, v / 0.16);
  const ceilingBand = 0.78 + 0.22 * Math.min(1, (1 - v) / 0.18);
  const body = 0.52 + 0.4 * Math.min(1, pools) * (0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, v * 1.15)));
  return Math.min(1, Math.max(0.2, body * corner * floorBand * ceilingBand));
}

/** Smallest value the map produces, sampled on a grid; the test requires it to stay above 0.18. */
export function minLightMapLuminance(steps = 64): number {
  let min = 1;
  for (let i = 0; i <= steps; i++)
    for (let j = 0; j <= steps; j++) min = Math.min(min, lightMapLuminance(i / steps, j / steps));
  return min;
}

/** 64 x 64 grey canvas texture of the map, used as `lightMap` on unlit-shaded wall materials. */
export function createRoomLightMap(track: <G extends T.Texture>(r: G) => G): T.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const image = context.createImageData(size, size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const l = Math.round(255 * lightMapLuminance(x / (size - 1), 1 - y / (size - 1)));
        const i = (y * size + x) * 4;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = l;
        image.data[i + 3] = 255;
      }
    context.putImageData(image, 0, 0);
  }
  const texture = track(new T.CanvasTexture(canvas));
  texture.channel = 0;
  texture.colorSpace = T.NoColorSpace;
  return texture;
}

/**
 * An unlit material that keeps the surface's own texture and multiplies it by the baked light. It ignores
 * dynamic lights, so a wall is never black and costs nothing per light.
 */
export function bakedShellMaterial(
  source: T.Material,
  lightMap: T.Texture,
  track: <G extends T.Material>(r: G) => G,
): T.MeshBasicMaterial {
  const base = source as T.MeshStandardMaterial;
  const material = track(
    new T.MeshBasicMaterial({
      map: base.map ?? null,
      color: base.color ? base.color.clone() : new T.Color('#c3cbc1'),
      lightMap,
      fog: true,
    }),
  );
  // lightMap is added as irradiance and then multiplied by the albedo; 3.2 keeps painted walls readable.
  (material as unknown as { lightMapIntensity: number }).lightMapIntensity = 3.2;
  material.name = (source.name || 'shell') + '-baked';
  return material;
}
