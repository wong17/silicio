import * as T from 'three';
import { WorkshopGeometry } from './workshop-geometry';
import { BENCH } from './bench-layout';
import { paintBlueprint, SHEET_HEIGHT, SHEET_WIDTH, type SheetKind } from '../textures/blueprint-sheets';
import { drawMeterLcd, drawScopeScreen } from '../textures/instrument-screens';
import { fitFontSize, LABEL_FAMILY } from '../textures/label-canvas';
import { seededRandom } from '../textures/noise';

const FLOOR = BENCH.floor;
/** Inner faces of the closed room (see LabRoomModel): content on the left wall faces +x, on the front wall -z. */
const LEFT_WALL = -38;
const FRONT = 38;
/** Plaster face of the back wall; content on it faces +z. */
const BACK_WALL = -9.7;
/** Thickness of boards and panels. */
const BOARD = 0.12;

/** Atlas cells in canvas pixels. Each family of labels shares one canvas. */
const SPINE_W = 48;
const SPINE_H = 320;
const SPINE_COLS = 8;
const DRAWER_W = 80;
const DRAWER_H = 100;
const DRAWER_COLS = 12;
const SHEET_SCALE = 0.75;
const SHEET_W = SHEET_WIDTH * SHEET_SCALE;
const SHEET_H = SHEET_HEIGHT * SHEET_SCALE;
const SCREEN_H = 192;

const SPINE_TITLES = [
  'Arquitectura de computadoras',
  'Intel 8086 · manual',
  'Lógica digital',
  'Memoria y jerarquía',
  'Sistemas operativos',
  'Circuitos',
  'Assembly x86',
  'Electrónica',
  'Álgebra de Boole',
  'Microprogramación',
  'Pipeline y caché',
  'Semiconductores',
  'Compiladores',
  'Datasheet · 74LS',
  'Bus y E/S',
  'Señales y sistemas',
];
const SPINE_COLOURS = [
  '#2f4a5e', '#7a3b2e', '#5b6e3c', '#8b7440', '#2c3a4a', '#6d4a63', '#3d5c57',
  '#a08a5b', '#4b4e56', '#8e4a3a', '#c9bd9c', '#34403a', '#6b2f2b', '#29465a',
];
const DRAWER_LABELS = [
  '10 kΩ', '100 nF', '1N4148', 'DIP-40', 'SOIC', 'XTAL', 'ESD', 'LM358', '74LS04', '555', '2N3904', '1 µF',
  '4.7 kΩ', '100 Ω', 'BC547', 'LED 5 mm', '7805', 'ULN2003', 'MAX232', '8253', '8255', '8259', '2164A', '4116',
  '74LS138', '74HC00', '1 MΩ', '22 pF', '47 µF', 'DIP-8', 'SOT-23', 'TO-92', 'QFP-44', 'PLCC', 'PGA', 'SMD 0603',
  'SMD 1206', 'FUSE 2A', 'RELAY 5V', '1N914', 'ZENER', 'PTC', 'NTC', 'VARISTOR', 'CAP ELEC', 'CRYSTAL', 'PIN HDR',
  'USB-B',
];
const DRAWER_BANDS = ['#b8862b', '#6b3d2a', '#3a3f44', '#8a2d2d', '#2f6b3f', '#2b4b7a'];
const DRAWER_TONES = ['#8d958f', '#a2a79e', '#7c8782', '#959a92'];
const BINDERS = ['#2f4a7a', '#8f3a2e', '#2f6a4d', '#c9a23b', '#2e2e33', '#5f3f7a', '#3b6f8f', '#b4572f'];
const RACK_TONES = ['#d6d2c4', '#2e3436', '#8f8b7d', '#3a4a50', '#c3bca8', '#29302f'];
/** Blueprint sheets on the front wall, HOJA 06 to HOJA 12, each with its own seed. */
const SHEETS: [SheetKind, number, string][] = [
  ['die', 41, 'HOJA 06'],
  ['cell', 42, 'HOJA 07'],
  ['inverter', 43, 'HOJA 08'],
  ['soc', 44, 'HOJA 09'],
  ['timing', 45, 'HOJA 10'],
  ['die', 46, 'HOJA 11'],
  ['soc', 47, 'HOJA 12'],
];

/** Shared surfaces: weathered finishes from the surface library, and plain tracked materials. */
interface Materials {
  paint: T.MeshStandardMaterial;
  wood: T.MeshStandardMaterial;
  steel: T.MeshStandardMaterial;
  plastic: T.MeshStandardMaterial;
  dark: T.MeshStandardMaterial;
  pcb: T.MeshStandardMaterial;
  pegboard: T.MeshStandardMaterial;
  /** White base: the instance colours tint it. */
  white: T.MeshStandardMaterial;
  chip: T.MeshStandardMaterial;
  pin: T.MeshStandardMaterial;
  led: T.MeshStandardMaterial;
  glass: T.MeshStandardMaterial;
  crtGlass: T.MeshStandardMaterial;
}

/** One book or binder: where it stands, its size, its colour and the spine cell it shows. */
interface Book {
  bay: number;
  start: number;
  width: number;
  height: number;
  depth: number;
  colour: string;
  cell: number;
}

/** Flat quads with atlas UVs, collected so that a whole family of labels is one mesh. */
class QuadBatch {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly uvs: number[] = [];
  private readonly indices: number[] = [];

  /** Corners run bottom-left, bottom-right, top-right, top-left, as seen from the side the normal faces. */
  add(corners: number[][], normal: number[], uv: number[]): void {
    const base = this.positions.length / 3;
    const [u0, v0, u1, v1] = uv;
    const texels = [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ];
    corners.forEach((c, i) => {
      this.positions.push(c[0], c[1], c[2]);
      this.normals.push(normal[0], normal[1], normal[2]);
      this.uvs.push(texels[i][0], texels[i][1]);
    });
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  geometry(): T.BufferGeometry {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new T.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(this.uvs, 2));
    geometry.setIndex(this.indices);
    return geometry;
  }
}

/** UV rectangle [u0, v0, u1, v1] of a cell of an atlas; the cell is given in canvas pixels from the top left. */
function cellUV(x: number, y: number, w: number, h: number, atlasW: number, atlasH: number): number[] {
  return [x / atlasW, 1 - (y + h) / atlasH, (x + w) / atlasW, 1 - y / atlasH];
}

/** Maps a plane's own 0..1 UVs into a rectangle of an atlas. */
function remapUV(geometry: T.BufferGeometry, [u0, v0, u1, v1]: number[]): void {
  const uv = geometry.getAttribute('uv') as T.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  uv.needsUpdate = true;
}

/** Spine titles: each in its own cell, turned to read from top to bottom, on a transparent ground. */
function drawSpines(ctx: CanvasRenderingContext2D): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  SPINE_TITLES.forEach((title, i) => {
    const size = fitFontSize(
      (px) => {
        ctx.font = `600 ${px}px ${LABEL_FAMILY}`;
        return ctx.measureText(title).width;
      },
      SPINE_H - 24,
      18,
      9,
    );
    ctx.save();
    ctx.translate((i % SPINE_COLS) * SPINE_W + SPINE_W / 2, Math.floor(i / SPINE_COLS) * SPINE_H + SPINE_H / 2);
    ctx.rotate(Math.PI / 2);
    ctx.font = `600 ${size}px ${LABEL_FAMILY}`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(14, 16, 18, 0.7)';
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = '#f1e8d0';
    ctx.fillText(title, 0, 0);
    ctx.restore();
  });
}

/** Drawer legends: a colour band over a pale label, the component value centred in it. */
function drawDrawers(ctx: CanvasRenderingContext2D): void {
  DRAWER_LABELS.forEach((text, i) => {
    const x = (i % DRAWER_COLS) * DRAWER_W;
    const y = Math.floor(i / DRAWER_COLS) * DRAWER_H;
    ctx.fillStyle = '#e8e3cf';
    ctx.fillRect(x, y, DRAWER_W, DRAWER_H);
    ctx.fillStyle = DRAWER_BANDS[i % DRAWER_BANDS.length];
    ctx.fillRect(x, y, DRAWER_W, 14);
    ctx.strokeStyle = 'rgba(40, 44, 46, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, DRAWER_W - 2, DRAWER_H - 2);
    const size = fitFontSize(
      (px) => {
        ctx.font = `600 ${px}px ${LABEL_FAMILY}`;
        return ctx.measureText(text).width;
      },
      DRAWER_W - 14,
      18,
      9,
    );
    ctx.font = `600 ${size}px ${LABEL_FAMILY}`;
    ctx.fillStyle = '#23272a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + DRAWER_W / 2, y + 58);
  });
}

/** The seven sheets, each painted into its own cell at a reduced scale. */
function drawSheets(ctx: CanvasRenderingContext2D): void {
  SHEETS.forEach(([kind, seed, sheet], i) => {
    ctx.save();
    ctx.translate((i % 2) * SHEET_W, Math.floor(i / 2) * SHEET_H);
    ctx.scale(SHEET_SCALE, SHEET_SCALE);
    ctx.beginPath();
    ctx.rect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
    ctx.clip();
    paintBlueprint(ctx, { kind, seed, sheet });
    ctx.restore();
  });
}

/** Logic analyser: eight lanes, each a square wave at its own rate, labelled D0 to D7. */
function drawLogicLanes(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#0b1714';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(159, 240, 184, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 64) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  ctx.stroke();
  const lane = (h * 0.86) / 8;
  ctx.font = `500 ${Math.round(lane * 0.5)}px ${LABEL_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let k = 0; k < 8; k++) {
    const top = h * 0.07 + k * lane;
    const high = top + lane * 0.22;
    const low = top + lane * 0.78;
    const period = 26 + k * 11;
    ctx.fillStyle = 'rgba(159, 240, 184, 0.7)';
    ctx.fillText('D' + k, w * 0.02, top + lane / 2);
    ctx.strokeStyle = k % 2 ? '#9ff0b8' : '#c6d99b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let first = true;
    for (let x = w * 0.1; x <= w * 0.98; x += 2) {
      const y = (x + k * 13) % period < period / 2 ? high : low;
      if (first) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      first = false;
    }
    ctx.stroke();
  }
}

/** Instrument screens in three lanes: the scope trace, the logic analyser and a plain LCD readout. */
function drawScreens(ctx: CanvasRenderingContext2D): void {
  drawScopeScreen(ctx, 512, SCREEN_H, 1.7);
  ctx.save();
  ctx.translate(0, SCREEN_H);
  drawLogicLanes(ctx, 512, SCREEN_H);
  ctx.restore();
  ctx.save();
  ctx.translate(0, 2 * SCREEN_H);
  drawMeterLcd(ctx, 512, SCREEN_H, 0, '5.012 V');
  ctx.restore();
}

/** Terminal of the old CRT: phosphor text under faint scanlines. */
function drawTerminal(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#05130e';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#8ef5b5';
  ctx.font = `500 ${Math.round(h * 0.07)}px ${LABEL_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(142, 245, 181, 0.6)';
  ctx.shadowBlur = 6;
  const lines = [
    'C:\\> DIR /W',
    '  8086.ASM   ALU.BIN   BUS.SYS',
    '  IRQ0 ........ OK',
    '  MEM 640K .... OK',
    'C:\\> SCOPE.EXE',
    'C:\\> _',
  ];
  lines.forEach((line, i) => ctx.fillText(line, w * 0.07, h * 0.08 + i * h * 0.11));
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
}

/** Whiteboard: a bus diagram of the processor in marker colours on a white ground. */
function drawWhiteboard(ctx: CanvasRenderingContext2D): void {
  const blue = '#1f4fa3';
  const ink = '#22262a';
  const red = '#b3362b';
  ctx.fillStyle = '#f5f4ee';
  ctx.fillRect(0, 0, 960, 512);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const text = (value: string, x: number, y: number, size: number, colour: string, align: CanvasTextAlign = 'center') => {
    ctx.fillStyle = colour;
    ctx.font = `600 ${size}px ${LABEL_FAMILY}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y);
  };
  const box = (x: number, y: number, w: number, h: number, colour: string) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 5;
    ctx.strokeRect(x, y, w, h);
  };
  const arrow = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.strokeStyle = blue;
    ctx.fillStyle = blue;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 15 * Math.cos(a - 0.4), y2 - 15 * Math.sin(a - 0.4));
    ctx.lineTo(x2 - 15 * Math.cos(a + 0.4), y2 - 15 * Math.sin(a + 0.4));
    ctx.closePath();
    ctx.fill();
  };
  text('BUS DE DATOS · 8086', 40, 46, 34, blue, 'left');
  text('fetch, decode, exec', 540, 46, 24, blue, 'left');
  box(60, 110, 420, 270, ink);
  text('CPU', 80, 140, 26, ink, 'left');
  box(100, 170, 150, 80, blue);
  text('ALU', 175, 210, 30, blue);
  box(290, 170, 150, 80, blue);
  text('REG', 365, 210, 30, blue);
  box(100, 290, 340, 70, ink);
  text('CONTROL', 270, 325, 26, ink);
  arrow(250, 210, 288, 210);
  arrow(175, 288, 175, 252);
  box(560, 110, 180, 270, ink);
  text('MEM', 650, 140, 26, ink);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) box(586 + c * 78, 190 + r * 70, 64, 52, ink);
  ctx.strokeStyle = red;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(60, 430);
  ctx.lineTo(760, 430);
  ctx.moveTo(60, 458);
  ctx.lineTo(760, 458);
  ctx.stroke();
  text('BUS', 800, 444, 30, red, 'left');
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const x of [160, 300, 440, 650]) {
    ctx.moveTo(x, 380);
    ctx.lineTo(x, 430);
  }
  ctx.stroke();
  text('ALU = suma · resta · lógica', 60, 494, 22, ink, 'left');
}

/**
 * The laboratory library around the bench: two tall bookcases with titled spines, a bench-height cabinet and
 * a whiteboard on the left wall, a component cabinet under a glass case on the right, a pegboard of PCBs, an
 * instrument rack and seven blueprint sheets on the front wall, two small bookcases and a parts shelf at the
 * back, and old machines on the floor in the far corners. Decoration only: nothing carries an id.
 */
export class LabLibraryModel extends WorkshopGeometry {
  private cube!: T.BufferGeometry;
  private unitCylinder!: T.BufferGeometry;
  private m!: Materials;
  private readonly matrix = new T.Matrix4();
  private readonly identity = new T.Quaternion();
  /** Turns a cylinder's axis from Y to Z, so a knob stands out of a front panel. */
  private readonly knobTurn = new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, 0, 0));

  build(scene: T.Object3D): void {
    // Its own group, outside the shadow pass: the lamp only needs to light the bench.
    const group = new T.Group();
    scene.add(group);
    this.cube = this.tools.track(new T.BoxGeometry(1, 1, 1));
    this.unitCylinder = this.tools.track(new T.CylinderGeometry(1, 1, 1, 12));
    this.m = this.materials();

    // One canvas per family. Each repaints once the label font has loaded, so the legends pick it up.
    const painters: (() => void)[] = [];
    // Atlases are painted at half size: the walls are seen from across the room, so the saved memory and texture
    // reads matter more than the last pixel of a legend. Drawing keeps the full-size coordinates.
    const atlas = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, scale = 0.5): T.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const texture = this.tools.track(new T.CanvasTexture(canvas));
      texture.colorSpace = T.SRGBColorSpace;
      const paint = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.clearRect(0, 0, w, h);
        draw(ctx);
        texture.needsUpdate = true;
      };
      painters.push(paint);
      paint();
      return texture;
    };
    const spines = atlas(SPINE_COLS * SPINE_W, 2 * SPINE_H, drawSpines);
    const drawers = atlas(DRAWER_COLS * DRAWER_W, 4 * DRAWER_H, drawDrawers);
    const sheets = atlas(2 * SHEET_W, 4 * SHEET_H, drawSheets);
    const whiteboard = atlas(960, 512, drawWhiteboard);
    const screens = atlas(512, 3 * SCREEN_H, drawScreens);
    const terminal = atlas(512, 422, (ctx) => drawTerminal(ctx, 512, 422));
    void document.fonts?.ready.then(() => painters.forEach((paint) => paint()));

    // Both tall cases add their spine titles to one batch, so they share a single label mesh.
    const titles = new QuadBatch();
    this.tallCase(group, -7.2, 1.8, 11, titles);
    this.tallCase(group, 2.4, 11.4, 23, titles);
    this.batchMesh(group, titles, this.tools.track(new T.MeshStandardMaterial({ map: spines, alphaTest: 0.5, roughness: 0.7 })));
    this.lowerLeft(group, whiteboard);
    this.rightWall(group, drawers);
    this.frontWall(group, sheets, screens);
    this.backWall(group);
    this.floorMachines(group, terminal);
    group.traverse((o) => {
      if (o instanceof T.Mesh) o.castShadow = false;
    });
  }

  private materials(): Materials {
    return {
      paint: this.tools.material('library-paint', '#5f6e69', 0.6, 0, {
        finish: 'paint',
        exposed: '#8f948c',
        grime: '#3a3831',
        dirt: 0.35,
        wear: 0.3,
        size: 64,
      }),
      wood: this.tools.material('library-wood', '#7b6446', 0.7, 0, { finish: 'wood', wear: 0.35, dirt: 0.4, size: 64 }),
      steel: this.tools.material('library-steel', '#a4acaf', 0.35, 0.9, { finish: 'steel', wear: 0.3, size: 64 }),
      plastic: this.tools.material('library-plastic', '#c7c3b3', 0.55, 0.05, {
        finish: 'plastic',
        wear: 0.35,
        dirt: 0.4,
        size: 64,
      }),
      dark: this.tools.material('library-instrument', '#23303a', 0.5, 0.2, { finish: 'plastic', wear: 0.3, size: 64 }),
      pcb: this.tools.material('library-pcb', '#2e5a43', 0.7, 0.12, { finish: 'pcb', size: 64 }),
      pegboard: this.tools.material('library-pegboard', '#b59b6c', 0.8, 0, { finish: 'pegboard', size: 64, repeat: [4, 3] }),
      white: this.tools.track(new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 })),
      chip: this.tools.track(new T.MeshStandardMaterial({ color: '#17191b', roughness: 0.55, metalness: 0.05 })),
      pin: this.tools.track(new T.MeshStandardMaterial({ color: '#b9bcbd', roughness: 0.3, metalness: 0.9 })),
      led: this.tools.track(new T.MeshStandardMaterial({ color: '#2e7d4f', emissive: '#2fbf6a', emissiveIntensity: 0.9 })),
      glass: this.tools.track(
        new T.MeshStandardMaterial({ color: '#cfe3e6', roughness: 0.08, transparent: true, opacity: 0.25, depthWrite: false }),
      ),
      crtGlass: this.tools.track(new T.MeshStandardMaterial({ color: '#0d1d19', roughness: 0.15 })),
    };
  }

  /** A box from its centre and size, drawn with the shared unit cube. */
  private block(parent: T.Object3D, m: T.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number): T.Mesh {
    const mesh = this.mesh(parent, this.cube, m, x, y, z);
    mesh.scale.set(sx, sy, sz);
    return mesh;
  }

  /** A box between two opposite corners, in scene coordinates. */
  private slab(parent: T.Object3D, m: T.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): T.Mesh {
    return this.block(parent, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
  }

  private instanced(parent: T.Object3D, g: T.BufferGeometry, m: T.Material, count: number): T.InstancedMesh {
    const mesh = new T.InstancedMesh(g, m, count);
    parent.add(mesh);
    return mesh;
  }

  /** Writes one instance: a unit shape placed at (x, y, z), scaled and optionally turned. */
  private place(
    mesh: T.InstancedMesh,
    i: number,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    turn: T.Quaternion = this.identity,
  ): void {
    this.matrix.compose(new T.Vector3(x, y, z), turn, new T.Vector3(sx, sy, sz));
    mesh.setMatrixAt(i, this.matrix);
  }

  private batchMesh(parent: T.Object3D, batch: QuadBatch, m: T.Material): void {
    parent.add(new T.Mesh(this.tools.track(batch.geometry()), m));
  }

  /** Floor-to-ceiling bookcase on the left wall: five bays of books, each spine showing a title from the atlas. */
  private tallCase(parent: T.Object3D, z0: number, z1: number, seed: number, titles: QuadBatch): void {
    const { wood, white } = this.m;
    const random = seededRandom(seed);
    const x1 = LEFT_WALL + 2.2;
    const top = FLOOR + 15;
    const back = LEFT_WALL + BOARD;
    // Back, top and shelves fit between the two side boards: no end face shares a plane with a side.
    this.slab(parent, wood, LEFT_WALL, FLOOR, z0 + BOARD, back, top - BOARD, z1 - BOARD);
    this.slab(parent, wood, LEFT_WALL, FLOOR, z0, x1, top, z0 + BOARD);
    this.slab(parent, wood, LEFT_WALL, FLOOR, z1 - BOARD, x1, top, z1);
    this.slab(parent, wood, LEFT_WALL, top - BOARD, z0 + BOARD, x1, top, z1 - BOARD);
    for (let bay = 0; bay < 5; bay++) {
      const y = FLOOR + 3 * bay;
      this.slab(parent, wood, LEFT_WALL, y, z0 + BOARD, x1, y + BOARD, z1 - BOARD);
    }

    const books: Book[] = [];
    for (let bay = 0; bay < 5; bay++) {
      let start = z0 + 0.14 + random() * 0.1;
      while (start < z1 - 0.34) {
        const width = 0.2 + random() * 0.2;
        if (start + width > z1 - 0.14) break;
        books.push({
          bay,
          start,
          width,
          height: 1.9 + random() * 0.6,
          depth: 1.5 + random() * 0.3,
          colour: SPINE_COLOURS[Math.floor(random() * SPINE_COLOURS.length)],
          cell: Math.floor(random() * SPINE_TITLES.length),
        });
        start += width + (random() < 0.06 ? 0.35 : 0.02);
      }
    }
    const shelf = this.instanced(parent, this.cube, white, books.length);
    books.forEach((b, i) => {
      const cy = FLOOR + 3 * b.bay + BOARD + b.height / 2;
      const cz = b.start + b.width / 2;
      this.place(shelf, i, back + b.depth / 2, cy, cz, b.depth, b.height, b.width);
      shelf.setColorAt(i, new T.Color(b.colour));
      // The spine's title: a quad on the outer face, showing one cell of the atlas.
      const face = back + b.depth + 0.01;
      const hw = (b.width - 0.04) / 2;
      const hh = (b.height - 0.14) / 2;
      titles.add(
        [
          [face, cy - hh, cz + hw],
          [face, cy - hh, cz - hw],
          [face, cy + hh, cz - hw],
          [face, cy + hh, cz + hw],
        ],
        [1, 0, 0],
        cellUV(
          (b.cell % SPINE_COLS) * SPINE_W,
          Math.floor(b.cell / SPINE_COLS) * SPINE_H,
          SPINE_W,
          SPINE_H,
          SPINE_COLS * SPINE_W,
          2 * SPINE_H,
        ),
      );
    });
  }

  /** Smaller bookcase against the back wall, with plain spines. */
  private shortCase(parent: T.Object3D, x0: number, x1: number, seed: number): void {
    const { wood, white } = this.m;
    const random = seededRandom(seed);
    const z1 = -8.5;
    const top = FLOOR + 11;
    this.slab(parent, wood, x0 + BOARD, FLOOR, BACK_WALL, x1 - BOARD, top, BACK_WALL + BOARD);
    this.slab(parent, wood, x0, FLOOR, BACK_WALL, x0 + BOARD, top, z1);
    this.slab(parent, wood, x1 - BOARD, FLOOR, BACK_WALL, x1, top, z1);
    for (let k = 0; k < 5; k++) {
      const y = FLOOR + 2.75 * k;
      this.slab(parent, wood, x0 + BOARD, y, BACK_WALL, x1 - BOARD, y + BOARD, z1);
    }
    const books: Book[] = [];
    for (let bay = 0; bay < 4; bay++) {
      let start = x0 + BOARD + 0.08 + random() * 0.1;
      while (start < x1 - 0.5) {
        const width = 0.18 + random() * 0.14;
        if (start + width > x1 - BOARD - 0.04) break;
        books.push({
          bay,
          start,
          width,
          height: 1.6 + random() * 0.7,
          depth: 0.6 + random() * 0.25,
          colour: SPINE_COLOURS[Math.floor(random() * SPINE_COLOURS.length)],
          cell: 0,
        });
        start += width + (random() < 0.08 ? 0.3 : 0.02);
      }
    }
    const shelf = this.instanced(parent, this.cube, white, books.length);
    books.forEach((b, i) => {
      this.place(
        shelf,
        i,
        b.start + b.width / 2,
        FLOOR + 2.75 * b.bay + BOARD + b.height / 2,
        BACK_WALL + BOARD + b.depth / 2,
        b.width,
        b.height,
        b.depth,
      );
      shelf.setColorAt(i, new T.Color(b.colour));
    });
  }

  /** Left wall, lower part: a bench-height drawer cabinet with binders on its worktop and a whiteboard above. */
  private lowerLeft(parent: T.Object3D, whiteboard: T.Texture): void {
    const { paint, steel, dark, white } = this.m;
    const x1 = LEFT_WALL + 2;
    const z0 = 13.5;
    const z1 = 22.5;
    const top = FLOOR + 7;
    this.slab(parent, paint, LEFT_WALL, FLOOR + 0.6, z0, x1, top, z1);
    this.slab(parent, dark, LEFT_WALL, FLOOR, z0 + 0.4, x1 - 0.4, FLOOR + 0.6, z1 - 0.4);
    this.slab(parent, steel, LEFT_WALL, top, z0, x1 + 0.05, top + 0.12, z1);
    // Nine drawers in three rows, each with a bar pull.
    const drawers = this.instanced(parent, this.cube, white, 9);
    const pulls = this.instanced(parent, this.cube, steel, 9);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const i = r * 3 + c;
        const y = FLOOR + 0.6 + (r + 0.5) * (6.4 / 3);
        const z = z0 + 1.5 + c * 3;
        this.place(drawers, i, x1 + 0.06, y, z, 0.12, 2, 2.8);
        drawers.setColorAt(i, new T.Color(DRAWER_TONES[i % DRAWER_TONES.length]));
        this.place(pulls, i, x1 + 0.18, y + 0.7, z, 0.12, 0.12, 1.2);
      }
    }
    // A row of binders standing on the worktop.
    const binders = this.instanced(parent, this.cube, white, BINDERS.length);
    BINDERS.forEach((colour, i) => {
      this.place(binders, i, LEFT_WALL + 1.15, top + 0.12 + 0.95, z0 + 1 + i * 0.5, 1.3, 1.9, 0.42);
      binders.setColorAt(i, new T.Color(colour));
    });
    // Whiteboard above the binders, in a thin steel frame.
    const board = new T.Mesh(
      this.tools.track(new T.PlaneGeometry(8.6, 4.6)),
      this.tools.track(new T.MeshStandardMaterial({ map: whiteboard, roughness: 0.4 })),
    );
    board.position.set(LEFT_WALL + 0.12, FLOOR + 12, 18);
    board.rotation.y = Math.PI / 2;
    parent.add(board);
    this.slab(parent, steel, LEFT_WALL, FLOOR + 14.3, 13.5, LEFT_WALL + 0.1, FLOOR + 14.5, 22.5);
    this.slab(parent, steel, LEFT_WALL, FLOOR + 9.5, 13.5, LEFT_WALL + 0.1, FLOOR + 9.7, 22.5);
    this.slab(parent, steel, LEFT_WALL, FLOOR + 9.7, 13.5, LEFT_WALL + 0.1, FLOOR + 14.3, 13.7);
    this.slab(parent, steel, LEFT_WALL, FLOOR + 9.7, 22.3, LEFT_WALL + 0.1, FLOOR + 14.3, 22.5);
  }

  /** Right wall: a four-by-twelve component cabinet, and a glass case on top with twelve DIP packages. */
  private rightWall(parent: T.Object3D, drawers: T.Texture): void {
    const { paint, steel, dark, white, chip, pin, glass } = this.m;
    const x0 = 36;
    const x1 = 37.9;
    const z0 = -5.8;
    const z1 = 6.2;
    this.slab(parent, paint, x0, FLOOR + 0.6, z0, x1, FLOOR + 6.6, z1);
    this.slab(parent, dark, x0 + 0.2, FLOOR, z0 + 0.2, x1 - 0.2, FLOOR + 0.6, z1 - 0.2);
    this.slab(parent, steel, x0, FLOOR + 6.6, z0, x1 - 0.05, FLOOR + 6.72, z1);

    // Forty-eight drawers; their legends come from the drawer atlas, one quad per drawer.
    const fronts = this.instanced(parent, this.cube, white, 48);
    const pulls = this.instanced(parent, this.cube, steel, 48);
    const legends = new QuadBatch();
    const random = seededRandom(57);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < DRAWER_COLS; c++) {
        const i = r * DRAWER_COLS + c;
        const y = FLOOR + 0.6 + (r + 0.5) * 1.5;
        const z = z0 + 0.5 + c;
        this.place(fronts, i, 35.9, y, z, 0.2, 1.3, 0.86);
        fronts.setColorAt(i, new T.Color(DRAWER_TONES[Math.floor(random() * DRAWER_TONES.length)]));
        this.place(pulls, i, 35.72, y + 0.45, z, 0.16, 0.1, 0.5);
        legends.add(
          [
            [35.79, y - 0.6, z - 0.36],
            [35.79, y - 0.6, z + 0.36],
            [35.79, y + 0.3, z + 0.36],
            [35.79, y + 0.3, z - 0.36],
          ],
          [-1, 0, 0],
          cellUV(c * DRAWER_W, r * DRAWER_H, DRAWER_W, DRAWER_H, DRAWER_COLS * DRAWER_W, 4 * DRAWER_H),
        );
      }
    }
    this.batchMesh(parent, legends, this.tools.track(new T.MeshStandardMaterial({ map: drawers, roughness: 0.6 })));

    // Display case on the cabinet: a frame, a glass front and twelve DIP packages on a shelf.
    this.slab(parent, paint, x0, FLOOR + 11, z0, x1, FLOOR + 11.12, z1);
    this.slab(parent, paint, x0, FLOOR + 6.72, z0, x1, FLOOR + 11, z0 + BOARD);
    this.slab(parent, paint, x0, FLOOR + 6.72, z1 - BOARD, x1, FLOOR + 11, z1);
    this.slab(parent, paint, x1 - BOARD, FLOOR + 6.72, z0 + BOARD, x1, FLOOR + 11, z1 - BOARD);
    const pane = new T.Mesh(this.tools.track(new T.PlaneGeometry(11.76, 4.28)), glass);
    pane.position.set(36.02, FLOOR + 8.86, 0.2);
    pane.rotation.y = -Math.PI / 2;
    parent.add(pane);
    const dips = this.instanced(parent, this.cube, chip, 12);
    const pins = this.instanced(parent, this.cube, pin, 120);
    for (let i = 0; i < 12; i++) {
      const x = i < 6 ? 36.5 : 37.25;
      const z = -4.5 + (i % 6) * 1.9;
      this.place(dips, i, x, FLOOR + 7.27, z, 0.55, 0.5, 1.6);
      for (let j = 0; j < 5; j++) {
        for (let side = 0; side < 2; side++) {
          this.place(pins, i * 10 + j * 2 + side, x + (side ? 0.3 : -0.3), FLOOR + 6.87, z - 0.6 + j * 0.3, 0.06, 0.3, 0.1);
        }
      }
    }
  }

  /** Front wall: a pegboard of PCBs, an instrument rack in the middle and seven blueprint sheets beside it. */
  private frontWall(parent: T.Object3D, sheets: T.Texture, screens: T.Texture): void {
    const { steel, dark, plastic, pegboard } = this.m;
    this.slab(parent, pegboard, -36.8, FLOOR + 2.6, FRONT - 0.45, -24.8, FLOOR + 12.6, FRONT - 0.2);
    const random = seededRandom(73);
    const plates: [number, number, string?][] = [
      [-33.6, 9.4, 'MEM-80 · REV 2'],
      [-30.2, 9.4],
      [-26.8, 9.4, 'ISA BUS · 8 BIT'],
      [-31.9, 4.9],
    ];
    for (const [x, y, legend] of plates) this.plate(parent, x, FLOOR + y, random, legend);

    // Rack: a steel frame with three instruments stacked in it, each with a front panel and a screen.
    this.slab(parent, steel, -6.4, FLOOR + 2.6, 35.9, 6.4, FLOOR + 2.8, 37.5);
    this.slab(parent, steel, -6.4, FLOOR + 11.4, 35.9, 6.4, FLOOR + 11.6, 37.5);
    this.slab(parent, steel, -6.4, FLOOR + 2.8, 35.9, -6.1, FLOOR + 11.4, 36.2);
    this.slab(parent, steel, 6.1, FLOOR + 2.8, 35.9, 6.4, FLOOR + 11.4, 36.2);
    const knobs = this.instanced(parent, this.unitCylinder, steel, 9);
    [
      [8.6, 11.2],
      [5.8, 8.4],
      [3, 5.6],
    ].forEach(([y0, y1], u) => {
      this.slab(parent, dark, -6, FLOOR + y0, 35.9, 6, FLOOR + y1, 37.4);
      this.slab(parent, plastic, -6, FLOOR + y0, 35.78, 6, FLOOR + y1, 35.9);
      for (let k = 0; k < 3; k++) {
        this.place(knobs, u * 3 + k, 1.6 + k * 1.4, FLOOR + (y0 + y1) / 2, 35.7, 0.32, 0.16, 0.32, this.knobTurn);
      }
    });
    const screenMaterial = this.tools.track(
      new T.MeshStandardMaterial({ map: screens, emissiveMap: screens, emissive: '#ffffff', emissiveIntensity: 0.85, roughness: 0.35 }),
    );
    const screen = (w: number, h: number, lane: number, y: number) => {
      const geometry = this.tools.track(new T.PlaneGeometry(w, h));
      remapUV(geometry, cellUV(0, lane * SCREEN_H, 512, SCREEN_H, 512, 3 * SCREEN_H));
      const mesh = new T.Mesh(geometry, screenMaterial);
      mesh.position.set(-2.4, FLOOR + y, 35.77);
      mesh.rotation.y = Math.PI;
      parent.add(mesh);
    };
    screen(4.6, 1.72, 0, 9.9);
    screen(4.6, 1.72, 1, 7.1);
    screen(3.2, 1.2, 2, 4.3);

    // Seven framed sheets: one left of the rack and six toward the corner.
    const sheetMaterial = this.tools.track(new T.MeshStandardMaterial({ map: sheets, roughness: 0.85 }));
    [-15.5, 10.5, 14.9, 19.3, 23.7, 28.1, 32.5].forEach((x, i) => {
      const y = FLOOR + 8.4;
      this.slab(parent, dark, x - 1.85, y - 1.42, FRONT - 0.2, x + 1.85, y + 1.42, FRONT - 0.1);
      const geometry = this.tools.track(new T.PlaneGeometry(3.4, 2.55));
      remapUV(geometry, cellUV((i % 2) * SHEET_W, Math.floor(i / 2) * SHEET_H, SHEET_W, SHEET_H, 2 * SHEET_W, 4 * SHEET_H));
      const sheet = new T.Mesh(geometry, sheetMaterial);
      sheet.position.set(x, y, FRONT - 0.21);
      sheet.rotation.y = Math.PI;
      parent.add(sheet);
    });
  }

  /** A green PCB hung on the pegboard with its chips facing the room; some carry a silkscreen legend. */
  private plate(parent: T.Object3D, x: number, y: number, random: () => number, legend?: string): void {
    const group = new T.Group();
    group.position.set(x, y, FRONT - 1.1);
    // The board lies flat in its own frame; this turn stands it upright with its face toward the room.
    group.rotation.set(Math.PI / 2, Math.PI, 0, 'YXZ');
    parent.add(group);
    this.block(group, this.m.pcb, 0, 0, 0, 3.2, 0.2, 4.2);
    const chips = this.instanced(group, this.cube, this.m.chip, 8);
    for (let i = 0; i < 8; i++) {
      const s = 0.8 + random() * 0.4;
      this.place(chips, i, i % 2 ? 0.9 : -0.9, 0.18, -1 + Math.floor(i / 2) * 0.8, 0.9 * s, 0.16, 0.5);
    }
    if (legend) this.tools.label(group, legend, 0, 0.11, -2, 2.6);
  }

  /** Back wall: a bookcase on each side, and a wall shelf with old computer parts beside the left one. */
  private backWall(parent: T.Object3D): void {
    const { steel, plastic, dark, led, crtGlass } = this.m;
    this.shortCase(parent, -37, -32, 61);
    this.shortCase(parent, 26.5, 31.5, 62);
    // Wall shelves: a back plate, two shelves and a top.
    // Back plate, sides, top and shelves: the plate and the shelves stop short of the sides, so no faces overlap.
    this.slab(parent, steel, -30.9, FLOOR + 5.6, BACK_WALL, -26.4, FLOOR + 12.4, BACK_WALL + BOARD);
    this.slab(parent, steel, -31, FLOOR + 5.6, BACK_WALL + BOARD, -30.9, FLOOR + 12.4, -7.2);
    this.slab(parent, steel, -26.4, FLOOR + 5.6, BACK_WALL + BOARD, -26.3, FLOOR + 12.4, -7.2);
    this.slab(parent, steel, -30.9, FLOOR + 12.3, BACK_WALL + BOARD, -26.4, FLOOR + 12.4, -7.2);
    this.slab(parent, steel, -30.9, FLOOR + 6, BACK_WALL + BOARD, -26.4, FLOOR + 6.12, -7.2);
    this.slab(parent, steel, -30.9, FLOOR + 9.6, BACK_WALL + BOARD, -26.4, FLOOR + 9.72, -7.2);
    // Beige case with a bay and a green power lamp, and a keyboard beside it on the lower shelf.
    this.slab(parent, plastic, -30.2, FLOOR + 6.12, -9.5, -28.2, FLOOR + 9.12, -7.4);
    // Bay and lamp stand proud of the case front (at z = -7.4) so their faces never share its plane.
    this.slab(parent, dark, -30.1, FLOOR + 8, -7.42, -28.3, FLOOR + 8.3, -7.34);
    this.slab(parent, led, -28.7, FLOOR + 6.6, -7.44, -28.5, FLOOR + 6.75, -7.36);
    this.slab(parent, plastic, -28, FLOOR + 6.12, -9.2, -26.5, FLOOR + 6.37, -7.9);
    // Old CRT on the upper shelf, its dark screen toward the room.
    this.slab(parent, plastic, -30.4, FLOOR + 9.72, -9.5, -27, FLOOR + 12.2, -7.6);
    const glass = new T.Mesh(this.tools.track(new T.PlaneGeometry(2.8, 2)), crtGlass);
    glass.position.set(-28.7, FLOOR + 10.95, -7.58);
    parent.add(glass);
  }

  /** Two old towers lying on their sides, a pair of 19-inch racks and a CRT workstation, all clear of the walkway. */
  private floorMachines(parent: T.Object3D, terminal: T.Texture): void {
    this.tower(parent, -30.4, -4.4, 0.25);
    this.tower(parent, -29.6, 4.6, -0.45);
    this.rack(parent, 23.2, 27.8, 81, false);
    this.rack(parent, 28.4, 33, 82, true);
    this.workstation(parent, terminal);
  }

  /** A tower on its left side: beige body, bezel with two drive bays, power button and a lit LED. */
  private tower(parent: T.Object3D, x: number, z: number, yaw: number): void {
    const { plastic, dark, steel, led } = this.m;
    const group = new T.Group();
    group.position.set(x, FLOOR + 1.8, z);
    group.rotation.set(0, yaw, Math.PI / 2, 'YXZ');
    parent.add(group);
    this.block(group, plastic, 0, 0, 0, 3.6, 7.6, 6.2);
    this.block(group, dark, 0, 0, 3.2, 3.5, 6.8, 0.2);
    this.block(group, dark, 0, 1.4, 3.35, 3, 0.5, 0.15);
    this.block(group, dark, 0, 0.5, 3.35, 3, 0.5, 0.15);
    const button = this.mesh(group, this.unitCylinder, steel, 1.1, -1.4, 3.35);
    button.scale.set(0.22, 0.2, 0.22);
    button.rotation.x = Math.PI / 2;
    this.block(group, led, -1, -1.9, 3.36, 0.14, 0.14, 0.06);
    this.block(group, dark, 1.82, 2.5, 0, 0.05, 0.12, 4.6);
    this.block(group, dark, 1.82, -2.5, 0, 0.05, 0.12, 4.6);
  }

  /** A 19-inch rack cabinet against the left wall: a steel shell with six instrument units stacked in it. */
  private rack(parent: T.Object3D, z0: number, z1: number, seed: number, withLeds: boolean): void {
    const { steel, dark, white, led } = this.m;
    const random = seededRandom(seed);
    const x0 = -37.5;
    const x1 = -33.9;
    const top = FLOOR + 7.4;
    // Sides, top and plinth stop short of the two end plates, which run the full width.
    this.slab(parent, steel, x0, FLOOR, z0 + BOARD, x0 + BOARD, top, z1 - BOARD);
    this.slab(parent, steel, x0 + BOARD, FLOOR + 7.3, z0 + BOARD, x1, top, z1 - BOARD);
    this.slab(parent, dark, x0 + BOARD, FLOOR, z0 + BOARD, x1, FLOOR + 0.2, z1 - BOARD);
    this.slab(parent, steel, x0, FLOOR, z0, x1, top, z0 + BOARD);
    this.slab(parent, steel, x0, FLOOR, z1 - BOARD, x1, top, z1);
    const units = this.instanced(parent, this.cube, white, 6);
    for (let i = 0; i < 6; i++) {
      this.place(units, i, -35.65, FLOOR + 0.95 + i * 1.1, (z0 + z1) / 2, 3.5, 0.9, z1 - z0 - 0.3);
      units.setColorAt(i, new T.Color(RACK_TONES[Math.floor(random() * RACK_TONES.length)]));
    }
    if (withLeds) {
      const strip = this.instanced(parent, this.cube, led, 8);
      for (let i = 0; i < 8; i++) this.place(strip, i, x1 + 0.02, FLOOR + 7, z0 + 0.4 + i * 0.5, 0.04, 0.12, 0.12);
    }
  }

  /** CRT workstation on a low table in the front-right corner: the monitor faces the bench, keyboard in front. */
  private workstation(parent: T.Object3D, terminal: T.Texture): void {
    const { wood, steel, plastic } = this.m;
    this.slab(parent, wood, 28.3, FLOOR + 2.9, 23.6, 34.7, FLOOR + 3.1, 29.6);
    const legs = this.instanced(parent, this.cube, steel, 4);
    [
      [28.6, 23.9],
      [34.4, 23.9],
      [28.6, 29.3],
      [34.4, 29.3],
    ].forEach(([x, z], i) => this.place(legs, i, x, FLOOR + 1.45, z, 0.25, 2.9, 0.25));
    this.slab(parent, plastic, 29.4, FLOOR + 3.1, 25.4, 33.6, FLOOR + 6.9, 29);
    this.slab(parent, plastic, 29.9, FLOOR + 3.4, 29, 33.1, FLOOR + 6.6, 29.9);
    const screen = new T.Mesh(
      this.tools.track(new T.PlaneGeometry(3.4, 2.8)),
      this.tools.track(
        new T.MeshStandardMaterial({ map: terminal, emissiveMap: terminal, emissive: '#ffffff', emissiveIntensity: 0.7, roughness: 0.3 }),
      ),
    );
    screen.position.set(31.5, FLOOR + 5, 25.38);
    screen.rotation.y = Math.PI;
    parent.add(screen);
    this.slab(parent, plastic, 30, FLOOR + 3.1, 23.9, 33, FLOOR + 3.35, 25.1);
    const keys = this.instanced(parent, this.cube, this.m.chip, 30);
    for (let i = 0; i < 30; i++) {
      this.place(keys, i, 30.25 + (i % 10) * 0.27, FLOOR + 3.4, 24.15 + Math.floor(i / 10) * 0.36, 0.2, 0.1, 0.2);
    }
  }
}
