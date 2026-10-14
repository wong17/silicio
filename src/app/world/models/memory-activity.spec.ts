import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { StationBuilder } from './station-builder';
import { IDLE_ACTIVITY, projectMemory, type StationActivity } from '../../laboratory/station-activity';
import { explodedOffset } from '../exploded-layout';

function harness(variant: 'classic' | 'dimm') {
  let listener: ((a: StationActivity) => void) | undefined;
  const animators: ((t: number) => void)[] = [];
  const texts = new Map<T.Object3D, string>();
  const tools = {
    track: <G>(r: G): G => r,
    material: (_id: string, color: string) => new T.MeshStandardMaterial({ color }),
    label: () => {
      const o = new T.Object3D();
      texts.set(o, '');
      return o;
    },
    relabel: (o: T.Object3D, t: string) => {
      texts.set(o, t);
    },
    animate: (fn: (t: number) => void) => {
      animators.push(fn);
    },
    onActivity: (fn: (a: StationActivity) => void) => {
      listener = fn;
    },
  };
  const root = new T.Group();
  const parts = new Map<string, T.Object3D>();
  new StationBuilder(tools).build('memory', variant, root, parts);
  root.updateMatrixWorld(true);
  const send = (segment: number, offset: number, read: (a: number) => number = () => 0) => {
    listener!({ ...IDLE_ACTIVITY, sessionId: 's', revision: segment + offset, phase: 'execute', memory: projectMemory(segment, offset, read) });
    animators.forEach((fn) => fn(0));
    root.updateMatrixWorld(true);
  };
  const count = () => {
    let n = 0;
    root.traverse(() => n++);
    return n;
  };
  return { root, parts, texts, send, count };
}

describe('memoria: animación de la placa y el módulo', () => {
  it('row_and_column_address_the_selected_cell', () => {
    const { texts, send } = harness('classic');
    send(0x2000, 0x0005 * 2 + 0x100 * 2); // índice 0x105 → fila 05h, columna 01h
    const all = [...texts.values()];
    expect(all.some((t) => t.startsWith('FILA 05h'))).toBe(true);
    expect(all.some((t) => t.startsWith('COLUMNA 01h'))).toBe(true);
  });

  it('little_endian_visual_uses_real_bytes', () => {
    const { root, send } = harness('classic');
    send(0x2000, 0x000a, (a) => (a === 0x2000a ? 0x05 : 0));
    const lit = (bank: number) =>
      [0, 1, 2, 3, 4, 5, 6, 7].map((n) => {
        const lamp = root.getObjectByName(`bit-lamp-${bank}-${n}`) as T.Mesh;
        return ((lamp.material as T.MeshBasicMaterial).color.getHexString() === '7fe0b0') && lamp.visible;
      });
    // 0x05 = bits 0 and 2 in the even bank; the odd bank holds 00h.
    expect(lit(0)).toEqual([true, false, true, false, false, false, false, false]);
    expect(lit(1).some(Boolean)).toBe(false);
  });

  it('value_change_does_not_rebuild_memory_model', () => {
    const { send, count, parts } = harness('classic');
    send(0x2000, 0x000a, () => 1);
    const before = count();
    const chip = parts.get('dram-0-0');
    send(0x2000, 0x000a, () => 9);
    send(0x2000, 0x0010, () => 3);
    expect(count()).toBe(before);
    expect(parts.get('dram-0-0')).toBe(chip);
  });

  it('adder_ruler_writes_segment_times_16_plus_offset', () => {
    const { texts, send } = harness('classic');
    send(0x2000, 0x000a);
    expect([...texts.values()].some((t) => t.includes('2000h × 16 = 20000h') && t.includes('2000Ah'))).toBe(true);
  });

  it('dimm_lanes_show_the_eight_burst_bytes', () => {
    const { texts, send } = harness('dimm');
    send(0x2000, 0x000a, (a) => a & 0xff);
    const lanes = [...texts.values()].filter((t) => /^B[0-7] /.test(t));
    expect(lanes).toHaveLength(8);
    expect(lanes[2]).toContain('0A');
    expect(lanes[2]).toContain('◂');
  });

  it('dimm_layers_open_in_order', () => {
    const chips = explodedOffset('dimm-chip-3', 'memory', 0.5).z;
    const spd = explodedOffset('spd', 'memory', 0.5).z;
    expect(chips).toBeGreaterThan(0);
    expect(spd).toBeGreaterThan(chips);
    expect(explodedOffset('spd', 'memory', 0).z).toBe(0);
  });
});
