/** Conceptual 16-bit machine, independent of the 8086 session and electrical timings. */
export class MachineExperiment {
  stage = 0;
  accumulator = 0;
  address = 0;
  data = 0;
  output = 0;
  memory = [7, 0];
  advance(): void {
    if (this.stage === 8) {
      this.reset();
      return;
    }
    this.stage++;
    switch (this.stage) {
      case 1:
        this.address = 0;
        break;
      case 3:
        this.data = this.memory[this.address];
        this.accumulator = this.data;
        break;
      case 4:
        this.accumulator = (this.accumulator + 5) & 65535;
        break;
      case 5:
        this.address = 1;
        break;
      case 7:
        this.data = this.accumulator;
        this.memory[this.address] = this.data;
        break;
      case 8:
        this.output = this.memory[1];
        break;
    }
  }
  reset(): void {
    this.stage = 0;
    this.accumulator = 0;
    this.address = 0;
    this.data = 0;
    this.output = 0;
    this.memory = [7, 0];
  }
}

import type { MachineActivity } from '../laboratory/station-activity';

const h4 = (n: number) => n.toString(16).toUpperCase().padStart(4, '0') + 'h';

/** Reads the machine experiment as station activity: the only bus that lights is the one the step uses. */
export function machineActivity(m: MachineExperiment): MachineActivity {
  const base = { stage: m.stage, accumulator: m.accumulator, memory: [...m.memory], output: m.output };
  switch (m.stage) {
    case 1:
      return { ...base, bus: 'address', direction: 'out', target: 'ram', value: h4(m.address) };
    case 2:
      return { ...base, bus: 'control', direction: 'out', target: 'ram', value: 'RD' };
    case 3:
      return { ...base, bus: 'data', direction: 'in', target: 'ram', value: h4(m.data) };
    case 4:
      return { ...base, bus: null, direction: 'out', target: 'ram', value: h4(m.accumulator), aluFrom: m.data };
    case 5:
      return { ...base, bus: 'address', direction: 'out', target: 'ram', value: h4(m.address) };
    case 6:
      return { ...base, bus: 'control', direction: 'out', target: 'ram', value: 'WR' };
    case 7:
      return { ...base, bus: 'data', direction: 'out', target: 'ram', value: h4(m.data) };
    case 8:
      return { ...base, bus: 'control', direction: 'out', target: 'io', value: h4(m.output) };
    default:
      return { ...base, bus: null, direction: 'out', target: 'ram', value: '' };
  }
}
