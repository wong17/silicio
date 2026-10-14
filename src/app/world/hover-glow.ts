import * as T from 'three';

/**
 * Lightens the piece under the pointer for a moment: a thin additive shell over each of its meshes, fading
 * in over 90 ms and removed on leave. Shared materials are never touched, so no other piece changes.
 */
export class HoverGlow {
  private readonly material = new T.MeshBasicMaterial({
    color: '#ffe3b0',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: T.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  private shells: T.Mesh[] = [];
  private target = 0;
  static readonly MAX = 0.16;
  static readonly SECONDS = 0.09;

  get opacity(): number {
    return this.material.opacity;
  }

  get shellCount(): number {
    return this.shells.length;
  }

  show(object: T.Object3D | undefined): void {
    this.clearShells();
    if (!object) {
      this.target = 0;
      return;
    }
    object.traverse((o) => {
      const mesh = o as T.Mesh;
      if (!mesh.isMesh || (mesh as T.InstancedMesh).isInstancedMesh) return;
      if (!mesh.visible || o.userData['noBounds'] || o.userData['glow'] || mesh.material === this.material) return;
      const shell = new T.Mesh(mesh.geometry, this.material);
      shell.userData['glow'] = true;
      shell.userData['noBounds'] = true;
      shell.renderOrder = 6;
      shell.raycast = () => {};
      mesh.add(shell);
      this.shells.push(shell);
    });
    this.target = HoverGlow.MAX;
  }

  /** Called when the pointer leaves: the shells go at once and the opacity returns to zero. */
  clear(): void {
    this.clearShells();
    this.target = 0;
    this.material.opacity = 0;
  }

  update(dt: number, reduced: boolean): void {
    const goal = this.target;
    const o = this.material.opacity;
    if (o === goal) return;
    if (reduced || dt <= 0) {
      this.material.opacity = goal;
      return;
    }
    // Linear ramp: the full shell opacity is reached in HoverGlow.SECONDS.
    const rate = (HoverGlow.MAX / HoverGlow.SECONDS) * dt;
    this.material.opacity = goal > o ? Math.min(goal, o + rate) : Math.max(goal, o - rate);
  }

  private clearShells(): void {
    for (const s of this.shells) s.parent?.remove(s);
    this.shells = [];
  }

  dispose(): void {
    this.clearShells();
    this.material.dispose();
  }
}
