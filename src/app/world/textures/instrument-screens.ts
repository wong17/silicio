import { LABEL_FAMILY } from './label-canvas';

/** Vertical position, in 0..1 of the screen height, of the scrolling trace at horizontal position `u`. */
export function scopeTrace(u: number, t: number): number {
  return 0.5 + 0.16 * Math.sin(u * Math.PI * 6 - t * 5) + 0.05 * Math.sin(u * Math.PI * 17 + t * 11);
}

/** Bus strobe shown in the lower lane of the scope, as selected on the signal instrument. */
export interface ScopeStrobe {
  channel: string;
  /** ALE strobes every bus cycle; RD and WR strobe only while the bus is being accessed. */
  active: boolean;
}

const STROBE_COLOUR: Record<string, string> = { ALE: '#c6d99b', RD: '#9fd0ff', WR: '#ffb38a' };

/**
 * Oscilloscope graticule with two lanes, both moving: the analogue trace on top, the bus strobe at
 * the bottom. Drawn at a low rate by the caller, so the canvas stays cheap while the screen reads live.
 */
export function drawScopeScreen(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  strobe: ScopeStrobe = { channel: 'ALE', active: true },
): void {
  ctx.fillStyle = '#0d211d';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(126, 196, 160, 0.17)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const x = Math.round((i / 10) * w) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let j = 0; j <= 8; j++) {
    const y = Math.round((j / 8) * h) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
  // Analogue trace in the upper lane.
  const upper = (u: number) => h * (0.4 + (scopeTrace(u, t) - 0.5) * 0.9);
  ctx.strokeStyle = 'rgba(198, 224, 150, 0.85)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 3) {
    const y = upper(x / w);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // The bright head sweeps across the trace and wraps, as a timebase does.
  const head = ((t * 0.35) % 1) * w;
  ctx.fillStyle = '#eef8c4';
  ctx.beginPath();
  ctx.arc(head, upper(head / w), 3.2, 0, Math.PI * 2);
  ctx.fill();
  // Bus strobe in the lower lane: its pulses scroll, so they move with the bus cycles.
  const low = h * 0.8,
    high = h * 0.66;
  ctx.strokeStyle = strobe.active ? (STROBE_COLOUR[strobe.channel] ?? '#c6d99b') : 'rgba(198, 224, 150, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const phase = ((x / w) * 2.2 + t * 0.9) % 1;
    const y = strobe.active && phase < 0.42 ? high : low;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(198, 224, 150, 0.7)';
  ctx.font = `500 ${Math.round(h * 0.085)}px ${LABEL_FAMILY}`;
  ctx.fillText('CH1  2 V/div', w * 0.04, h * 0.12);
  ctx.fillText(`${strobe.channel}${strobe.active ? '' : ' · sin acceso'}`, w * 0.04, h * 0.93);
}

/** Multimeter readings: small drift around the selected function, as a live meter shows. */
export function meterReading(mode: number, t: number): string {
  switch (mode) {
    case 1:
      return `${(0.02 * Math.abs(Math.sin(t * 0.7))).toFixed(2)} V`;
    case 2:
      return t % 6 < 4.6 ? 'OL' : '0.8 Ω';
    case 3:
      return `${(0.62 + 0.006 * Math.sin(t * 1.3)).toFixed(3)} V`;
    default:
      return `${(5 + 0.012 * Math.sin(t * 0.9) + 0.006 * Math.sin(t * 2.3)).toFixed(3)} V`;
  }
}

export const METER_FUNCTIONS = ['DC V', 'AC V', 'Ω  CONT', 'DIODO'];

/** Paints the meter's LCD: the function on top left, the reading large on the right. */
export function drawMeterLcd(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mode: number,
  reading: string,
): void {
  ctx.fillStyle = '#9fb08a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#16200f';
  ctx.font = `400 ${Math.round(h * 0.15)}px ${LABEL_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.fillText(METER_FUNCTIONS[mode] ?? METER_FUNCTIONS[0], w * 0.06, h * 0.26);
  ctx.font = `600 ${Math.round(h * 0.42)}px ${LABEL_FAMILY}`;
  ctx.textAlign = 'right';
  ctx.fillText(reading, w * 0.94, h * 0.8);
  ctx.textAlign = 'left';
}

/** Supply readout: voltage and current in large digits over unlit segments, with the mode lamps. */
export function drawSupplyReadout(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  volts: string,
  amps: string,
): void {
  ctx.fillStyle = '#0c1812';
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  // Unlit segments: a faint "8.88" under the live digits, as on any LCD.
  ctx.font = `600 ${Math.round(h * 0.6)}px ${LABEL_FAMILY}`;
  ctx.fillStyle = 'rgba(150, 230, 180, 0.07)';
  ctx.fillText('8.88', w * 0.03, h * 0.8);
  // Live digits with a soft glow.
  ctx.shadowColor = 'rgba(150, 255, 190, 0.6)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#b8f6cc';
  ctx.fillText(volts, w * 0.03, h * 0.8);
  ctx.font = `500 ${Math.round(h * 0.2)}px ${LABEL_FAMILY}`;
  ctx.fillText('V', w * 0.47, h * 0.8);
  ctx.font = `600 ${Math.round(h * 0.46)}px ${LABEL_FAMILY}`;
  ctx.fillText(amps, w * 0.58, h * 0.8);
  ctx.font = `500 ${Math.round(h * 0.2)}px ${LABEL_FAMILY}`;
  ctx.fillText('A', w * 0.58 + ctx.measureText(amps).width + 10, h * 0.8);
  ctx.shadowBlur = 0;
  // Captions and mode lamps: constant voltage is lit, the output is on.
  ctx.font = `500 ${Math.round(h * 0.12)}px ${LABEL_FAMILY}`;
  ctx.fillStyle = 'rgba(150, 230, 180, 0.6)';
  ctx.fillText('TENSIÓN', w * 0.03, h * 0.2);
  ctx.fillText('CORRIENTE', w * 0.58, h * 0.2);
  ctx.fillStyle = '#b8f6cc';
  ctx.fillText('CV', w * 0.03, h * 0.96);
  ctx.fillStyle = 'rgba(150, 230, 180, 0.3)';
  ctx.fillText('CC', w * 0.11, h * 0.96);
  ctx.fillStyle = '#b8f6cc';
  ctx.fillText('SALIDA ON', w * 0.58, h * 0.96);
}

/** Silkscreen on the supply's front plate: knob scales, port marks and the title, printed in light ink. */
export function drawSupplyFace(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  const ink = 'rgba(236, 233, 222, 0.9)';
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';
  // Nine ticks on the left of each knob (the knobs sit at x = 405 px); every second tick is longer.
  for (const y of [248, 318, 388]) {
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI - 0.9 + (1.8 * i) / 8;
      const outer = i % 2 === 0 ? 50 : 46;
      ctx.lineWidth = i % 2 === 0 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(405 + Math.cos(a) * 39, y + Math.sin(a) * 39);
      ctx.lineTo(405 + Math.cos(a) * outer, y + Math.sin(a) * outer);
      ctx.stroke();
    }
  }
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `600 22px ${LABEL_FAMILY}`;
  ctx.fillText('FUENTE REGULADA', 48, 26);
  ctx.textAlign = 'center';
  ctx.font = `500 18px ${LABEL_FAMILY}`;
  ctx.fillText('SALIDA', 175, 318);
  ctx.font = `600 32px ${LABEL_FAMILY}`;
  ctx.fillStyle = '#f0c3b6';
  ctx.fillText('+', 115, 404);
  ctx.fillStyle = '#1d2224';
  ctx.fillText('−', 235, 404);
}
