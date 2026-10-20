import { describe, expect, it } from 'vitest';
import { Cpu8086 } from '../simulation/cpu8086';
import { COURSE_PHASES, presentStep } from './step-presentation';

const ids = { sessionId: '8086-1', revision: 0 };
const traces = (source: string, keys = '') => {
  const cpu = new Cpu8086();
  cpu.load(source);
  if (keys) cpu.type(keys);
  let n = 0;
  while (!cpu.halted && n++ < 500) if (cpu.execute().kind === 'waiting-input') break;
  return { cpu, trace: cpu.trace };
};

describe('presentación de un paso', () => {
  it('describe la suma con valores reales y deja la memoria intacta', () => {
    const { trace } = traces('ADD AX, [10]\nHLT');
    const p = presentStep(trace[0], ids);
    expect(p.explanation).toBe('ADD AX, [10] toma 5 de memoria, lo suma a AX=7 y deja AX=12. La memoria no cambia.');
    expect(p.changes.find((c) => c.label === 'AX')).toEqual({ label: 'AX', before: '0007h', after: '000Ch' });
    expect(p.changes.some((c) => c.label.startsWith('Memoria'))).toBe(false);
  });

  it('ofrece exactamente las siete fases del curso, en orden, con texto', () => {
    const { trace } = traces('ADD AX, [10]\nHLT');
    const p = presentStep(trace[0], ids);
    expect(p.phases.map((f) => f.id)).toEqual(COURSE_PHASES.map((f) => f.id));
    expect(p.phases.map((f) => f.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(p.phases.slice(0, 3).every((f) => f.group === 'Búsqueda')).toBe(true);
    expect(p.phases.slice(3).every((f) => f.group === 'Ejecución')).toBe(true);
    expect(p.phases.every((f) => f.text.length > 10)).toBe(true);
    expect(p.phases[0].text).toContain('10100h');
    expect(p.phases[1].text).toContain('0100h a 0104h');
  });

  it('un solo evento por instrucción y la proyección termina en el estado confirmado', () => {
    const { trace } = traces('ADD AX, [10]\nHLT');
    const p = presentStep(trace[0], ids);
    expect(p.event.id).toBe('8086-1:0');
    expect(p.event.kind).toBe('instruction');
    expect(p.event.bytes).toEqual([3, 6, 10, 0]);
    expect(p.projection(0)).toEqual(trace[0].before);
    expect(p.projection(6)).toBe(trace[0].after);
    // IP moves on in step 2; the result shows up only when it is stored (step 6).
    expect(p.projection(1).registers.IP).toBe(0x104);
    expect(p.projection(4).registers.AX).toBe(7);
    expect(p.projection(5).registers.AX).toBe(12);
  });

  it('la lectura de datos se explica antes de la operación y se distingue de la búsqueda de código', () => {
    const { trace } = traces('ADD AX, [10]\nHLT');
    const p = presentStep(trace[0], ids);
    const operands = p.phases[3];
    const run = p.phases[4];
    expect(operands.number).toBeLessThan(run.number);
    expect(operands.text).toContain('0005h de 2000Ah');
    expect(operands.text).toContain('Lectura de datos');
    expect(run.text).toContain('0007h y 0005h → 000Ch');
    expect(p.phases[0].text).not.toContain('2000Ah');
  });

  it('un salto no inventa una escritura y explica la condición', () => {
    const { trace } = traces('MOV AX,7\nCMP AX,7\nJZ fin\nMOV BX,1\nfin: HLT');
    const jump = presentStep(trace[2], ids);
    expect(jump.explanation).toContain('salta');
    expect(jump.explanation).toContain('ZF=1');
    expect(jump.changes.map((c) => c.label)).toEqual(['IP']);
    expect(jump.phases[5].text).toBe('Solo cambia IP.');
    expect(jump.event.role).toBe('control');
    expect(jump.projection(4).registers.IP).toBe(trace[2].before.registers.IP + 2);
    expect(jump.projection(5).registers.IP).toBe(trace[2].after.registers.IP);
    const cmp = presentStep(trace[1], ids);
    expect(cmp.phases[5].text).toContain('No guarda');
  });

  it('CALL y RET muestran la dirección de retorno y recuperan SP', () => {
    const { trace } = traces('MOV AX,5\nCALL doble\nMOV BX,AX\nHLT\ndoble: ADD AX,AX\nRET');
    const call = presentStep(trace[1], ids);
    expect(call.explanation).toContain('apila la dirección de retorno 0106h');
    expect(call.changes.find((c) => c.label === 'SP')).toEqual({ label: 'SP', before: 'FFFEh', after: 'FFFCh' });
    const ret = presentStep(trace[3], ids);
    expect(ret.explanation).toContain('SP queda en FFFEh');
    expect(ret.changes.find((c) => c.label === 'SP')).toEqual({ label: 'SP', before: 'FFFCh', after: 'FFFEh' });
  });

  it('INT 21h: escribe en Pantalla y se clasifica como salida; leer una tecla como entrada', () => {
    const out = traces("MOV DL,'Z'\nMOV AH,02h\nINT 21h\nHLT").trace;
    const p = presentStep(out[2], ids);
    expect(p.event.kind).toBe('output');
    expect(p.explanation).toContain('«Z»');
    expect(p.changes.find((c) => c.label === 'Pantalla')).toBeDefined();
    expect(p.phases[6].text).toContain('0000:0084h');
    const read = traces('MOV AH,01h\nINT 21h\nHLT', 'q').trace;
    const q = presentStep(read[1], ids);
    expect(q.event.kind).toBe('input');
    expect(q.explanation).toContain('«q»');
  });

  it('MUL y DIV se explican con las mitades de AX', () => {
    const t = traces('MOV AL,12\nMOV BL,11\nMUL BL\nMOV BL,7\nDIV BL\nHLT').trace;
    expect(presentStep(t[2], ids).explanation).toBe('MUL BL multiplica AL=12 por 11 y deja AX=132.');
    expect(presentStep(t[4], ids).explanation).toBe('DIV BL divide AX=132 entre 7: cociente AL=18, resto AH=6.');
  });

  it('una escritura en memoria aparece como cambio antes → después y la instrucción es de almacenamiento', () => {
    const t = traces('MOV BX,20h\nMOV AX,1234h\nMOV [BX],AX\nHLT').trace;
    const p = presentStep(t[2], ids);
    expect(p.event.role).toBe('storage');
    expect(p.changes.filter((c) => c.label.startsWith('Memoria'))).toHaveLength(1);
    expect(p.phases[5].text).toContain('Memoria 20020h');
  });
});
