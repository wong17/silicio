import { describe, expect, it } from 'vitest';
import { Cpu8086 } from '../cpu8086';

const run = (source: string, keys = '', limit = 5000) => {
  const cpu = new Cpu8086();
  cpu.load(source);
  if (keys) cpu.type(keys);
  let n = 0;
  while (!cpu.halted && n++ < limit) {
    const r = cpu.execute();
    if (r.kind === 'waiting-input' || r.kind === 'fault') return { cpu, result: r };
  }
  return { cpu, result: undefined };
};
const after = (source: string) => run(source + '\nHLT').cpu;

describe('semántica 8/16 bits', () => {
  it('AH, AL y AX comparten almacenamiento', () => {
    const cpu = after('MOV AX,1234h\nMOV AL,0FFh\nMOV BH,7\nMOV BL,BH\nMOV CH,AH');
    expect(cpu.registers.AX).toBe(0x12ff);
    expect(cpu.registers.BX).toBe(0x0707);
    expect(cpu.registers.CX).toBe(0x1200);
  });

  it('operaciones de 8 bits fijan CF/OF/ZF/SF con el ancho del byte', () => {
    const cpu = after('MOV AL,0FFh\nADD AL,1');
    expect(cpu.registers.AX & 255).toBe(0);
    expect(cpu.flags).toMatchObject({ CF: true, ZF: true, SF: false, OF: false });
    const o = after('MOV AL,7Fh\nADD AL,1');
    expect(o.flags).toMatchObject({ CF: false, OF: true, SF: true });
  });

  it('MUL de 8 y 16 bits', () => {
    const a = after('MOV AL,12\nMOV BL,11\nMUL BL');
    expect(a.registers.AX).toBe(132);
    expect(a.flags).toMatchObject({ CF: false, OF: false });
    const b = after('MOV AL,200\nMOV BL,2\nMUL BL');
    expect(b.registers.AX).toBe(400);
    expect(b.flags).toMatchObject({ CF: true, OF: true });
    const c = after('MOV AX,1000\nMOV CX,100\nMUL CX');
    expect([c.registers.DX, c.registers.AX]).toEqual([1, 0x86a0]);
    expect(c.flags.CF).toBe(true);
  });

  it('IMUL con signo', () => {
    const a = after('MOV AL,0FEh\nMOV BL,3\nIMUL BL');
    expect(a.registers.AX).toBe(0xfffa);
    expect(a.flags.CF).toBe(false);
    const b = after('MOV AX,-300\nMOV CX,200\nIMUL CX');
    expect([b.registers.DX, b.registers.AX]).toEqual([0xffff, 0x15a0 - 0]);
  });

  it('DIV de 8 y 16 bits: cociente y resto', () => {
    const a = after('MOV AX,100\nMOV BL,7\nDIV BL');
    expect(a.registers.AX & 255).toBe(14);
    expect(a.registers.AX >> 8).toBe(2);
    const b = after('MOV DX,1\nMOV AX,0\nMOV CX,10\nDIV CX');
    expect([b.registers.AX, b.registers.DX]).toEqual([6553, 6]);
  });

  it('IDIV con signo', () => {
    const a = after('MOV AX,-7\nMOV BL,2\nIDIV BL');
    expect(a.registers.AX & 255).toBe(0xfd);
    expect(a.registers.AX >> 8).toBe(0xff);
    const b = after('MOV AX,-100\nCWD\nMOV CX,7\nIDIV CX');
    expect([b.registers.AX, b.registers.DX]).toEqual([0xfff2, 0xfffe]);
  });

  it('DIV entre 0 o con cociente desbordado es un fallo que no modifica el estado', () => {
    for (const source of ['MOV AX,5\nMOV BL,0\nDIV BL', 'MOV AX,0FFFFh\nMOV BL,1\nDIV BL', 'MOV DX,5\nMOV AX,0\nMOV CX,2\nDIV CX']) {
      const cpu = new Cpu8086();
      cpu.load(source + '\nHLT');
      cpu.execute(); cpu.execute();
      if (source.includes('MOV CX')) cpu.execute();
      const before = cpu.snapshot();
      const r = cpu.execute();
      expect(r).toMatchObject({ kind: 'fault', reason: 'division' });
      expect(cpu.snapshot()).toEqual(before);
      expect(cpu.halted).toBe(false);
    }
  });

  it('AND, OR, XOR y TEST dejan CF=OF=0', () => {
    for (const op of ['AND', 'OR', 'XOR', 'TEST']) {
      const cpu = after('MOV AX,0FFFFh\nADD AX,1\n' + op + ' AX,0F0Fh');
      expect(cpu.flags.CF, op).toBe(false);
      expect(cpu.flags.OF, op).toBe(false);
    }
    expect(after('MOV AX,0F0Fh\nAND AX,0FF00h').registers.AX).toBe(0x0f00);
    expect(after('MOV AX,0F0Fh\nOR AX,0F0F0h').registers.AX).toBe(0xffff);
    expect(after('MOV AX,0FFh\nXOR AX,0F0h').registers.AX).toBe(0x0f);
    const t = after('MOV AL,5\nTEST AL,1');
    expect(t.registers.AX & 255).toBe(5);
    expect(t.flags.ZF).toBe(false);
  });

  it('NOT no toca flags y NEG sí', () => {
    const n = after('MOV AX,0F0F0h\nCMP AX,AX\nNOT AX');
    expect(n.registers.AX).toBe(0x0f0f);
    expect(n.flags.ZF).toBe(true);
    const g = after('MOV AX,5\nNEG AX');
    expect(g.registers.AX).toBe(0xfffb);
    expect(g.flags.CF).toBe(true);
    expect(after('MOV AX,0\nNEG AX').flags.CF).toBe(false);
  });

  it('SHL/SHR/SAR/ROL/ROR con 1 y con CL', () => {
    expect(after('MOV AX,3\nSHL AX,1').registers.AX).toBe(6);
    expect(after('MOV AX,1\nMOV CL,4\nSHL AX,CL').registers.AX).toBe(16);
    const r = after('MOV AX,5\nSHR AX,1');
    expect(r.registers.AX).toBe(2);
    expect(r.flags.CF).toBe(true);
    expect(after('MOV AX,0FFF0h\nSAR AX,1').registers.AX).toBe(0xfff8);
    expect(after('MOV AX,8001h\nROL AX,1').registers.AX).toBe(0x0003);
    expect(after('MOV AL,1\nROR AL,1').registers.AX & 255).toBe(0x80);
    expect(after('MOV AX,0FFFFh\nMOV CL,0\nSHL AX,CL').registers.AX).toBe(0xffff);
    const o = after('MOV AX,4000h\nSHL AX,1');
    expect(o.flags.OF).toBe(true);
  });

  it('ADC y SBB usan el acarreo', () => {
    const a = after('MOV AX,0FFFFh\nADD AX,1\nMOV BX,5\nADC BX,0');
    expect(a.registers.BX).toBe(6);
    const b = after('MOV AX,0\nSUB AX,1\nMOV BX,5\nSBB BX,0');
    expect(b.registers.BX).toBe(4);
  });

  it('CBW, CWD, XCHG y LEA', () => {
    expect(after('MOV AL,0FEh\nCBW').registers.AX).toBe(0xfffe);
    expect(after('MOV AX,8000h\nCWD').registers.DX).toBe(0xffff);
    expect(after('MOV AX,4000h\nCWD').registers.DX).toBe(0);
    const x = after('MOV AX,1\nMOV BX,2\nXCHG AX,BX');
    expect([x.registers.AX, x.registers.BX]).toEqual([2, 1]);
    const l = after('MOV BX,10h\nMOV SI,2\nLEA DI,[BX+SI+4]');
    expect(l.registers.DI).toBe(0x16);
    expect(l.trace.at(-2)!.reads).toEqual([]);
  });

  it('saltos con signo y sin signo', () => {
    const taken = (jump: string, setup: string) => {
      const cpu = after(setup + '\n' + jump + ' si\nMOV DX,1\nsi: NOP');
      return cpu.registers.DX === 0;
    };
    expect(taken('JA', 'MOV AX,5\nCMP AX,3')).toBe(true);
    expect(taken('JA', 'MOV AX,3\nCMP AX,5')).toBe(false);
    expect(taken('JB', 'MOV AX,3\nCMP AX,5')).toBe(true);
    expect(taken('JG', 'MOV AX,-1\nCMP AX,1')).toBe(false);
    expect(taken('JL', 'MOV AX,-1\nCMP AX,1')).toBe(true);
    expect(taken('JGE', 'MOV AX,2\nCMP AX,2')).toBe(true);
    expect(taken('JLE', 'MOV AX,2\nCMP AX,2')).toBe(true);
    expect(taken('JBE', 'MOV AX,2\nCMP AX,2')).toBe(true);
    expect(taken('JAE', 'MOV AX,1\nCMP AX,2')).toBe(false);
    expect(taken('JS', 'MOV AX,1\nSUB AX,2')).toBe(true);
    expect(taken('JNS', 'MOV AX,2\nSUB AX,1')).toBe(true);
    expect(taken('JO', 'MOV AX,7FFFh\nADD AX,1')).toBe(true);
    expect(taken('JNO', 'MOV AX,1\nADD AX,1')).toBe(true);
    expect(taken('JNZ', 'MOV AX,1\nCMP AX,2')).toBe(true);
  });

  it('memoria de byte y de palabra con registros de 8 bits', () => {
    const cpu = after('MOV BX,20h\nMOV BYTE PTR [BX],0AAh\nMOV AL,[BX]\nMOV WORD PTR [BX+2],1234h\nMOV AH,[BX+3]\nADD BYTE PTR [BX],1');
    expect(cpu.registers.AX).toBe(0x12aa);
    expect(cpu.memory[0x20020]).toBe(0xab);
    const store = cpu.trace[1];
    expect(store.writes).toEqual([0x20020]);
  });
});

describe('INT 20h/21h y Pantalla', () => {
  it('09h escribe hasta $, 02h un carácter y 4Ch termina', () => {
    const { cpu } = run("ORG 100h\nMOV DX,OFFSET m\nMOV AH,09h\nINT 21h\nMOV DL,'!'\nMOV AH,02h\nINT 21h\nMOV AH,4Ch\nINT 21h\nm DB 'Hola$'");
    expect(cpu.io.screen).toBe('Hola!');
    expect(cpu.halted).toBe(true);
    expect(cpu.execute()).toMatchObject({ kind: 'halted', reason: 'int21-4c' });
  });

  it('INT 20h termina el programa', () => {
    const { cpu } = run('INT 20h\nMOV AX,1');
    expect(cpu.halted).toBe(true);
    expect(cpu.registers.AX).toBe(7);
    expect(cpu.haltReason).toBe('int20');
  });

  it('01h con la cola vacía espera sin avanzar IP ni dejar rastro', () => {
    const cpu = new Cpu8086();
    cpu.load('MOV AH,01h\nINT 21h\nHLT');
    cpu.execute();
    const before = cpu.snapshot();
    const traceLength = cpu.trace.length;
    expect(cpu.execute()).toEqual({ kind: 'waiting-input', service: 0x01 });
    expect(cpu.snapshot()).toEqual(before);
    expect(cpu.trace).toHaveLength(traceLength);
    cpu.type('Z');
    expect(cpu.execute().kind).toBe('executed');
    expect(cpu.registers.AX & 255).toBe(90);
    expect(cpu.io.screen).toBe('Z');
    expect(cpu.io.keyboard).toEqual([]);
  });

  it('0Ah lee una línea con búfer y espera hasta recibir Enter', () => {
    const src = 'ORG 100h\nMOV DX,OFFSET buf\nMOV AH,0Ah\nINT 21h\nHLT\nbuf DB 6, 0, 6 DUP(0)';
    const cpu = new Cpu8086();
    cpu.load(src);
    cpu.type('abc');
    cpu.execute(); cpu.execute();
    expect(cpu.execute()).toEqual({ kind: 'waiting-input', service: 0x0a });
    cpu.type('\n');
    expect(cpu.execute().kind).toBe('executed');
    const buf = cpu.program!.data[0].address;
    const at = (n: number) => cpu.memory[0x10000 + buf + n];
    expect([at(1), at(2), at(3), at(4), at(5)]).toEqual([3, 97, 98, 99, 13]);
  });

  it('un servicio sin soporte se explica y no cambia el estado', () => {
    const cpu = new Cpu8086();
    cpu.load('MOV AH,30h\nINT 21h\nHLT');
    cpu.execute();
    const before = cpu.snapshot();
    expect(() => cpu.execute()).toThrow(/AH=30h.*subconjunto/);
    expect(cpu.snapshot()).toEqual(before);
  });

  it('la pantalla envuelve a 80 columnas, interpreta CR/LF y se desplaza a 25 filas', () => {
    const lines = Array.from({ length: 30 }, (_, n) => `MOV DL,'${String.fromCharCode(65 + (n % 26))}'\nMOV AH,02h\nINT 21h\nMOV DL,13\nINT 21h\nMOV DL,10\nINT 21h`).join('\n');
    const { cpu } = run(lines + '\nHLT');
    const rows = cpu.io.screen.split('\n');
    expect(rows).toHaveLength(25);
    expect(rows[0]).toBe('G');
    expect(cpu.io.cursor).toBe(24 * 80);
  });
});
