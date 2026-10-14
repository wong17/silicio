import * as T from 'three';
export interface ViewportRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
/** Fixed clip planes: the room is 76 wide, so framing a small piece must never shorten the far plane. */
export const CAMERA_CLIP = { near: 0.1, far: 140 } as const;
/** Off-axis projection places the subject in the visible editor region, not behind its overlays. */
export function frameBounds(
  camera: T.PerspectiveCamera,
  bounds: T.Box3,
  region: ViewportRegion,
  viewport: { width: number; height: number },
  direction = new T.Vector3(1, 1.5, 2),
): T.Vector3 {
  const sphere = bounds.getBoundingSphere(new T.Sphere()),
    w = Math.max(1, viewport.width),
    h = Math.max(1, viewport.height);
  camera.aspect = w / h;
  const coverage = Math.max(0.05, Math.min(region.height / h, (region.width / w) * camera.aspect));
  const angle = Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * coverage);
  const distance = Math.max(0.3, (sphere.radius / Math.sin(angle)) * 1.06);
  const position = sphere.center
    .clone()
    .add(direction.clone().normalize().multiplyScalar(distance));
  camera.position.copy(position);
  camera.lookAt(sphere.center);
  camera.near = CAMERA_CLIP.near;
  camera.far = CAMERA_CLIP.far;
  camera.setViewOffset(
    w,
    h,
    w / 2 - region.x - region.width / 2,
    h / 2 - region.y - region.height / 2,
    w,
    h,
  );
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return position;
}
