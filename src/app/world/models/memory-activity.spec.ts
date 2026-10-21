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
  const sendWithStack = (segment: number, offset: number, stack: { segment: number; pointer: number }) => {
    listener!({ ...IDLE_ACTIVITY, sessionId: 's', revision: stack.pointer, phase: 'execute', memory: projectMemory(segment, offset, () => 0, stack) });
    animators.forEach((fn) => fn(0));
  };
  const sendWithCache = (last?: { index: number; hit: boolean }) => {
    listener!({
      ...IDLE_ACTIVITY,
      sessionId: 's',
      revision: 1,
      phase: 'execute',
      memory: { ...projectMemory(0x2000, 0x000a, () => 0), cache: { lines: 8, last } },
    });
    animators.forEach((fn) => fn(0));
  };
  const count = () => {
    let n = 0;
    root.traverse(() => n++);
    return n;
  };
  return { root, parts, texts, send, sendWithStack, sendWithCache, count };
}

describe('memoria: animación de la placa y el módulo', () => {
  it('row_and_column_address_the_selected_cell', () => {
    const { texts, send } = harness('classic');
    send(0x2000, 0x0005 * 2 + 0x100 * 2); // índice 0x105 a fila 05h, columna 01h
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

describe('memoria: marca de la pila', () => {
  it('sp_marker_follows_the_stack_pointer', () => {
    const h = harness('classic');
    const { texts } = h;
    const listenerSend = (sp: number) => {
      // The harness helper reads the default stack; build the activity with the pointer under test.
      h.sendWithStack(0x2000, 0x000a, { segment: 0x3000, pointer: sp });
    };
    listenerSend(0xfffe);
    expect([...texts.values()].some((t) => t.includes('3000:FFFE') && t.includes('3FFFEh'))).toBe(true);
    listenerSend(0xfffc);
    expect([...texts.values()].some((t) => t.includes('3000:FFFC') && t.includes('3FFFCh'))).toBe(true);
  });
});

describe('memoria: ranuras de la caché', () => {
  it('last_read_lights_its_line_green_or_amber', () => {
    const h = harness('classic');
    const slot = (i: number) => h.root.getObjectByName('cache-line-' + i) as T.Mesh;
    const color = (i: number) => (slot(i).material as T.MeshStandardMaterial).emissive.getHexString();
    const send = (last?: { index: number; hit: boolean }) => {
      h.sendWithCache(last);
    };
    send({ index: 4, hit: false });
    expect(color(4)).toBe('d9922b');
    send({ index: 4, hit: true });
    expect(color(4)).toBe('2f9e5a');
    expect(color(3)).toBe('000000');
    send(undefined);
    expect(color(4)).toBe('000000');
  });
});
