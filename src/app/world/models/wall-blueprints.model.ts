import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';
import { BENCH } from './bench-layout';
import { paintBlueprint, SHEET_HEIGHT, SHEET_WIDTH, type SheetKind } from '../textures/blueprint-sheets';

interface Placement {
  kind: SheetKind;
  seed: number;
  sheet: string;
  /** Centre of the sheet on its wall, in scene units. */
  x: number;
  y: number;
  z: number;
  /** Turn about the vertical axis; the sheets face the bench from the back wall (0). */
  yaw: number;
}

const WIDTH = 2.8;
const HEIGHT = (WIDTH * SHEET_HEIGHT) / SHEET_WIDTH;
/** Pegboard front face, offset a little so the sheets never share a plane. */
const BACK_FACE = BENCH.backZ + 0.125 + 0.04;

/** Hand-drawn processor sheets pinned where the bench camera can see them. */
const PLACEMENTS: Placement[] = [
  { kind: 'die', seed: 11, sheet: 'HOJA 01', x: 2.4, y: 1.6, z: BACK_FACE, yaw: 0 },
  { kind: 'timing', seed: 12, sheet: 'HOJA 02', x: 6.4, y: 1.5, z: BACK_FACE, yaw: 0 },
  { kind: 'soc', seed: 13, sheet: 'HOJA 03', x: 10.4, y: 1.7, z: BACK_FACE, yaw: 0 },
];

/**
 * Schematic sheets pinned to the walls. They are painted on canvas, bowed slightly at the free
 * corners, pinned at the top and taped; the stamp on each sheet marks them as conceptual.
 */
export class WallBlueprintsModel extends WorkshopGeometry {
  build(parent: T.Object3D): void {
    const pin = this.tools.material('pin-steel', '#b9bcc0', 0.35, 0.9, { finish: 'steel', size: 64 });
    const tape = this.tools.track(
      new T.MeshStandardMaterial({ color: '#e6dcbc', roughness: 0.9, transparent: true, opacity: 0.7 }),
    );
    for (const placement of PLACEMENTS) {
      const sheet = this.sheet(placement);
      for (const side of [-1, 1]) {
        this.mesh(sheet, new T.SphereGeometry(0.034, 10, 8), pin, side * (WIDTH / 2 - 0.16), HEIGHT / 2 - 0.14, 0.07);
        const strip = this.mesh(sheet, this.tools.track(new T.PlaneGeometry(0.46, 0.18)), tape, side * (WIDTH / 2 - 0.3), HEIGHT / 2 - 0.02, 0.06);
        strip.rotation.z = -side * 0.55;
      }
      parent.add(sheet);
    }
  }

  private sheet(placement: Placement): T.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = SHEET_WIDTH;
    canvas.height = SHEET_HEIGHT;
    const context = canvas.getContext('2d');
    const texture = this.tools.track(new T.CanvasTexture(canvas));
    texture.colorSpace = T.SRGBColorSpace;
    const paint = () => {
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      paintBlueprint(context, { kind: placement.kind, seed: placement.seed, sheet: placement.sheet });
      texture.needsUpdate = true;
    };
    paint();
    // Lettering waits for the monospace face; the painting is deterministic, so a repaint only fixes the type.
    void document.fonts?.ready.then(paint);
    const geometry = this.tools.track(new T.PlaneGeometry(WIDTH, HEIGHT, 14, 10));
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const u = position.getX(i) / WIDTH; // -0.5 .. 0.5 across the sheet
      const v = position.getY(i) / HEIGHT; // -0.5 .. 0.5 from top to bottom
      // Paper bows across its width and lifts a little at the free bottom corners.
      const bow = 0.03 * 4 * u * u;
      const curl = 0.05 * Math.max(0, -v - 0.1) ** 2 * (0.5 + Math.abs(u));
      position.setZ(i, bow + curl);
    }
    geometry.computeVertexNormals();
    const material = this.tools.track(
      new T.MeshStandardMaterial({ map: texture, roughness: 0.84, metalness: 0 }),
    );
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(placement.x, placement.y, placement.z);
    mesh.rotation.y = placement.yaw;
    mesh.receiveShadow = true;
    return mesh;
  }
}
