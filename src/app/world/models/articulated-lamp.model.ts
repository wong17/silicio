import * as T from 'three';
import { RENDER_ORDER } from '../render-order';
import { WorkshopGeometry } from './workshop-geometry';
import { BENCH } from './bench-layout';
import { LAMP_LINKS } from '../lamp-rig';

/** Meshes the lamp controller moves each frame. Arm segments keep their length; only their pose changes. */
export interface LampRig {
  group: T.Group;
  shoulder: T.Mesh;
  elbow: T.Mesh;
  wrist: T.Mesh;
  upper: T.Mesh;
  fore: T.Mesh;
  head: T.Group;
  /** Lens that brightens when the lamp is on. */
  lens: T.Mesh;
  /** Knurled grip on top of the head; dragging it moves the light. */
  handle: T.Mesh;
  /** Unit cone with its apex at the origin, scaled to the beam length. */
  beam: T.Mesh;
  /** Dust motes suspended in the beam, drawn with additive blending. */
  dust: T.Points;
  /** Height of the shoulder above the bench top. */
  columnHeight: number;
}

const DUST = 150;

/** Articulated desk lamp: base, column, two arm segments, a head that tilts toward the aim point. */
export class ArticulatedLampModel extends WorkshopGeometry {
  build(parent: T.Object3D, parts: Map<string, T.Object3D>): LampRig {
    const group = new T.Group();
    group.userData['part'] = 'lamp';
    parts.set('lamp', group);
    parent.add(group);
    const steel = this.tools.material('lamp-steel', '#4a5053', 0.42, 0.85, { finish: 'steel', wear: 0.55, scratches: 14, size: 128 });
    const enamel = this.tools.material('lamp-enamel', '#2e3a35', 0.5, 0.2, { finish: 'paint', exposed: '#8f8a7c', wear: 0.4, dirt: 0.45, scratches: 8, size: 128 });
    const copper = this.tools.material('lamp-handle', '#b47a4c', 0.4, 0.6, { finish: 'steel', exposed: '#d19b6c', wear: 0.3, size: 64 });
    const base = new T.LatheGeometry(
      [
        new T.Vector2(0, 0),
        new T.Vector2(0.72, 0),
        new T.Vector2(0.76, 0.1),
        new T.Vector2(0.66, 0.2),
        new T.Vector2(0.24, 0.24),
        new T.Vector2(0, 0.24),
      ],
      36,
    );
    const top = BENCH.top;
    const mesh = (geometry: T.BufferGeometry, material: T.Material) => {
      const m = new T.Mesh(this.tools.track(geometry), material);
      m.castShadow = m.receiveShadow = true;
      group.add(m);
      return m;
    };
    mesh(base, enamel).position.set(BENCH.lamp.x, top, BENCH.lamp.z);
    const columnHeight = 2.9;
    const column = mesh(new T.CylinderGeometry(0.13, 0.15, columnHeight, 24), enamel);
    column.position.set(BENCH.lamp.x, top + columnHeight / 2, BENCH.lamp.z);
    const shoulder = mesh(new T.SphereGeometry(0.2, 18, 12), steel);
    const elbow = mesh(new T.SphereGeometry(0.19, 18, 12), steel);
    const wrist = mesh(new T.SphereGeometry(0.19, 18, 12), steel);
    const upper = mesh(new T.CylinderGeometry(0.11, 0.11, LAMP_LINKS.upper, 18), enamel);
    const fore = mesh(new T.CylinderGeometry(0.095, 0.095, LAMP_LINKS.fore, 18), enamel);
    // Head: a shade open at the bottom, its axis along local -Y so the rim faces the bench.
    const head = new T.Group();
    group.add(head);
    const shadeProfile = [
      new T.Vector2(0.24, 0.42),
      new T.Vector2(0.34, 0.1),
      new T.Vector2(0.95, -0.22),
      new T.Vector2(1.0, -0.26),
    ];
    const shadeMaterial = this.tools.material('lamp-shade', '#2e3a35', 0.44, 0.35, {
      finish: 'paint',
      exposed: '#9a9482',
      wear: 0.4,
      dirt: 0.4,
      size: 128,
    });
    shadeMaterial.side = T.DoubleSide;
    const shade = new T.Mesh(this.tools.track(new T.LatheGeometry(shadeProfile, 40)), shadeMaterial);
    shade.castShadow = true;
    head.add(shade);
    const lens = new T.Mesh(
      this.tools.track(new T.CircleGeometry(0.86, 40)),
      this.tools.track(
        new T.MeshStandardMaterial({ color: '#fff1d6', emissive: '#ffe2b0', emissiveIntensity: 1.6, side: T.DoubleSide }),
      ),
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.y = -0.2;
    head.add(lens);
    const handle = new T.Mesh(this.tools.track(new T.SphereGeometry(0.17, 18, 12)), copper);
    handle.position.set(0, 0.56, 0);
    handle.name = 'lamp-handle';
    handle.userData['lampHandle'] = true;
    head.add(handle);
    const beam = new T.Mesh(
      this.tools.track(new T.ConeGeometry(1, 1, 36, 1, true)),
      this.tools.track(
        new T.MeshBasicMaterial({
          color: '#ffe2b0',
          transparent: true,
          opacity: 0.05,
          depthWrite: false,
          side: T.DoubleSide,
          blending: T.AdditiveBlending,
        }),
      ),
    );
    beam.geometry.translate(0, -0.5, 0);
    beam.visible = false;
    beam.renderOrder = RENDER_ORDER.beam;
    beam.userData['noBounds'] = true;
    group.add(beam);
    const dustGeometry = this.tools.track(new T.BufferGeometry());
    dustGeometry.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(DUST * 3), 3));
    const dust = new T.Points(
      dustGeometry,
      this.tools.track(
        new T.PointsMaterial({
          color: '#ffe6b8',
          size: 0.05,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: T.AdditiveBlending,
        }),
      ),
    );
    dust.frustumCulled = false;
    dust.renderOrder = RENDER_ORDER.dust;
    dust.userData['noBounds'] = true;
    group.add(dust);
    // Moving parts are excluded from static batching; their poses are rewritten every frame.
    for (const m of [shoulder, elbow, wrist, upper, fore, handle, beam]) m.userData['dynamic'] = true;
    return {
      group,
      shoulder,
      elbow,
      wrist,
      upper,
      fore,
      head,
      lens,
      handle,
      beam,
      dust,
      columnHeight,
    };
  }
}
