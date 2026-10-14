import * as T from 'three';
import { PIN_NAMES } from '../cpu-pins';
import { cpuPinX, CPU_ASSEMBLY as C } from './cpu-assembly';
import type { StationActivity } from '../../laboratory/station-activity';
import type { WorkshopTools } from '../workshop-tools';

/** Pin number (1 to 40) that carries address or data line `bit` of the 20-bit multiplexed bus. */
export function addressPin(bit: number): number {
  const name = bit < 16 ? 'AD' + bit : 'A' + bit + '/';
  const index = PIN_NAMES.findIndex((n) => (bit < 16 ? n === name : n.startsWith(name)));
  return index + 1;
}

export const SIGNAL_PINS = {
  ale: PIN_NAMES.indexOf('ALE') + 1,
  rd: PIN_NAMES.indexOf('RD') + 1,
  wr: PIN_NAMES.indexOf('WR') + 1,
  bhe: PIN_NAMES.indexOf('BHE/S7') + 1,
} as const;

/** Which pins are driven in an activity: the address in fetch, the data word in write, plus control strobes. */
export function drivenPins(a: StationActivity): Set<number> {
  const pins = new Set<number>();
  if (a.phase === 'idle') return pins;
  const word = a.phase === 'fetch' ? a.address : a.phase === 'write' ? a.address : undefined;
  if (a.phase === 'fetch' && word !== undefined)
    for (let bit = 0; bit < 20; bit++) if ((word >>> bit) & 1) pins.add(addressPin(bit));
  if (a.phase === 'write') {
    // The same AD lines now carry the data: only the lines of the transferred byte or word are lit.
    const value = a.data ?? 0;
    for (let bit = 0; bit < 16; bit++) if ((value >>> bit) & 1) pins.add(addressPin(bit));
  }
  if (a.ale) pins.add(SIGNAL_PINS.ale);
  if (a.rd) pins.add(SIGNAL_PINS.rd);
  if (a.wr) pins.add(SIGNAL_PINS.wr);
  return pins;
}

const QUEUE_SIZE = 6;
const FLAGS = ['CF', 'PF', 'AF', 'ZF', 'SF', 'OF'] as const;

/**
 * Reads StationActivity and shows it on the 8086 board: address and data on the pins, the prefetch queue
 * holding the real opcode bytes, the mnemonic on the control block and the flags on a strip above it.
 * It owns nothing but small indicator meshes; the academic state stays in the session.
 */
export class CpuActivityView {
  private readonly pinLamps = new Map<number, T.Mesh>();
  private readonly blockGlows = new Map<string, T.Mesh>();
  private queueCells: T.Object3D[] = [];
  private flagLamps: T.Mesh[] = [];
  private mnemonic?: T.Object3D;
  private lastMnemonic = '';
  private lastQueue = '';

  constructor(private readonly tools: WorkshopTools) {}

  /** Number of the pad indicator lamps built, exposed for tests. */
  get lampCount(): number {
    return this.pinLamps.size;
  }

  get queueSize(): number {
    return this.queueCells.length;
  }

  build(root: T.Group, parts: Map<string, T.Object3D>): void {
    const on = this.tools.track(new T.MeshBasicMaterial({ color: '#ffd27a' }));
    const geometry = this.tools.track(new T.CircleGeometry(0.1, 16));
    geometry.rotateX(-Math.PI / 2);
    for (const side of [-1, 1])
      for (let n = 0; n < 20; n++) {
        const number = side === 1 ? n + 1 : 40 - n;
        const lamp = new T.Mesh(geometry, on);
        lamp.position.set(cpuPinX(n), C.pcbTop + 0.032, side * C.pinAxisZ);
        lamp.visible = false;
        lamp.name = 'pin-lamp-' + number;
        lamp.userData['noBounds'] = true;
        root.add(lamp);
        this.pinLamps.set(number, lamp);
      }
    // Block glows sit on top of each functional tile, so they follow it when the chip opens.
    const glowMaterial = this.tools.track(
      new T.MeshBasicMaterial({ color: '#ffe3a1', transparent: true, opacity: 0.38, depthWrite: false }),
    );
    for (const id of ['alu', 'registers', 'control', 'biu', 'queue']) {
      const tile = parts.get(id);
      if (!tile) continue;
      const box = new T.Box3().setFromObject(tile);
      const size = box.getSize(new T.Vector3());
      const glow = new T.Mesh(this.tools.track(new T.PlaneGeometry(size.x * 0.96, size.z * 0.9)), glowMaterial);
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(0, 0.131, 0);
      glow.visible = false;
      glow.userData['noBounds'] = true;
      glow.userData['dynamic'] = true;
      glow.renderOrder = 5;
      tile.add(glow);
      this.blockGlows.set(id, glow);
    }
    this.buildQueue(parts.get('queue'));
    this.buildFlags(parts.get('control'));
    this.mnemonic = this.tools.label?.(parts.get('control') ?? root, 'CONTROL', 0, 0.162, 0.26, 1) as T.Object3D | undefined;
    this.tools.onActivity?.((a) => this.apply(a));
  }

  private buildQueue(tile: T.Object3D | undefined): void {
    if (!tile) return;
    const box = new T.Box3().setFromObject(tile);
    const width = box.getSize(new T.Vector3()).x;
    const cell = (width * 0.9) / QUEUE_SIZE;
    const material = new T.MeshStandardMaterial({ color: '#3b3552', roughness: 0.6 });
    for (let i = 0; i < QUEUE_SIZE; i++) {
      const slot = new T.Mesh(
        this.tools.track(new T.BoxGeometry(cell * 0.82, 0.02, 0.17)),
        this.tools.track(material.clone()),
      );
      slot.position.set(-width * 0.45 + cell * (i + 0.5), 0.14, 0);
      slot.userData['noBounds'] = true;
      const label = this.tools.label?.(slot, '--', 0, 0.016, 0, cell * 0.7) as T.Object3D | undefined;
      slot.userData['label'] = label;
      tile.add(slot);
      this.queueCells.push(slot);
    }
  }

  private buildFlags(tile: T.Object3D | undefined): void {
    if (!tile) return;
    const off = this.tools.track(new T.MeshBasicMaterial({ color: '#2a2f31' }));
    FLAGS.forEach((name, i) => {
      const lamp = new T.Mesh(this.tools.track(new T.BoxGeometry(0.15, 0.02, 0.15)), off.clone());
      this.tools.track(lamp.material as T.Material);
      lamp.position.set(-0.4 + i * 0.16, 0.145, -0.26);
      lamp.name = 'flag-lamp-' + name;
      lamp.userData['noBounds'] = true;
      tile.add(lamp);
      this.flagLamps.push(lamp);
    });
  }

  /** Applies one activity: lamps on or off, queue bytes, mnemonic. Pure presentation, no timers. */
  apply(a: StationActivity): void {
    const driven = drivenPins(a);
    for (const [number, lamp] of this.pinLamps) lamp.visible = driven.has(number);
    for (const [id, glow] of this.blockGlows) glow.visible = a.blocks.includes(id);
    const queue = a.phase === 'idle' ? '' : a.bytes.join(',');
    if (a.phase === 'fetch' || a.phase === 'decode') this.showQueue(a.bytes, queue);
    else if (a.phase === 'idle') this.showQueue([], '');
    const text = a.phase === 'idle' || !a.mnemonic || a.phase === 'fetch' ? 'CONTROL' : a.mnemonic;
    if (text !== this.lastMnemonic) {
      this.lastMnemonic = text;
      if (this.mnemonic) this.tools.relabel?.(this.mnemonic, text);
    }
    this.flagLamps.forEach((lamp, i) => {
      const lit = a.changed.includes(FLAGS[i]) || (a.phase === 'execute' && a.changed.includes('FLAGS'));
      (lamp.material as T.MeshBasicMaterial).color.set(lit ? '#ffd27a' : '#2a2f31');
    });
  }

  private showQueue(bytes: number[], key: string): void {
    if (key === this.lastQueue) return;
    this.lastQueue = key;
    this.queueCells.forEach((slot, i) => {
      const value = bytes[i];
      const label = slot.userData['label'] as T.Object3D | undefined;
      if (label) this.tools.relabel?.(label, value === undefined ? '--' : value.toString(16).toUpperCase().padStart(2, '0'));
      (slot as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>).material.color.set(
        value === undefined ? '#3b3552' : '#6a5fa0',
      );
    });
  }
}
