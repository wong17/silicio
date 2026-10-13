import { Snapshot, Trace, hex, Registers } from '../simulation/cpu8086';
export function projectLaboratory(s: Snapshot, e?: Trace) {
  return {
    registers: (Object.keys(s.registers) as (keyof Registers)[]).map((name) => ({
      name,
      value: s.registers[name],
      hex: hex(s.registers[name]),
      decimal: s.registers[name],
      bits: Array.from({ length: 16 }, (_, i) => (s.registers[name] >>> (15 - i)) & 1),
      changedMask: e ? e.before.registers[name] ^ s.registers[name] : 0,
    })),
    flags: s.flags,
    operation: e?.operation,
    instruction: e?.instruction,
    accesses: e?.operation?.accesses ?? [],
    memory: s.memory,
  };
}
/** An illustrative shared-buffer dependency, independent of the 8086 session. */
export class BufferExperiment {
  view = {
    input: { id: 'B0', values: [1, 2, 3, 4] },
    output: { id: 'B1', values: [] as number[] },
    completed: false,
    stage: 0,
    version: 0,
  };
  advance(): void {
    const stage = (this.view.stage + 1) % 3;
    if (stage === 0)
      this.view = { ...this.view, stage, completed: false, output: { id: 'B1', values: [] } };
    else if (stage === 1) this.view = { ...this.view, stage, completed: false };
    else
      this.view = {
        ...this.view,
        stage,
        completed: true,
        version: this.view.version + 1,
        output: { id: 'B1', values: this.view.input.values.map((v) => v * 2) },
      };
  }
}
