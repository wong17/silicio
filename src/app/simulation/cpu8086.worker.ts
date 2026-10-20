/// <reference lib="webworker" />
import { Cpu8086, Instruction, Snapshot } from './cpu8086';
addEventListener('message', ({data}:{data:{generation:number;state:Snapshot;instructions:Instruction[]}}) => {
 try {
  const cpu=new Cpu8086();cpu.restore(data.state);cpu.instructions=data.instructions;
  const result=cpu.execute();
  if(result.kind==='waiting-input')postMessage({generation:data.generation,waiting:result.service});
  else if(result.kind==='fault')postMessage({generation:data.generation,fault:result.line});
  else postMessage({generation:data.generation,event:result.trace});
 }
 catch(e){postMessage({generation:data.generation,error:(e as Error).message});}
});
