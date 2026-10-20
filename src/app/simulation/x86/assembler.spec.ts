import { describe, expect, it } from 'vitest';
import { assemble } from './assembler';
import { decode } from './decoder';
import { formatOperand, physicalAddress } from './types';

const bytesOf = (line: string, prefix = '') =>
  assemble(prefix + line + '\nHLT').instructions[0].bytes;
const hexOf = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');

describe('codificación del 8086 real', () => {
  it.each([
    ['MOV AH,09h', 'b4 09'],
    ['INT 21h', 'cd 21'],
    ['INT 20h', 'cd 20'],
    ['MUL BL', 'f6 e3'],
    ['DIV CX', 'f7 f1'],
    ['ADD [10],AX', '01 06 0a 00'],
    ['ADD AX,[10]', '03 06 0a 00'],
    ['MOV AL,[BX+SI+4]', '8a 40 04'],
    ['MOV BYTE PTR [BX],5', 'c6 07 05'],
    ['MOV WORD PTR [BX],5', 'c7 07 05 00'],
    ['AND AX,0FF00h', '81 e0 00 ff'],
    ['OR BL,80h', '80 cb 80'],
    ['XOR AX,AX', '33 c0'],
    ['SHL AX,1', 'd1 e0'],
    ['SHR BL,CL', 'd2 eb'],
    ['SAR AX,1', 'd1 f8'],
    ['ROL AL,1', 'd0 c0'],
    ['NEG AX', 'f7 d8'],
    ['NOT BL', 'f6 d3'],
    ['IDIV BX', 'f7 fb'],
    ['IMUL CL', 'f6 e9'],
    ['CBW', '98'],
    ['CWD', '99'],
    ['XCHG AX,BX', '87 c3'],
    ['LEA SI,[BX+4]', '8d 77 04'],
    ['TEST AL,1', 'f6 c0 01'],
    ['INC BL', 'fe c3'],
    ['DEC BYTE PTR [SI]', 'fe 0c'],
    ['MOV DS,AX', '8e d8'],
    ['MOV AX,DS', '8c d8'],
    ['ADC AX,BX', '13 c3'],
    ['SBB AL,BL', '1a c3'],
  ])('%s → %s', (source, expected) => {
    expect(hexOf(bytesOf(source))).toBe(expected);
  });

  it('MOV DX,OFFSET msg codifica la dirección de msg', () => {
    const program = assemble('ORG 100h\nMOV DX,OFFSET msg\nHLT\nmsg DB 5');
    const msg = program.data.find((d) => d.name === 'msg')!;
    expect(msg.address).toBe(0x104);
    expect(program.instructions[0].bytes).toEqual([0xba, 0x04, 0x01]);
  });

  it('un Jcc fuera de −128…127 es un error y uno dentro se codifica', () => {
    expect(() => assemble('JG lejos\n' + Array(130).fill('NOP').join('\n') + '\nlejos: HLT')).toThrow('fuera de rango');
    const p = assemble('CMP AX,1\nJG fin\nNOP\nfin: HLT').instructions;
    expect(p[1].bytes).toEqual([0x7f, 0x01]);
  });

  it('los alias de salto usan el mismo opcode', () => {
    for (const [alias, byte] of [['JE', 0x74], ['JNE', 0x75], ['JC', 0x72], ['JNC', 0x73], ['JA', 0x77], ['JBE', 0x76], ['JGE', 0x7d], ['JL', 0x7c], ['JLE', 0x7e], ['JS', 0x78], ['JNS', 0x79], ['JO', 0x70], ['JNO', 0x71]] as const)
      expect(assemble(alias + ' x\nx: HLT').instructions[0].bytes[0], alias).toBe(byte);
  });

  it('rechaza lo que está fuera del subconjunto con la línea', () => {
    for (const bad of ['MOVSB', 'REP MOVSB', 'MOV AX,ES:[BX]', 'INT 10h', 'FLD x', 'JMP FAR x', 'INCLUDE \'emu8086.inc\'', 'SHL AX,2', 'MOV [BX],[SI]', 'MOV AL,AX', 'MOV [BX],5'])
      expect(() => assemble('NOP\n' + bad + '\nHLT'), bad).toThrow(/^Línea 2:/);
  });

  it('INCLUDE sugiere INT 21h/09h o una macro', () => {
    expect(() => assemble("INCLUDE 'emu8086.inc'\nHLT")).toThrow(/INT 21h servicio 09h/);
  });
});

describe('ida y vuelta: assemble → bytes → decode', () => {
  const samples = [
    'MOV AX,BX', 'MOV AL,BL', 'MOV AH,12h', 'MOV CX,1234h', 'MOV [BX+SI+4],DX', 'MOV BYTE PTR [10],7', 'MOV WORD PTR [BP+2],300',
    'MOV DS,AX', 'MOV AX,ES', 'XCHG BL,CL', 'LEA DI,[BP+SI]', 'PUSH AX', 'POP DX',
    'ADD AX,BX', 'ADD [10],AX', 'ADD AL,[BX]', 'ADC BX,CX', 'SUB CL,5', 'SBB AX,1', 'CMP AX,[SI]', 'CMP BYTE PTR [DI],3',
    'AND AX,0F0Fh', 'OR AL,CL', 'XOR [BX],AX', 'TEST AX,8000h', 'TEST AL,BL',
    'INC AX', 'INC BL', 'DEC WORD PTR [BX]', 'NEG BX', 'NOT AL', 'MUL BL', 'MUL CX', 'IMUL WORD PTR [SI]', 'DIV CL', 'DIV CX', 'IDIV BX',
    'CBW', 'CWD', 'SHL AX,1', 'SHL BL,CL', 'SHR AX,CL', 'SAR BX,1', 'ROL AL,1', 'ROR WORD PTR [BX],CL',
    'INT 21h', 'INT 20h', 'NOP', 'HLT', 'RET',
  ];
  it.each(samples)('%s', (source) => {
    const program = assemble(source + '\nHLT');
    const first = program.instructions[0];
    const memory: Record<number, number> = {};
    program.instructions.forEach((i) => i.bytes.forEach((b, n) => (memory[physicalAddress(0x1000, i.address + n)] = b)));
    const back = decode(memory, 0x1000, first.address);
    expect(back.bytes).toEqual(first.bytes);
    expect(back.op).toBe(first.op);
    expect(back.operands.map(formatOperand)).toEqual(first.operands.map(formatOperand));
  });

  it('los saltos conservan el destino', () => {
    const program = assemble('JMP a\nCALL a\nJZ a\nLOOP a\na: HLT');
    const memory: Record<number, number> = {};
    program.instructions.forEach((i) => i.bytes.forEach((b, n) => (memory[physicalAddress(0x1000, i.address + n)] = b)));
    for (const i of program.instructions.slice(0, 4)) {
      const back = decode(memory, 0x1000, i.address);
      expect(back.op).toBe(i.op);
      expect(back.target).toBe(i.target);
    }
  });
});

describe('directivas y macros', () => {
  it('DB, DW, DUP, EQU, cadenas con $ y OFFSET', () => {
    const p = assemble(`ORG 100h
N EQU 3
JMP inicio
a DB 1, 2, 'AB', 0Ah
b DW 1234h, N
c DB 4 DUP(7)
d DB 2 DUP(1, 2)
e DW ?
s DB 'Hola$'
inicio: MOV AX, OFFSET b
HLT`);
    const find = (n: string) => p.data.find((d) => d.name === n)!;
    expect(find('a')).toMatchObject({ type: 'byte', length: 5, address: 0x103 });
    expect(find('b')).toMatchObject({ type: 'word', length: 2 });
    expect(find('c').length).toBe(4);
    expect(find('d').length).toBe(4);
    expect(find('s').length).toBe(5);
    const bytes = (n: string) => p.blocks.find((b) => b.address === find(n).address)!.bytes;
    expect(bytes('a')).toEqual([1, 2, 65, 66, 10]);
    expect(bytes('b')).toEqual([0x34, 0x12, 3, 0]);
    expect(bytes('c')).toEqual([7, 7, 7, 7]);
    expect(bytes('d')).toEqual([1, 2, 1, 2]);
    expect(bytes('e')).toEqual([0, 0]);
    expect(bytes('s')).toEqual([72, 111, 108, 97, 36]);
    expect(p.instructions[1].bytes).toEqual([0xb8, find('b').address & 255, find('b').address >> 8]);
  });

  it('literales decimales, hex (h y 0x), binarios y de carácter', () => {
    const p = assemble("MOV AL,'A'\nMOV BL,101b\nMOV CL,0x1F\nMOV DL,0FFh\nMOV AH,255\nHLT").instructions;
    expect(p.map((i) => i.bytes[1])).toEqual([65, 5, 31, 255, 255, undefined]);
  });

  it('PROC/ENDP, END y plantilla EXE con @DATA', () => {
    const p = assemble(`.MODEL SMALL
.STACK 100h
.DATA
msg DB 'Hola$'
n DW 7
.CODE
main PROC
  MOV AX, @DATA
  MOV DS, AX
  MOV DX, OFFSET msg
  MOV AH, 09h
  INT 21h
  MOV AH, 4Ch
  INT 21h
main ENDP
END main`);
    expect(p.instructions[0].bytes).toEqual([0xb8, 0x00, 0x20]);
    expect(p.data.find((d) => d.name === 'n')).toMatchObject({ address: 5, type: 'word' });
    expect(p.blocks.every((b) => b.segment === 'data')).toBe(true);
    expect(p.dataSegment).toBeUndefined();
    expect(p.entry).toBe(0x100);
  });

  it('una variable usada antes de declararse se resuelve', () => {
    const p = assemble('ORG 100h\nMOV total, AX\nHLT\ntotal DW 0');
    const t = p.data[0];
    expect(p.instructions[0].bytes).toEqual([0x89, 0x06, t.address & 255, t.address >> 8]);
  });

  it('MACRO con parámetros y LOCAL: dos expansiones no repiten etiquetas', () => {
    const src = `ORG 100h
esperar MACRO n
LOCAL otra
  MOV CX, n
otra:
  LOOP otra
ENDM
esperar 3
esperar 5
HLT`;
    const p = assemble(src);
    expect(p.macroExpansions).toHaveLength(2);
    expect(p.macroExpansions[0].line).toBe(8);
    expect(p.macroExpansions[0].expanded).toHaveLength(3);
    expect(p.instructions.map((i) => i.op)).toEqual(['MOV', 'LOOP', 'MOV', 'LOOP', 'HLT']);
    expect(p.instructions[1].target).toBe(p.instructions[1].address);
    expect(p.instructions[3].target).toBe(p.instructions[3].address);
    expect(p.instructions[0].bytes).toEqual([0xb9, 3, 0]);
    expect(p.instructions[2].bytes).toEqual([0xb9, 5, 0]);
  });

  it('errores de directivas llevan su línea', () => {
    expect(() => assemble('HLT\nx DB 300')).toThrow(/^Línea 2:/);
    expect(() => assemble('a MACRO\nNOP')).toThrow(/ENDM/);
    expect(() => assemble('NOP\nx DB 1\nx DB 2\nHLT')).toThrow('duplicado');
    expect(() => assemble('MOV AX, nada\nHLT')).toThrow('Símbolo no definido');
  });
});
