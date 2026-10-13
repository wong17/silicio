import { seededRandom } from './noise';
import { LABEL_FAMILY } from './label-canvas';

/**
 * Hand-drawn schematic sheets pinned to the walls. They are conceptual: every sheet carries the
 * stamp "CONCEPTUAL · NO A ESCALA", so no drawing claims the real layout of a die.
 */
export type SheetKind = 'die' | 'cell' | 'inverter' | 'soc' | 'timing';

export interface SheetSpec {
  kind: SheetKind;
  seed: number;
  /** Short code printed in the title block, e.g. "HOJA 02". */
  sheet: string;
}

export const SHEET_WIDTH = 640;
export const SHEET_HEIGHT = 480;

const INK = '#2b3138';
const GRID = 'rgba(58, 92, 128, 0.16)';
const STAMP = 'rgba(138, 42, 34, 0.62)';

/** Pencil-like strokes: every segment is nudged by a little noise, so no line is perfectly ruled. */
class Pen {
  private readonly random: () => number;
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    seed: number,
  ) {
    this.random = seededRandom(seed);
  }
  line(x1: number, y1: number, x2: number, y2: number, width = 2, colour = INK): void {
    const c = this.ctx;
    const steps = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 36));
    c.strokeStyle = colour;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x1, y1);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      c.lineTo(
        x1 + (x2 - x1) * t + (this.random() - 0.5) * 1.1,
        y1 + (y2 - y1) * t + (this.random() - 0.5) * 1.1,
      );
    }
    c.lineTo(x2, y2);
    c.stroke();
  }
  polyline(points: number[][], width = 2, colour = INK): void {
    for (let i = 1; i < points.length; i++)
      this.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], width, colour);
  }
  box(x: number, y: number, w: number, h: number, width = 2, colour = INK): void {
    this.polyline(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
        [x, y],
      ],
      width,
      colour,
    );
  }
  circle(x: number, y: number, r: number, width = 2, colour = INK): void {
    const c = this.ctx;
    c.strokeStyle = colour;
    c.lineWidth = width;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
  }
  text(value: string, x: number, y: number, size: number, align: CanvasTextAlign = 'left', colour = INK, weight = 500): void {
    const c = this.ctx;
    c.fillStyle = colour;
    c.font = `${weight} ${size}px ${LABEL_FAMILY}`;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.fillText(value, x, y);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
  }
  arrow(x1: number, y1: number, x2: number, y2: number, width = 2): void {
    this.line(x1, y1, x2, y2, width);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = 9;
    this.line(x2, y2, x2 - head * Math.cos(angle - 0.45), y2 - head * Math.sin(angle - 0.45), width);
    this.line(x2, y2, x2 - head * Math.cos(angle + 0.45), y2 - head * Math.sin(angle + 0.45), width);
  }
  dot(x: number, y: number, r = 4): void {
    const c = this.ctx;
    c.fillStyle = INK;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
}

/** Aged paper: warm base, fibres, a coffee ring, a fold, and darker edges. */
function paper(ctx: CanvasRenderingContext2D, w: number, h: number, random: () => number): void {
  const base = ctx.createRadialGradient(w * 0.48, h * 0.44, w * 0.08, w * 0.5, h * 0.5, w * 0.78);
  base.addColorStop(0, '#e9dfc4');
  base.addColorStop(1, '#bba884');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = random() < 0.5 ? 'rgba(96, 74, 44, 0.05)' : 'rgba(255, 252, 240, 0.07)';
    ctx.fillRect(random() * w, random() * h, 1 + random() * 2.5, 1 + random() * 1.5);
  }
  ctx.strokeStyle = 'rgba(110, 76, 40, 0.18)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(w * 0.84, h * 0.18, 30, 0.2, 5.6);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 252, 238, 0.2)';
  ctx.fillRect(w * 0.5 - 1, 0, 2, h);
  ctx.fillStyle = 'rgba(70, 52, 30, 0.14)';
  ctx.fillRect(w * 0.5 + 1, 0, 1, h);
  const edge = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.66);
  edge.addColorStop(0, 'rgba(70, 50, 28, 0)');
  edge.addColorStop(1, 'rgba(70, 50, 28, 0.42)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
}

function engineeringGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 32) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = 0; y <= h; y += 32) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();
}

/** Title block, a border and the stamp that keeps every sheet honest about being conceptual. */
function frame(pen: Pen, ctx: CanvasRenderingContext2D, w: number, h: number, title: string, sheet: string): void {
  pen.box(18, 18, w - 36, h - 36, 2.4, 'rgba(43, 49, 56, 0.85)');
  pen.box(w - 250, h - 92, 232, 74, 1.8, 'rgba(43, 49, 56, 0.85)');
  pen.line(w - 250, h - 62, w - 18, h - 62, 1.2);
  pen.text(title, w - 238, h - 78, 13, 'left', INK, 700);
  pen.text('SILICIO · BANCO', w - 238, h - 48, 11, 'left', 'rgba(43,49,56,0.85)', 500);
  pen.text(sheet, w - 30, h - 48, 11, 'right', 'rgba(43,49,56,0.85)', 500);
  ctx.save();
  ctx.translate(w - 116, 62);
  ctx.rotate(-0.14);
  ctx.strokeStyle = STAMP;
  ctx.lineWidth = 4;
  ctx.strokeRect(-92, -22, 184, 44);
  ctx.fillStyle = STAMP;
  ctx.font = `700 19px ${LABEL_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CONCEPTUAL · NO A ESCALA', 0, 1);
  ctx.restore();
}

function die(pen: Pen): void {
  pen.box(90, 84, 340, 262, 3);
  // Bond pads along the left and bottom edges, drawn as small squares.
  for (let i = 0; i < 7; i++) pen.box(74, 104 + i * 34, 10, 10, 1.4);
  for (let i = 0; i < 9; i++) pen.box(108 + i * 32, 352, 10, 10, 1.4);
  pen.box(110, 102, 220, 140, 2);
  pen.text('EU', 118, 116, 15, 'left', INK, 700);
  pen.box(124, 124, 92, 62, 1.8);
  pen.text('ALU', 170, 155, 13, 'center');
  pen.box(230, 124, 90, 62, 1.8);
  pen.text('REG', 275, 147, 13, 'center');
  pen.text('AX BX CX DX', 275, 166, 9, 'center', 'rgba(43,49,56,0.8)', 400);
  pen.box(124, 194, 196, 36, 1.8);
  pen.text('CONTROL', 222, 212, 12, 'center');
  pen.box(110, 254, 220, 40, 2);
  pen.text('COLA · 6 BYTES', 220, 274, 12, 'center');
  pen.box(352, 102, 62, 192, 2);
  pen.text('BIU', 383, 198, 15, 'center', INK, 700);
  // Buses leave the BIU to the right, with their ranges written above them.
  pen.arrow(414, 150, 500, 150, 2.2);
  pen.arrow(414, 214, 500, 214, 2.2);
  pen.text('AD15–AD0', 458, 136, 11, 'center');
  pen.text('A19–A16', 458, 200, 11, 'center');
  pen.arrow(330, 116, 330, 236, 1.2);
  pen.text('A', 344, 226, 14, 'left', INK, 700);
  pen.text('B', 290, 296, 14, 'left', INK, 700);
  pen.line(124, 302, 330, 302, 1.2);
  pen.line(124, 296, 124, 308, 1.2);
  pen.line(330, 296, 330, 308, 1.2);
  pen.text('esquema de bloques, sin distribución real', 92, 386, 11, 'left', 'rgba(43,49,56,0.82)', 400);
}

function cell(pen: Pen): void {
  // Column of the cell: word line across, bit line down, one transistor and one capacitor.
  pen.text('WL', 60, 150, 13, 'left', INK, 700);
  pen.line(84, 150, 250, 150, 2.2);
  pen.line(250, 150, 276, 150, 2.2);
  pen.line(276, 118, 276, 182, 3);
  pen.line(290, 124, 290, 176, 2.6);
  pen.line(290, 124, 304, 124, 2.2);
  pen.line(290, 176, 290, 236, 2.2);
  pen.dot(304, 124, 4);
  pen.line(304, 60, 304, 400, 2.2);
  pen.text('BL', 318, 84, 13, 'left', INK, 700);
  pen.text('1T', 232, 118, 12, 'right');
  pen.line(268, 236, 312, 236, 3);
  pen.line(268, 250, 312, 250, 3);
  pen.line(290, 250, 290, 300, 2.2);
  pen.text('1C', 326, 244, 12, 'left');
  pen.text('Cs', 326, 268, 12, 'left');
  pen.line(268, 300, 312, 300, 2.2);
  pen.line(260, 318, 320, 318, 2.2);
  pen.line(272, 330, 308, 330, 2.2);
  pen.line(284, 342, 296, 342, 2.2);
  pen.text('VSS', 332, 330, 12, 'left');
  pen.text('CELDA DE MEMORIA 1 TRANSISTOR · 1 CONDENSADOR', 92, 412, 11, 'left', 'rgba(43,49,56,0.82)', 400);
}

function inverter(pen: Pen): void {
  pen.text('VDD', 110, 92, 13, 'left', INK, 700);
  pen.line(140, 96, 480, 96, 2.6);
  pen.line(300, 96, 300, 118, 2.2);
  // PMOS on top: bubble on the gate marks the p-channel.
  pen.line(300, 122, 300, 200, 2.6);
  pen.line(276, 132, 276, 190, 2.6);
  pen.circle(268, 161, 4, 1.8);
  pen.line(300, 200, 300, 240, 2.2);
  pen.text('PMOS', 330, 160, 12, 'left');
  // NMOS below: source to GND, gate to the same input.
  pen.line(300, 260, 300, 300, 2.2);
  pen.line(300, 300, 300, 336, 2.6);
  pen.line(276, 290, 276, 348, 2.6);
  pen.line(300, 336, 300, 362, 2.2);
  pen.text('NMOS', 330, 320, 12, 'left');
  pen.text('GND', 110, 380, 13, 'left', INK, 700);
  pen.line(140, 384, 480, 384, 2.6);
  // Input comes from the left to both gates; output leaves the shared drain to the right.
  pen.line(140, 161, 268, 161, 2.2);
  pen.line(230, 161, 230, 319, 2.2);
  pen.line(230, 319, 276, 319, 2.2);
  pen.text('IN', 130, 146, 13, 'left', INK, 700);
  pen.line(300, 240, 480, 240, 2.4);
  pen.arrow(446, 240, 480, 240, 2.4);
  pen.text('OUT', 470, 222, 13, 'left', INK, 700);
  pen.dot(300, 240, 4.5);
  pen.text('inversor CMOS · esquema', 92, 420, 11, 'left', 'rgba(43,49,56,0.82)', 400);
}

function soc(pen: Pen): void {
  pen.box(74, 88, 492, 300, 3);
  pen.box(90, 104, 214, 128, 2);
  pen.text('CPU · RENDIMIENTO', 197, 120, 11, 'center');
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) pen.box(122 + c * 84, 140 + r * 42, 62, 28, 1.4);
  pen.box(90, 246, 214, 88, 2);
  pen.text('CPU · EFICIENCIA', 197, 262, 11, 'center');
  for (let c = 0; c < 4; c++) pen.box(108 + c * 48, 282, 34, 34, 1.4);
  pen.box(322, 104, 220, 150, 2);
  pen.text('GPU', 432, 120, 11, 'center');
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) pen.box(338 + c * 48, 138 + r * 36, 34, 26, 1.4);
  pen.box(322, 270, 150, 66, 2);
  pen.text('NEURAL', 397, 286, 11, 'center');
  for (let c = 0; c < 2; c++) for (let r = 0; r < 2; r++) pen.box(336 + c * 62, 300 + r * 14, 48, 8, 1.2);
  pen.box(490, 270, 52, 66, 2);
  pen.text('IO', 516, 303, 11, 'center');
  pen.box(90, 346, 452, 24, 2);
  for (let i = 0; i < 52; i++) pen.line(102 + i * 8.2, 352, 102 + i * 8.2, 364, 1);
  pen.text('MEMORIA UNIFICADA', 316, 384, 11, 'center', 'rgba(43,49,56,0.85)', 500);
  pen.text('diagrama conceptual de bloques · no es el layout real', 92, 412, 11, 'left', 'rgba(43,49,56,0.82)', 400);
}

function timing(pen: Pen): void {
  const rows = [
    ['CLK', 120],
    ['ALE', 170],
    ['/RD', 220],
    ['/WR', 270],
    ['AD15–0', 322],
    ['A19–16', 372],
  ] as const;
  const left = 150,
    right = 580;
  for (const [label, y] of rows) pen.text(label, 92, y, 12, 'left', INK, 700);
  for (let s = 0; s < 4; s++) {
    const x = left + s * 107.5;
    pen.line(x, 96, x, 392, 1, 'rgba(43,49,56,0.35)');
    pen.text(`T${s + 1}`, x + 53, 92, 12, 'center', INK, 700);
  }
  // Clock: a square wave with a period of one state.
  const period = 53.75;
  const clk: number[][] = [[left, 108]];
  for (let x = left; x < right; x += period / 2) {
    const up = Math.round((x - left) / (period / 2)) % 2 === 0;
    clk.push([x, up ? 108 : 132], [x + period / 2, up ? 108 : 132]);
  }
  pen.polyline(clk, 2);
  // Strobe-like pulses for ALE, RD and WR, each in its own state.
  pen.polyline([[left, 170 + 14], [left + 22, 170 + 14], [left + 22, 170 - 14], [left + 54, 170 - 14], [left + 54, 170 + 14], [right, 170 + 14]], 2);
  pen.polyline([[left, 220 - 14], [left + 107, 220 - 14], [left + 107, 220 + 14], [left + 215, 220 + 14], [left + 215, 220 - 14], [right, 220 - 14]], 2);
  pen.polyline([[left, 270 - 14], [left + 215, 270 - 14], [left + 215, 270 + 14], [left + 322, 270 + 14], [left + 322, 270 - 14], [right, 270 - 14]], 2);
  // Address then data share the same wires: a crossing band per state.
  for (const [y, from, to, label] of [
    [322, left, left + 107, 'dirección'],
    [322, left + 107, right, 'dato'],
  ] as const) {
    pen.line(from, y - 12, to, y - 12, 2);
    pen.line(from, y + 12, to, y + 12, 2);
    pen.line(from, y - 12, from + 12, y + 12, 1.4);
    pen.line(to - 12, y - 12, to, y + 12, 1.4);
    pen.text(label, (from + to) / 2, y, 11, 'center', 'rgba(43,49,56,0.9)', 400);
  }
  pen.line(left, 372 - 12, right, 372 - 12, 2);
  pen.line(left, 372 + 12, right, 372 + 12, 2);
  pen.text('dirección de los 4 bits altos', (left + right) / 2, 372, 11, 'center', 'rgba(43,49,56,0.9)', 400);
  pen.text('ciclo de bus, esquema de referencia', 92, 418, 11, 'left', 'rgba(43,49,56,0.82)', 400);
}

const TITLES: Record<SheetKind, string> = {
  die: 'PLANO DE BLOQUES · 8086',
  cell: 'CELDA DRAM 1T · 1C',
  inverter: 'INVERSOR CMOS',
  soc: 'SoC · BLOQUES',
  timing: 'CICLO DE BUS',
};

/**
 * Paints one sheet on a canvas. The strokes and stains come from the seed, so each sheet is different
 * but always the same from one page load to the next.
 */
export function paintBlueprint(ctx: CanvasRenderingContext2D, spec: SheetSpec): void {
  const w = SHEET_WIDTH,
    h = SHEET_HEIGHT;
  const random = seededRandom(spec.seed);
  paper(ctx, w, h, random);
  engineeringGrid(ctx, w, h);
  const pen = new Pen(ctx, spec.seed + 101);
  switch (spec.kind) {
    case 'die':
      die(pen);
      break;
    case 'cell':
      cell(pen);
      break;
    case 'inverter':
      inverter(pen);
      break;
    case 'soc':
      soc(pen);
      break;
    case 'timing':
      timing(pen);
      break;
  }
  frame(pen, ctx, w, h, TITLES[spec.kind], spec.sheet);
}
