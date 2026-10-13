import {describe,it,expect} from 'vitest';
import {Cpu8086} from './cpu8086';
import {readSession} from './session-codec';
describe('sesiones del laboratorio',()=>{
 it('recupera memoria y traza exportadas con ejecución comprobada',()=>{const cpu=new Cpu8086();cpu.load('ADD AX, [10]\nHLT');cpu.step();const session=readSession(JSON.stringify({version:1,source:'ADD AX, [10]\nHLT',state:cpu.snapshot(),trace:cpu.trace,cursor:0}));expect(session.state.registers.AX).toBe(12);expect(session.trace[0].reads).toEqual([0x2000a]);expect(session.trace[0].before.registers.AX).toBe(7);});
 it('rechaza un estado de traza manipulado antes de devolver una sesión',()=>{const cpu=new Cpu8086();cpu.load('ADD AX, [10]\nHLT');cpu.step();cpu.trace[0].after.registers.AX=99;expect(()=>readSession(JSON.stringify({version:1,source:'ADD AX, [10]\nHLT',state:cpu.snapshot(),trace:cpu.trace}))).toThrow('La traza no coincide');});
 it('rechaza direcciones fuera del espacio físico de 20 bits',()=>{const cpu=new Cpu8086();cpu.load('HLT');cpu.memory[0x100000]=0;expect(()=>readSession(JSON.stringify({version:1,source:'HLT',state:cpu.snapshot(),trace:[]}))).toThrow('Byte o dirección');});
 it('branch_archive_roundtrip_preserves_future',()=>{const c=new Cpu8086();c.load('ADD AX, [10]\nHLT');c.step();const s={version:1,source:'ADD AX, [10]\nHLT',state:c.snapshot(),trace:c.trace,cursor:0};const a=readSession(JSON.stringify({version:2,current:s,branches:[{id:'rama-A',session:s}]}));expect(a.branches?.[0].id).toBe('rama-A');expect(a.branches?.[0].session.trace[0].after.registers.AX).toBe(12);});
});
