/// <reference lib="webworker" />
import { Cpu8086, Instruction, Snapshot } from './cpu8086';
addEventListener('message', ({data}:{data:{generation:number;state:Snapshot;instructions:Instruction[]}}) => {
 try {const cpu=new Cpu8086();cpu.restore(data.state);cpu.instructions=data.instructions;postMessage({generation:data.generation,event:cpu.step()});}
 catch(e){postMessage({generation:data.generation,error:(e as Error).message});}
});
