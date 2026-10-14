import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { ElectronicsWorkshop } from '../electronics-workshop';
import { StationBuilder } from './station-builder';
import { addressPin, drivenPins, SIGNAL_PINS } from './cpu-activity';
import { IDLE_ACTIVITY, type StationActivity } from '../../laboratory/station-activity';

function harness() {
  let listener: ((a: StationActivity) => void) | undefined;
  const texts = new Map<T.Object3D, string>();
  const tools = {
    track: <G>(r: G): G => r,
    material: (_id: string, color: string) => new T.MeshStandardMaterial({ color }),
    label: (_p: T.Object3D, text: string) => {
      const marker = new T.Object3D();
      texts.set(marker, text);
      return marker;
    },
    relabel: (l: T.Object3D, text: string) => {
      texts.set(l, text);
    },
    animate: () => {},
    onActivity: (fn: (a: StationActivity) => void) => {
      listener = fn;
      fn(IDLE_ACTIVITY);
    },
  };
  const root = new T.Group();
  const parts = new Map<string, T.Object3D>();
  new StationBuilder(tools).build('8086', 'classic', root, parts);
  root.updateMatrixWorld(true);
  return { root, parts, texts, send: (a: StationActivity) => listener!(a) };
}

const base: StationActivity = { ...IDLE_ACTIVITY, sessionId: 's' };

describe('animación del banco 8086', () => {
  it('address_pins_show_the_fetched_address', () => {
    const { root, send } = harness();
    const address = 0x2000a;
    send({ ...base, phase: 'fetch', address, ale: true, rd: true, blocks: ['biu', 'queue'] });
    const lit = new Set<number>();
    root.traverse((o) => {
      const m = /^pin-lamp-(\d+)$/.exec(o.name);
      if (m && o.visible) lit.add(Number(m[1]));
    });
    for (let bit = 0; bit < 20; bit++)
      expect(lit.has(addressPin(bit)), 'bit ' + bit).toBe(((address >>> bit) & 1) === 1);
    expect(lit.has(SIGNAL_PINS.ale)).toBe(true);
    expect(lit.has(SIGNAL_PINS.rd)).toBe(true);
    expect(lit.has(SIGNAL_PINS.wr)).toBe(false);
  });

  it('idle_lights_no_pin', () => {
    const { root, send } = harness();
    send({ ...base, phase: 'fetch', address: 0xffff, ale: true, blocks: ['biu'] });
    send(IDLE_ACTIVITY);
    const any = root.children.some((o) => /^pin-lamp-/.test(o.name) && o.visible);
    expect(any).toBe(false);
  });

  it('queue_holds_the_real_opcode_bytes', () => {
    const { parts, texts, send } = harness();
    send({ ...base, phase: 'fetch', bytes: [0xb8, 0x05, 0x00], address: 0x20000, ale: true, rd: true, blocks: ['queue'] });
    const slots = parts.get('queue')!.children.filter((c) => c.userData['label']);
    expect(slots).toHaveLength(6);
    const shown = slots.map((s) => texts.get(s.userData['label'] as T.Object3D));
    expect(shown).toEqual(['B8', '05', '00', '--', '--', '--']);
  });

  it('decode_names_the_instruction_on_the_control_block', () => {
    const { texts, send } = harness();
    send({ ...base, phase: 'decode', mnemonic: 'MOV AX,5', blocks: ['control'] });
    expect([...texts.values()]).toContain('MOV AX,5');
  });

  it('driven_pins_in_write_carry_the_data_word', () => {
    const pins = drivenPins({ ...base, phase: 'write', data: 0x0005, address: 0x20010, wr: true, ale: true });
    expect(pins.has(addressPin(0))).toBe(true);
    expect(pins.has(addressPin(2))).toBe(true);
    expect(pins.has(addressPin(1))).toBe(false);
    expect(pins.has(SIGNAL_PINS.wr)).toBe(true);
  });

  it('all_40_pads_have_a_bond_wire', () => {
    const tools = {
      track: <G>(r: G): G => r,
      material: () => new T.MeshStandardMaterial(),
      label: () => {},
      animate: () => {},
    };
    const root = new T.Group();
    new ElectronicsWorkshop(tools).cpu(root, new Map());
    for (let n = 1; n <= 40; n++) expect(root.getObjectByName('bond-wire-' + n), 'pad ' + n).toBeDefined();
  });

  it('support_chips_carry_their_historical_names', () => {
    const labels: string[] = [];
    const tools = {
      track: <G>(r: G): G => r,
      material: () => new T.MeshStandardMaterial(),
      label: (_p: T.Object3D, text: string) => {
        labels.push(text);
      },
      animate: () => {},
    };
    new ElectronicsWorkshop(tools).cpu(new T.Group(), new Map());
    expect(labels.some((l) => l.includes('8284'))).toBe(true);
    expect(labels.some((l) => l.includes('8282'))).toBe(true);
    expect(labels.some((l) => l.includes('8286'))).toBe(true);
    expect(labels.some((l) => l.includes('ilustrativo'))).toBe(true);
  });
});
