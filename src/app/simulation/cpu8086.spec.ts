import { describe, it, expect } from 'vitest';
import { Cpu8086, assemble, physicalAddress } from './cpu8086';
describe('CPU 8086 / semántica arquitectónica', () => {
  it('codifica ADD AX,[10] y conserva memoria al leer una palabra', () => {
    const cpu = new Cpu8086(); cpu.load('ADD AX,[10]\nHLT');
    expect(cpu.instructions.flatMap(i => i.bytes)).toEqual([3,6,10,0,244]);
    const t = cpu.step()!;
    expect(cpu.registers.AX).toBe(12); expect(cpu.registers.IP).toBe(0x104);
    expect(t.reads).toEqual([0x2000a]); expect(t.writes).toEqual([]);
    expect(cpu.readWord(0x2000,10)).toBe(5);
    expect(cpu.flags).toEqual({ CF:false, PF:true, AF:false, ZF:false, SF:false, OF:false });
  });
  it('distingue acarreo sin signo y overflow con signo', () => {
    const cpu = new Cpu8086(); cpu.load('MOV AX,0FFFFh\nADD AX,1\nHLT'); cpu.step(); cpu.step();
    expect(cpu.registers.AX).toBe(0); expect(cpu.flags.CF).toBe(true); expect(cpu.flags.OF).toBe(false); expect(cpu.flags.AF).toBe(true); expect(cpu.flags.ZF).toBe(true);
    cpu.load('MOV AX,07FFFh\nADD AX,1'); cpu.step(); cpu.step();
    expect(cpu.registers.AX).toBe(0x8000); expect(cpu.flags.OF).toBe(true); expect(cpu.flags.CF).toBe(false); expect(cpu.flags.SF).toBe(true);
  });
  it('mantiene CF en INC y DEC', () => {
    const cpu = new Cpu8086(); cpu.load('MOV AX,0FFFFh\nADD AX,1\nINC AX\nDEC AX');
    for(let n=0;n<4;n++) cpu.step();
    expect(cpu.registers.AX).toBe(0); expect(cpu.flags.CF).toBe(true); expect(cpu.flags.ZF).toBe(true);
  });
  it('CMP conserva el operando y dirige JZ al comienzo correcto', () => {
    const cpu = new Cpu8086(); cpu.load('MOV AX,7\nCMP AX,7\nJZ igual\nMOV BX,99\nigual:\nMOV BX,1\nHLT');
    while(!cpu.halted) cpu.step();
    expect(cpu.registers.AX).toBe(7); expect(cpu.registers.BX).toBe(1);
    expect(cpu.trace.some(t=>t.instruction.text==='MOV BX,99')).toBe(false);
  });
  it('LOOP acumula cuatro palabras y conserva flags de la última suma de SI', () => {
    const cpu = new Cpu8086(); cpu.load('MOV AX,0\nMOV CX,4\nMOV SI,0\notra:\nADD AX,[SI]\nADD SI,2\nLOOP otra\nHLT');
    while(!cpu.halted) cpu.step();
    expect(cpu.registers.AX).toBe(10); expect(cpu.registers.CX).toBe(0); expect(cpu.registers.SI).toBe(8);
    expect(cpu.trace).toHaveLength(16); expect(cpu.flags.ZF).toBe(false);
    expect(cpu.trace.flatMap(t=>t.reads)).toEqual([0x20000,0x20002,0x20004,0x20006]);
  });
  it('MOV guarda little endian y registra solo la escritura de destino', () => {
    const cpu = new Cpu8086(); cpu.load('MOV AX,01234h\nMOV [32],AX\nMOV BX,[32]\nHLT');
    while(!cpu.halted) cpu.step();
    expect(cpu.memory[0x20020]).toBe(0x34); expect(cpu.memory[0x20021]).toBe(0x12);
    expect(cpu.registers.BX).toBe(0x1234);
    expect(cpu.trace[1].reads).toEqual([]); expect(cpu.trace[1].writes).toEqual([0x20020]);
  });
  it('usa SS para BP y codifica desplazamiento cero explícito', () => {
    const cpu = new Cpu8086(); cpu.load('MOV AX,[BP]'); cpu.writeWord(0x3000,0,42);
    expect(cpu.instructions[0].bytes).toEqual([0x8b,0x46,0]);
    cpu.step(); expect(cpu.registers.AX).toBe(42);
  });
  it('restaura memoria, registros, flags y estado detenido sin alias', () => {
    const cpu = new Cpu8086(); cpu.load('MOV AX,9\nMOV [32],AX\nHLT');
    const original = cpu.snapshot(); while(!cpu.halted) cpu.step(); cpu.restore(original);
    expect(cpu.snapshot()).toEqual(original);
    cpu.registers.AX=55; expect(original.registers.AX).toBe(7);
  });
  it('forma direcciones equivalentes y aplica rollover de 20 bits', () => {
    expect(physicalAddress(0x2000,0x10)).toBe(physicalAddress(0x2001,0));
    expect(physicalAddress(0xffff,0xffff)).toBe(0x0ffef);
    const cpu = new Cpu8086(); cpu.writeWord(0xffff,15,0x1234);
    expect(cpu.memory[0xfffff]).toBe(0x34); expect(cpu.memory[0]).toBe(0x12);
  });
  it('rechaza instrucciones, operandos, etiquetas y saltos inválidos', () => {
    for(const source of ['MOV AX,[SP]','ADD [10],AX','MOV AX,65536','JZ ausente','a: NOP\na: HLT','INC AX,BX']) expect(()=>assemble(source)).toThrow();
    expect(()=>assemble('JZ lejos\n'+Array(130).fill('NOP').join('\n')+'\nlejos: HLT')).toThrow('fuera de rango');
  });
});

 describe('8086 / decodificación independiente',()=>{
 it('ejecuta bytes modificados aunque el texto ensamblado conserve el literal anterior',()=>{const cpu=new Cpu8086();cpu.load('MOV AX, 7\nHLT');cpu.memory[physicalAddress(cpu.registers.CS,0x101)]=42;cpu.step();expect(cpu.registers.AX).toBe(42);expect(cpu.trace[0].instruction.bytes).toEqual([0xb8,42,0]);});
 it('rechaza un opcode desconocido antes de modificar el estado',()=>{const cpu=new Cpu8086();cpu.load('NOP\nHLT');cpu.memory[physicalAddress(cpu.registers.CS,0x100)]=0x0f;const before=cpu.snapshot();expect(()=>cpu.step()).toThrow('Opcode no admitido');expect(cpu.snapshot()).toEqual(before);expect(cpu.trace).toHaveLength(0);});
 it('ejecuta sin metadatos de ensamblador y respeta un salto relativo negativo',()=>{const cpu=new Cpu8086();cpu.load('MOV CX, 2\nrepite: DEC AX\nLOOP repite\nHLT');cpu.instructions=[];while(!cpu.halted)cpu.step();expect(cpu.registers.AX).toBe(5);expect(cpu.registers.CX).toBe(0);expect(cpu.trace).toHaveLength(6);});
});
