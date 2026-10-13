import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LAMP_LINKS, createLampPose, solveLamp } from './lamp-rig';

const shoulder = new THREE.Vector3(-7, 2, 2.4);

describe('brazo articulado de la lámpara', () => {
  it('mantiene la longitud de cada segmento cuando el objetivo está al alcance', () => {
    const aim = new THREE.Vector3(0, 0, 0);
    const pose = solveLamp(shoulder, aim, 4, createLampPose());
    expect(pose.clamped).toBe(false);
    expect(pose.shoulder.distanceTo(pose.elbow)).toBeCloseTo(LAMP_LINKS.upper, 6);
    expect(pose.elbow.distanceTo(pose.wrist)).toBeCloseTo(LAMP_LINKS.fore, 6);
  });

  it('coloca el cabezal a la altura pedida sobre el punto iluminado', () => {
    const aim = new THREE.Vector3(0.5, 0, -0.5);
    const pose = solveLamp(shoulder, aim, 3.5, createLampPose());
    expect(pose.wrist.y).toBeCloseTo(aim.y + 3.5, 6);
    expect(pose.wrist.x).toBeCloseTo(aim.x, 6);
    expect(pose.wrist.z).toBeCloseTo(aim.z, 6);
  });

  it('dobla el codo hacia arriba como una lámpara de sobremesa', () => {
    const aim = new THREE.Vector3(0, 0, 0);
    const pose = solveLamp(shoulder, aim, 4, createLampPose());
    // Plane coordinates: r along the horizontal heading to the aim point, h vertical from the shoulder.
    const forward = new THREE.Vector3(aim.x - shoulder.x, 0, aim.z - shoulder.z).normalize();
    const plane = (p: THREE.Vector3) => ({
      r: p.clone().sub(shoulder).dot(forward),
      h: p.y - shoulder.y,
    });
    const wrist = plane(pose.wrist),
      elbow = plane(pose.elbow);
    // Positive cross product: the elbow lies on the upper side of the shoulder-to-wrist line.
    expect(wrist.r * elbow.h - wrist.h * elbow.r).toBeGreaterThan(0);
  });

  it('limita el alcance y inclina la cabeza cuando el punto está fuera del brazo', () => {
    const far = new THREE.Vector3(30, 0, 0);
    const pose = solveLamp(shoulder, far, 4, createLampPose());
    expect(pose.clamped).toBe(true);
    expect(pose.shoulder.distanceTo(pose.wrist)).toBeCloseTo(pose.reach, 6);
    expect(pose.reach).toBeLessThanOrEqual(LAMP_LINKS.upper + LAMP_LINKS.fore);
    expect(pose.aim.x).toBe(30);
  });

  it('reutiliza el objeto de salida sin crear posiciones nuevas en cada fotograma', () => {
    const out = createLampPose();
    const first = out.wrist;
    solveLamp(shoulder, new THREE.Vector3(1, 0, 1), 3, out);
    expect(out.wrist).toBe(first);
  });
});
