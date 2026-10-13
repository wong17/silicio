import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';
import { BENCH } from './bench-layout';
import { seededRandom } from '../textures/noise';

/** Inner half width of the room: the back wall, the floor and the ceiling span it; the side walls stand just outside. */
const SPAN = 38;
/** Inner face of the front wall; the camera never gets this far (room-bounds.ts). */
const FAR_Z = 38;
/** Centre of the back plaster wall; its front face sits at z = -9.7, just behind the pegboard. */
const BACK_Z = -10;
const WALL = 0.6;
const CEILING_SPAN = BENCH.ceiling - BENCH.floor;

/**
 * The laboratory around the bench. The back wall is the only wall: the pegboard, the shelves, the
 * storage and the clock are fixed to it. The floor, the ceiling and the cabinets stand in the open room.
 * Decoration only: none of it is selectable, so none of it enters the part maps.
 */
export class LabRoomModel extends WorkshopGeometry {
  build(scene: T.Object3D): void {
    // A group of its own: the shell never casts shadows, because the lamp only needs to light the bench.
    const parent = new T.Group();
    scene.add(parent);
    const midY = (BENCH.ceiling + BENCH.floor) / 2;
    const depth = FAR_Z - BACK_Z;
    const centreZ = (FAR_Z + BACK_Z) / 2;
    // Walls: painted ESD panels in a cool sage grey, two panels per tile, with a deeper band near the floor. One tile
    // runs the full height of a wall, so the band sits at the same height on every wall.
    const plaster = this.tools.material('lab-plaster', '#c3cbc1', 0.8, 0, {
      finish: 'panel',
      exposed: '#d8dbd2',
      grime: '#7d8178',
      dirt: 0.3,
      wear: 0.08,
      size: 256,
      repeat: [4, 1],
    });
    // Ceiling: acoustic tiles, a grid of hairline joints and fine perforations.
    const ceilingMaterial = this.tools.material('lab-ceiling', '#d9dacf', 0.9, 0, {
      finish: 'acoustic',
      dirt: 0.25,
      size: 128,
      repeat: [3.2, 2],
    });
    const steel = this.tools.material('lab-steel', '#9ba3a6', 0.35, 0.9, { finish: 'steel', wear: 0.3, size: 64 });
    const rubber = this.tools.material('lab-rubber', '#1c1f20', 0.9, 0, { finish: 'rubber', size: 64 });
    const cabinet = this.tools.material('lab-cabinet', '#5a6a64', 0.55, 0.3, {
      finish: 'paint',
      exposed: '#8a8d88',
      grime: '#3a3831',
      dirt: 0.35,
      wear: 0.3,
      scratches: 8,
      size: 128,
    });
    const cabinetFront = this.tools.material('lab-cabinet-front', '#687a73', 0.5, 0.25, {
      finish: 'paint',
      exposed: '#9a9d97',
      grime: '#3a3831',
      dirt: 0.3,
      wear: 0.25,
      size: 128,
    });

    // The room is closed: the wall the bench faces, two side walls and a front wall beyond the camera's reach.
    this.box(parent, 2 * SPAN + 2 * WALL, CEILING_SPAN, WALL, 0, midY, BACK_Z, plaster);
    this.box(parent, WALL, CEILING_SPAN, depth, -(SPAN + WALL / 2), midY, centreZ, plaster);
    this.box(parent, WALL, CEILING_SPAN, depth, SPAN + WALL / 2, midY, centreZ, plaster);
    this.box(parent, 2 * SPAN + 2 * WALL, CEILING_SPAN, WALL, 0, midY, FAR_Z + WALL / 2, plaster);
    this.box(parent, 2 * SPAN, 0.5, 0.14, 0, BENCH.floor + 0.25, BACK_Z + WALL / 2 + 0.07, rubber);
    // Ceiling slab: its underside is BENCH.ceiling, and the camera is kept below it (room-bounds.ts).
    this.box(parent, 2 * SPAN, 0.4, depth, 0, BENCH.ceiling + 0.2, centreZ, ceilingMaterial);
    const floor = new T.Mesh(
      this.tools.track(new T.PlaneGeometry(2 * SPAN, depth)),
      this.tools.material('lab-floor', '#7f8f88', 0.6, 0, {
        finish: 'tile',
        exposed: '#a39a86',
        grime: '#4a4a42',
        dirt: 0.45,
        wear: 0.2,
        size: 256,
        repeat: [(2 * SPAN) / 4, depth / 4],
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, BENCH.floor, centreZ);
    floor.receiveShadow = true;
    parent.add(floor);

    this.baseCabinet(parent, cabinet, cabinetFront, steel, rubber);
    this.tubes(parent);
    this.storageRight(parent, cabinet, cabinetFront, steel);
    this.shelvesLeft(parent);
    this.trolley(parent, steel, cabinet);
    this.stool(parent, steel, rubber);
    this.clock(parent);
    this.extinguisher(parent, steel);
    this.pipes(parent, midY);
    const bin = this.tools.material('lab-bin', '#3b4245', 0.5, 0.4, { finish: 'steel', wear: 0.4, dirt: 0.5, size: 64 });
    this.cylinder(parent, 0.6, 1.8, -18.5, BENCH.floor + 0.9, 13, bin);
    parent.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = false;
    });
  }

  /** Cabinet under the worktop: it reaches the floor, so the bench stands on something. */
  private baseCabinet(parent: T.Object3D, body: T.Material, front: T.Material, steel: T.Material, rubber: T.Material): void {
    const top = BENCH.top - 0.45;
    const plinthTop = BENCH.floor + 0.6;
    const height = top - plinthTop;
    const z0 = -9.4,
      z1 = 10.4;
    this.box(parent, 29.2, height, z1 - z0, 0, (top + plinthTop) / 2, (z0 + z1) / 2, body);
    // Recessed kick plate under the cabinet.
    this.box(parent, 28.4, 0.6, 18.8, 0, BENCH.floor + 0.3, 0.2, rubber);
    // Twelve drawer fronts in four rows, each with a bar handle.
    const row = height / 4;
    for (let r = 0; r < 4; r++) {
      const cy = top - row * (r + 0.5);
      for (const x of [-9.6, 0, 9.6]) {
        this.box(parent, 9.0, row - 0.22, 0.16, x, cy, z1 + 0.08, front);
        this.box(parent, 3.0, 0.14, 0.2, x, cy + row / 2 - 0.35, z1 + 0.26, steel);
      }
    }
  }

  /** Fluorescent tubes on the ceiling; they are lit surfaces, the room light comes from the bench panel. */
  private tubes(parent: T.Object3D): void {
    const tube = this.tools.track(
      new T.MeshStandardMaterial({ color: '#fff7e6', emissive: '#fff1d6', emissiveIntensity: 2.2 }),
    );
    for (const x of [-12, -4, 4, 12]) this.box(parent, 3.4, 0.16, 0.5, x, BENCH.ceiling - 0.1, 0, tube);
  }

  /** Tall storage on the right, against the back wall, with archive boxes on top. */
  private storageRight(parent: T.Object3D, body: T.Material, front: T.Material, steel: T.Material): void {
    const x0 = 16.5,
      x1 = 22.5,
      z0 = -9.7,
      z1 = -6.7,
      top = BENCH.floor + 14.2;
    this.box(parent, x1 - x0, top - BENCH.floor, z1 - z0, (x0 + x1) / 2, (top + BENCH.floor) / 2, (z0 + z1) / 2, body);
    for (const x of [18.025, 20.975]) {
      this.box(parent, 2.85, top - BENCH.floor - 0.5, 0.14, x, (top + BENCH.floor) / 2, z1 + 0.07, front);
    }
    for (const x of [19.12, 19.88]) this.box(parent, 0.12, 1.2, 0.2, x, BENCH.floor + 7.1, z1 + 0.2, steel);
    const colours = ['#5d6470', '#7a6a4f', '#4f6253'];
    [17.4, 19.6, 21.4].forEach((x, i) =>
      this.box(
        parent,
        1.7,
        1.1,
        2.2,
        x,
        top + 0.55,
        -8.4,
        this.tools.material('lab-archive-' + i, colours[i], 0.8, 0, { finish: 'paint', wear: 0.4, dirt: 0.5, size: 64 }),
      ),
    );
  }

  /** Open bookshelf in the back-left corner, with boxes and binders on every shelf. */
  private shelvesLeft(parent: T.Object3D): void {
    const x0 = -23.2,
      x1 = -18.6,
      z0 = -9.7,
      z1 = -7.8,
      top = BENCH.floor + 12.7;
    const midX = (x0 + x1) / 2,
      midZ = (z0 + z1) / 2,
      midY = (top + BENCH.floor) / 2;
    const wood = this.tools.material('lab-shelf', '#6b5a43', 0.7, 0, { finish: 'wood', wear: 0.35, dirt: 0.4, size: 128 });
    // The sides stop short of the back board, which runs the full width at z0.
    this.box(parent, 0.2, top - BENCH.floor, z1 - z0 - 0.12, x0 + 0.1, midY, (z0 + 0.12 + z1) / 2, wood);
    this.box(parent, 0.2, top - BENCH.floor, z1 - z0 - 0.12, x1 - 0.1, midY, (z0 + 0.12 + z1) / 2, wood);
    this.box(parent, x1 - x0, top - BENCH.floor, 0.12, midX, midY, z0 + 0.06, wood);
    for (let k = 0; k < 5; k++)
      this.box(parent, x1 - x0 - 0.2, 0.18, z1 - z0 - 0.1, midX, BENCH.floor + 0.15 + k * 3.1, midZ, wood);
    const books = ['#3c4d5a', '#7d3f35', '#5a6e3f', '#8a7a4f', '#2f3f4e'].map((colour, i) =>
      this.tools.material('lab-book-' + i, colour, 0.7, 0, { finish: 'paint', wear: 0.4, dirt: 0.5, size: 64 }),
    );
    for (let k = 0; k < 4; k++) {
      const random = seededRandom(31 + k);
      let x = x0 + 0.35;
      while (x < x1 - 0.6) {
        const width = 0.25 + random() * 0.2,
          height = 1.3 + random() * 1.1;
        this.box(
          parent,
          width,
          height,
          1.2,
          x + width / 2,
          BENCH.floor + 0.24 + k * 3.1 + height / 2,
          midZ,
          books[Math.floor(random() * books.length)],
        );
        x += width + 0.04;
      }
    }
  }

  /** Rolling instrument trolley in the open room, to the right of the bench. */
  private trolley(parent: T.Object3D, steel: T.Material, body: T.Material): void {
    const x = 19.8,
      z = 4.2,
      top = BENCH.floor + 4.6;
    for (const dx of [-1.6, 1.6])
      for (const dz of [-1.2, 1.2]) this.cylinder(parent, 0.1, top - BENCH.floor, x + dx, (top + BENCH.floor) / 2, z + dz, steel);
    this.box(parent, 3.6, 0.14, 2.8, x, BENCH.floor + 2.4, z, steel);
    this.box(parent, 3.6, 0.14, 2.8, x, top, z, steel);
    this.box(parent, 2.4, 1.6, 2.0, x, BENCH.floor + 3.27, z, this.tools.material('lab-instrument', '#2a3d52', 0.5, 0.2, { finish: 'plastic', wear: 0.3, size: 64 }));
    this.box(parent, 2.0, 1.4, 0.3, x - 0.2, top + 0.85, z, body);
    for (const dx of [-1.6, 1.6])
      for (const dz of [-1.2, 1.2]) {
        const wheel = this.cylinder(parent, 0.25, 0.2, x + dx, BENCH.floor + 0.1, z + dz, body);
        wheel.rotation.z = Math.PI / 2;
      }
  }

  /** Lab stool in front of the bench, on the right. */
  private stool(parent: T.Object3D, steel: T.Material, rubber: T.Material): void {
    const x = 10,
      z = 14.5,
      seat = BENCH.floor + 2.6;
    this.cylinder(parent, 0.95, 0.28, x, seat, z, this.tools.material('lab-vinyl', '#3b4f4a', 0.7, 0, { finish: 'rubber', wear: 0.25, size: 64 }));
    this.cylinder(parent, 0.12, seat - BENCH.floor, x, (seat + BENCH.floor) / 2, z, steel);
    this.cylinder(parent, 0.6, 0.12, x, BENCH.floor + 0.8, z, steel);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      this.cylinder(parent, 0.14, 0.2, x + Math.cos(a) * 0.9, BENCH.floor + 0.1, z + Math.sin(a) * 0.9, rubber);
    }
  }

  /** Wall clock above the storage, painted once. */
  private clock(parent: T.Object3D): void {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#ece8da';
      context.beginPath();
      context.arc(128, 128, 124, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#2b3036';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        context.lineWidth = i % 3 === 0 ? 7 : 3;
        context.beginPath();
        context.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100);
        context.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116);
        context.stroke();
      }
      // Hands at ten past ten, the usual pose for a clock on a wall.
      context.lineCap = 'round';
      context.lineWidth = 9;
      context.beginPath();
      context.moveTo(128, 128);
      context.lineTo(128 + Math.cos(-2.0) * 62, 128 + Math.sin(-2.0) * 62);
      context.stroke();
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(128, 128);
      context.lineTo(128 + Math.cos(-0.5) * 90, 128 + Math.sin(-0.5) * 90);
      context.stroke();
    }
    const texture = this.tools.track(new T.CanvasTexture(canvas));
    texture.colorSpace = T.SRGBColorSpace;
    const face = new T.Mesh(
      this.tools.track(new T.CircleGeometry(0.9, 40)),
      this.tools.track(new T.MeshStandardMaterial({ map: texture, roughness: 0.6 })),
    );
    face.position.set(19.5, BENCH.floor + 15.7, BACK_Z + WALL / 2 + 0.03);
    parent.add(face);
  }

  private extinguisher(parent: T.Object3D, steel: T.Material): void {
    const red = this.tools.material('lab-extinguisher', '#a33b2f', 0.5, 0.2, { finish: 'paint', wear: 0.25, size: 64 });
    this.cylinder(parent, 0.34, 2.1, -17.5, BENCH.floor + 1.05, -8.6, red);
    this.cylinder(parent, 0.12, 0.3, -17.5, BENCH.floor + 2.25, -8.6, steel);
  }

  /** Copper pipes: one rising in the back-left corner, one running under the ceiling along the back wall. */
  private pipes(parent: T.Object3D, midY: number): void {
    const copper = this.tools.material('lab-copper', '#b5764c', 0.35, 0.85, { finish: 'steel', wear: 0.3, size: 64 });
    this.cylinder(parent, 0.22, CEILING_SPAN, -23.6, midY, BACK_Z + WALL / 2 + 0.25, copper);
    const run = this.mesh(parent, new T.CylinderGeometry(0.25, 0.25, 2 * SPAN, 16), copper, 0, BENCH.ceiling - 1.6, BACK_Z + WALL / 2 + 0.25);
    run.rotation.z = Math.PI / 2;
  }
}
