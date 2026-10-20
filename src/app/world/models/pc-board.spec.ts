import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { StationBuilder } from './station-builder';
import { PC_TOP, along, routeOf } from './pc-layout';
import { IDLE_ACTIVITY, type StationActivity } from '../../laboratory/station-activity';
import { pcSceneActivity, packetsOf } from '../../laboratory/pc-activity';
import { boot, run, stepPc, typeText, type PcEvent, type PcState } from '../../simulation/pc/pc-model';
import { freshPc } from '../../simulation/pc/pc-programs';

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
  const parts = new Map<string, T.Object3D>();
  new StationBuilder(tools).build('machine', 'classic', root, parts);
  let revision = 0;
  const show = (state: PcState, events: readonly PcEvent[], focus?: number) => {
    listener!({ ...IDLE_ACTIVITY, sessionId: 's', revision: ++revision, pc: pcSceneActivity(state, events, focus) });
    animators.forEach((fn) => fn(0));
  };
  return { root, parts, texts, show, animators };
}

const emissive = (root: T.Object3D, bus: string) => {
  const meshes: T.Mesh[] = [];
  root.traverse((o) => {
    if (o.name === 'bus-' + bus) meshes.push(o as T.Mesh);
  });
  expect(meshes.length, bus).toBeGreaterThan(0);
  return Math.max(...meshes.map((m) => (m.material as T.MeshStandardMaterial).emissiveIntensity));
};

const started = () => boot(freshPc('suma-archivo')).state;

describe('la máquina: el PC en el banco', () => {
  it('tiene todas las piezas del plan, con la caja que las cubre y los periféricos fuera', () => {
    const { parts } = harness();
    for (const id of ['lid', 'cpu', 'cpu-pc', 'cpu-ir', 'cpu-mar', 'cpu-mdr', 'cpu-regs', 'alu', 'control-unit', 'rom', 'ram', 'ssd', 'memory-controller', 'keyboard-controller', 'interrupt-controller', 'storage-controller', 'display-engine', 'keyboard', 'monitor'])
      expect(parts.has(id), id).toBe(true);
    const lid = parts.get('lid')!;
    expect(lid.userData['ghostMaterial']).toBeDefined();
    expect(lid.userData['restY']).toBeGreaterThan(PC_TOP);
    expect(parts.get('keyboard')!.position.z).toBeGreaterThan(3);
    expect(parts.get('monitor')!.position.z).toBeLessThan(-3);
  });

  it('en reposo ningún bus se ilumina y no hay paquetes', () => {
    const { root, show } = harness();
    show(freshPc('suma-archivo'), []);
    for (const bus of ['address', 'data', 'control']) expect(emissive(root, bus), bus).toBe(0);
    for (const bus of ['address', 'data', 'control']) expect(root.getObjectByName('packet-' + bus)!.visible).toBe(false);
  });

  it('las líneas encendidas y los paquetes son exactamente los del evento que se muestra (equivalencia 2D/3D)', () => {
    const { root, show } = harness();
    let state = started();
    for (let n = 0; n < 12; n++) {
      const out = stepPc(state);
      if (out.kind !== 'executed') break;
      state = out.state;
      show(state, out.events);
      // A frozen clock shows the last transfer of the step.
      const last = out.events.at(-1)!;
      const wanted = packetsOf(last);
      for (const bus of ['address', 'data', 'control'] as const) {
        const lit = emissive(root, bus) > 0;
        expect(lit, 'paso ' + n + ' ' + bus).toBe(wanted.some((p) => p.bus === bus));
        const packet = root.getObjectByName('packet-' + bus)!;
        expect(packet.visible).toBe(wanted.some((p) => p.bus === bus));
        const p = wanted.find((w) => w.bus === bus);
        if (p) {
          const end = along(routeOf(p.from, p.to, bus), 1);
          expect(packet.position.x).toBeCloseTo(end[0], 5);
          expect(packet.position.z).toBeCloseTo(end[1], 5);
        }
      }
    }
  });

  it('seguir una transferencia muestra solo esa: una lectura de RAM lleva dirección, dato y control', () => {
    const { root, show } = harness();
    let state = started();
    let events: PcEvent[] = [];
    // Run to the first LOAD of the program: its memory read has the three lines.
    for (let n = 0; n < 40; n++) {
      const out = stepPc(state);
      if (out.kind !== 'executed') break;
      state = out.state;
      events = out.events;
      if (events.some((e) => e.text.includes('RAM · entrada[') && e.bus.data !== undefined)) break;
    }
    const index = events.findIndex((e) => e.bus.data !== undefined && e.source === 'ram');
    expect(index).toBeGreaterThanOrEqual(0);
    show(state, events, index);
    expect(emissive(root, 'data')).toBeGreaterThan(0);
    expect(emissive(root, 'address')).toBeGreaterThan(0);
    const packets = packetsOf(events[index]);
    expect(packets.map((p) => p.bus).sort()).toEqual(['address', 'control', 'data']);
    expect(packets.find((p) => p.bus === 'data')).toMatchObject({ from: 'ram', to: 'cpu-mdr' });
    expect(packets.find((p) => p.bus === 'control')!.value).toBe('RD');
  });

  it('los registros muestran los valores del motor', () => {
    const { texts, show } = harness();
    let state = started();
    for (let n = 0; n < 6; n++) {
      const out = stepPc(state);
      if (out.kind === 'executed') {
        state = out.state;
        show(state, out.events);
      }
    }
    const all = [...texts.values()];
    expect(all).toContain(state.pc.toString(16).toUpperCase().padStart(4, '0') + 'h');
    expect(all).toContain((state.ir >>> 0).toString(16).toUpperCase().padStart(8, '0') + 'h');
    expect(all.some((t) => t.startsWith(state.regs.map((v) => v | 0).join(' ')))).toBe(true);
  });

  it('el monitor muestra la salida del modelo: texto, número y la imagen de 8×8', () => {
    const text = harness();
    const hola = run(typeText(boot(freshPc('hola-sondeo')).state, 'Hola\n')).state;
    text.show(hola, []);
    const rows = [...text.texts.values()].filter((v) => v.length);
    expect(rows.join(' ')).toContain('Hola');

    const image = harness();
    const done = run(boot(freshPc('imagen-inversa')).state).state;
    image.show(done, []);
    const pixels = image.root.getObjectByName('monitor-pixels') as T.InstancedMesh;
    expect(pixels.visible).toBe(true);
    const c = new T.Color();
    pixels.getColorAt(0, c);
    expect(c.r).toBeCloseTo(1, 2);
    pixels.getColorAt(63, c);
    expect(c.r).toBeCloseTo(0, 2);
    const off = harness();
    off.show(freshPc('imagen-inversa'), []);
    expect((off.root.getObjectByName('monitor-pixels') as T.Object3D).visible).toBe(false);
  });

  it('el resultado no depende de la animación: el estado del motor es el mismo con o sin ella', () => {
    const withScene = harness();
    let a = started();
    let b = started();
    for (let n = 0; n < 200; n++) {
      const oa = stepPc(a);
      const ob = stepPc(b);
      if (oa.kind !== 'executed' || ob.kind !== 'executed') break;
      a = oa.state;
      b = ob.state;
      withScene.show(a, oa.events);
    }
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('un evento de interrupción enciende la línea de control entre el teclado y la CPU', () => {
    const { root, show } = harness();
    let state = boot(freshPc('hola-interrupcion')).state;
    for (let n = 0; n < 12; n++) state = (stepPc(state) as { state: PcState }).state;
    state = typeText(state, 'x');
    const out = stepPc(state);
    expect(out.kind).toBe('executed');
    if (out.kind !== 'executed') return;
    show(out.state, out.events);
    expect(emissive(root, 'control')).toBeGreaterThan(0);
    const irq = out.events.at(-1)!;
    expect(irq.bus.control).toBe('interrupt');
    expect(packetsOf(irq)[0]).toMatchObject({ bus: 'control', from: 'interrupt-controller', to: 'cpu-pc', value: 'IRQ' });
  });
});
