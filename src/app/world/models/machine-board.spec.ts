import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { StationBuilder } from './station-builder';
import { busPath, BUS_ROUTES, pointAlong } from './machine-board.model';
import { MachineExperiment, machineActivity } from '../../instruments/machine-experiment';
import { IDLE_ACTIVITY, type StationActivity } from '../../laboratory/station-activity';

function harness() {
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
      fn(IDLE_ACTIVITY);
    },
  };
  const root = new T.Group();
  new StationBuilder(tools).build('machine', 'classic', root, new Map());
  const m = new MachineExperiment();
  const send = () => {
    listener!({ ...IDLE_ACTIVITY, sessionId: 's', revision: m.stage, machine: machineActivity(m) });
    animators.forEach((fn) => fn(0));
  };
  return { root, m, texts, send };
}

const emissiveOf = (root: T.Object3D, bus: string) => {
  const meshes: T.Mesh[] = [];
  root.traverse((o) => {
    if (o.name === 'bus-' + bus) meshes.push(o as T.Mesh);
  });
  expect(meshes.length, bus).toBeGreaterThan(0);
  return Math.max(...meshes.map((m) => (m.material as T.MeshStandardMaterial).emissiveIntensity));
};

describe('la máquina: buses', () => {
  it('only_the_active_bus_lights', () => {
    const { root, m, send } = harness();
    send();
    for (const bus of Object.keys(BUS_ROUTES)) expect(emissiveOf(root, bus)).toBe(0);
    m.advance(); // seleccionar dirección
    send();
    expect(emissiveOf(root, 'address')).toBeGreaterThan(0);
    expect(emissiveOf(root, 'data')).toBe(0);
    expect(emissiveOf(root, 'control')).toBe(0);
    m.advance();
    m.advance(); // RAM → CPU por datos
    send();
    expect(emissiveOf(root, 'data')).toBeGreaterThan(0);
    expect(emissiveOf(root, 'address')).toBe(0);
  });

  it('idle_machine_has_every_bus_dark_and_no_packet', () => {
    const { root, send } = harness();
    send();
    const packets = ['address', 'data', 'control'].map((b) => root.getObjectByName('packet-' + b)!);
    expect(packets.every((p) => !p.visible)).toBe(true);
  });

  it('chip_displays_match_the_experiment', () => {
    const { m, texts, send } = harness();
    for (let i = 0; i < 4; i++) m.advance();
    send();
    const all = [...texts.values()];
    expect(all).toContain('ALU 0007h + 5 = 000Ch');
    expect(all).toContain('0000:0007h  0001:0000h');
    m.advance();
    m.advance();
    m.advance();
    m.advance();
    send();
    expect(m.output).toBe(12);
    expect([...texts.values()]).toContain('SALIDA 000Ch');
  });

  it('the_packet_runs_along_the_real_route_in_the_right_direction', () => {
    const { root, m, send } = harness();
    for (let i = 0; i < 3; i++) m.advance(); // RAM → CPU
    send();
    const packet = root.getObjectByName('packet-data')!;
    const path = busPath('data', 1);
    // The frozen clock puts the packet at the end of its run; a value read from RAM ends at the processor.
    expect(packet.position.x).toBeCloseTo(path[0][0], 5);
    expect(packet.position.z).toBeCloseTo(path[0][1], 5);
  });

  it('routes_are_orthogonal', () => {
    for (const bus of Object.keys(BUS_ROUTES) as (keyof typeof BUS_ROUTES)[])
      for (let lane = 0; lane < 3; lane++) {
        const p = busPath(bus, lane);
        for (let i = 0; i < p.length - 1; i++)
          expect(p[i][0] === p[i + 1][0] || p[i][1] === p[i + 1][1], `${bus} segment ${i}`).toBe(true);
      }
    expect(pointAlong([[0, 0], [2, 0], [2, 2]], 0.5)).toEqual([2, 0]);
  });
});
