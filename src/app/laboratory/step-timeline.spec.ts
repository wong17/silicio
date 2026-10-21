import { describe, expect, it } from 'vitest';
import { Cpu8086 } from '../simulation/cpu8086';
import { boot, stepPc, typeText } from '../simulation/pc/pc-model';
import { freshPc } from '../simulation/pc/pc-programs';
import { COURSE_PHASES, presentStep } from './step-presentation';
import { timeline8086, timelinePc, type StepTimeline } from './step-timeline';

const ids = { sessionId: '8086-1', revision: 0 };
const firstTrace = (source: string) => {
  const cpu = new Cpu8086();
  cpu.load(source);
  cpu.execute();
  return cpu.trace[0];
};
const cell = (t: StepTimeline, card: number, name: string) =>
  [...t.cards[card].state.registers, ...t.cards[card].state.flags].find((c) => c.name === name)!;

describe('línea de tiempo del 8086', () => {
  const trace = firstTrace('ADD AX, [10]\nHLT');
  const timeline = timeline8086(presentStep(trace, ids), 'Instrucción 1');

  it('tiene una tarjeta por cada fase del curso, con su número y grupo', () => {
    expect(timeline.cards.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(timeline.cards.map((c) => c.title)).toEqual(COURSE_PHASES.map((p) => p.title));
    expect(timeline.cards.slice(0, 3).every((c) => c.group === 'Búsqueda')).toBe(true);
    expect(timeline.cards.slice(3).every((c) => c.group === 'Ejecución')).toBe(true);
  });

  it('cada cambio aparece en la tarjeta de su fase: IP en la 2, AX al guardar', () => {
    expect(timeline.cards[0].changes).toEqual([]);
    expect(timeline.cards[1].changes).toEqual([{ label: 'IP', before: '0100h', after: '0104h' }]);
    expect(timeline.cards[4].changes).toEqual([]);
    expect(timeline.cards[5].changes).toContainEqual({ label: 'AX', before: '0007h', after: '000Ch' });
  });

  it('el estado de cada tarjeta es el de ese instante: AX vale 7 hasta guardar el resultado', () => {
    expect(cell(timeline, 3, 'AX')).toMatchObject({ value: '0007h', changed: false });
    expect(cell(timeline, 5, 'AX')).toMatchObject({ value: '000Ch', changed: true });
    expect(cell(timeline, 0, 'IP').value).toBe('0100h');
    expect(cell(timeline, 1, 'IP')).toMatchObject({ value: '0104h', changed: true });
  });

  it('muestra las mitades AH|AL y suma exactamente los cambios del paso', () => {
    expect(timeline.cards[5].state.registers.find((c) => c.name === 'AX')!.parts).toEqual({ high: '00', low: '0C' });
    const labels = timeline.cards.flatMap((c) => c.changes.map((x) => x.label)).sort();
    expect(labels).toEqual(presentStep(trace, ids).changes.map((c) => c.label).sort());
  });

  it('lleva la frase del paso y las piezas de cada fase para la escena', () => {
    expect(timeline.title).toBe('Instrucción 1');
    expect(timeline.summary).toBe('ADD AX, [10] toma 5 de memoria, lo suma a AX=7 y deja AX=12. La memoria no cambia.');
    expect(timeline.cards[4].pieces).toEqual(['alu']);
  });
});

describe('línea de tiempo del PC', () => {
  const before = boot(freshPc('hola-sondeo')).state;
  const out = stepPc(before);
  if (out.kind !== 'executed') throw Error('el paso de prueba debía ejecutarse');
  const timeline = timelinePc(before, out.state, out.events, 'Paso 1');

  it('crea una tarjeta por evento, con el número de fase del evento', () => {
    expect(timeline.cards).toHaveLength(out.events.length);
    expect(timeline.cards.map((c) => c.number)).toEqual(out.events.map((e) => e.phase));
    expect(timeline.cards.every((c) => c.role !== undefined)).toBe(true);
  });

  it('conserva los cambios y los paquetes del bus de cada evento', () => {
    expect(timeline.cards.map((c) => c.changes)).toEqual(out.events.map((e) => e.changes));
    const first = timeline.cards[0];
    expect(first.packets.map((p) => p.bus)).toContain('address');
    expect(first.route?.label).toBe('PC a MAR');
  });

  it('MAR cambia en la primera tarjeta y IR solo cuando llega la instrucción', () => {
    const mar = (n: number) => cell(timeline, n, 'MAR');
    expect(mar(0).changed).toBe(true);
    expect(mar(0).value).toBe((out.events[0].address! >>> 0).toString(16).toUpperCase().padStart(4, '0') + 'h');
    expect(cell(timeline, 0, 'IR').changed).toBe(false);
    expect(cell(timeline, 0, 'IR').value).toBe((before.ir >>> 0).toString(16).toUpperCase().padStart(8, '0') + 'h');
    expect(cell(timeline, 2, 'IR').changed).toBe(true);
  });

  it('la última tarjeta coincide con el estado confirmado del motor', () => {
    const last = timeline.cards.length - 1;
    expect(cell(timeline, last, 'PC').value).toBe((out.state.pc >>> 0).toString(16).toUpperCase().padStart(4, '0') + 'h');
    expect(cell(timeline, last, 'IR').value).toBe((out.state.ir >>> 0).toString(16).toUpperCase().padStart(8, '0') + 'h');
    out.state.regs.forEach((v, i) => expect(cell(timeline, last, 'R' + i).value).toBe(String(v | 0)));
  });

  it('el encendido tiene su tarjeta de arranque', () => {
    const off = freshPc('hola-sondeo');
    const on = boot(off).state;
    const t = timelinePc(off, on, [{ phase: 0, role: 'control', source: 'power', target: 'cpu', bus: {}, text: 'Al encender…', changes: [] }], 'Encender');
    expect(t.cards[0].group).toBe('Arranque');
    expect(t.cards[0].title).toBe('Encender');
  });

  it('la tarjeta del monitor muestra la salida nueva y las anteriores aún no', () => {
    let s = boot(freshPc('hola-sondeo')).state;
    s = typeText(s, 'Hola\n');
    let found: StepTimeline | undefined;
    for (let n = 0; n < 400 && !found; n++) {
      const prev = s;
      const o = stepPc(s);
      if (o.kind !== 'executed') break;
      s = o.state;
      if (o.events.some((e) => e.target === 'monitor')) found = timelinePc(prev, s, o.events, 'Paso');
    }
    expect(found).toBeDefined();
    const at = found!.cards.findIndex((c) => c.pieces.includes('monitor'));
    expect(found!.cards[at].state.screen).toMatch(/^H/);
    expect(found!.cards[0].state.screen.length).toBeLessThan(found!.cards[at].state.screen.length);
  });
});
