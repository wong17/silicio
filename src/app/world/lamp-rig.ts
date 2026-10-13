import * as THREE from 'three';

/** Lengths of the two arm segments in scene units (one unit is the bench's presentation scale). */
export interface LampLinks {
  upper: number;
  fore: number;
}

/** Longer than the first draft so the head can reach the boards and the notebook from the left column. */
export const LAMP_LINKS: LampLinks = { upper: 5.6, fore: 5.2 };

export interface LampPose {
  /** Joint where the arm meets the base column. */
  shoulder: THREE.Vector3;
  /** Middle joint; the elbow always bends upward, as desk lamps do. */
  elbow: THREE.Vector3;
  /** Pivot of the lamp head. */
  wrist: THREE.Vector3;
  /** Point on the bench that the head lights. */
  aim: THREE.Vector3;
  /** Distance from the shoulder to the wrist after reach limits. */
  reach: number;
  /** True when the requested height or aim point lies outside the arm's reach. */
  clamped: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);

export function createLampPose(): LampPose {
  return {
    shoulder: new THREE.Vector3(),
    elbow: new THREE.Vector3(),
    wrist: new THREE.Vector3(),
    aim: new THREE.Vector3(),
    reach: 0,
    clamped: false,
  };
}

/**
 * Two-link solver in the vertical plane through the shoulder and the aim point. The head sits
 * `headHeight` above the aim point when reachable; otherwise the wrist stops at the arm's limit and
 * the head tilts toward the aim point. The result is written into `out` to avoid per-frame garbage.
 */
export function solveLamp(
  shoulder: THREE.Vector3,
  aim: THREE.Vector3,
  headHeight: number,
  out: LampPose = createLampPose(),
  links: LampLinks = LAMP_LINKS,
): LampPose {
  const { upper, fore } = links;
  const desiredX = aim.x - shoulder.x,
    desiredY = aim.y + headHeight - shoulder.y,
    desiredZ = aim.z - shoulder.z;
  const horizontal = Math.hypot(desiredX, desiredZ);
  const forward = horizontal > 1e-6
    ? new THREE.Vector3(desiredX / horizontal, 0, desiredZ / horizontal)
    : new THREE.Vector3(1, 0, 0);
  const requested = Math.hypot(horizontal, desiredY);
  const minimum = Math.abs(upper - fore) + 0.05,
    maximum = upper + fore - 0.05;
  const distance = THREE.MathUtils.clamp(requested, minimum, maximum);
  const scale = requested > 1e-9 ? distance / requested : 0;
  const r = requested > 1e-9 ? horizontal * scale : distance,
    h = requested > 1e-9 ? desiredY * scale : 0;
  const alpha = Math.atan2(h, r);
  const cosBeta = THREE.MathUtils.clamp(
    (upper * upper + distance * distance - fore * fore) / (2 * upper * distance),
    -1,
    1,
  );
  const theta = alpha + Math.acos(cosBeta);
  out.shoulder.copy(shoulder);
  out.elbow
    .copy(shoulder)
    .addScaledVector(forward, upper * Math.cos(theta))
    .addScaledVector(UP, upper * Math.sin(theta));
  out.wrist
    .copy(shoulder)
    .addScaledVector(forward, r)
    .addScaledVector(UP, h);
  out.aim.copy(aim);
  out.reach = distance;
  out.clamped = Math.abs(distance - requested) > 1e-6;
  return out;
}
