import { signal, computed } from '@angular/core';
import type { LaboratorySources } from './laboratory.types';
import { Snapshot, Trace, hex, Registers, physicalAddress } from '../simulation/cpu8086';
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
    flagsChanged: e
      ? (Object.keys(s.flags) as (keyof Snapshot['flags'])[]).filter((f) => e.before.flags[f] !== s.flags[f])
      : [],
    operation: e?.operation,
    instruction: e?.instruction,
    accesses: e?.operation?.accesses ?? [],
    memory: s.memory,
  };
}
export { BufferExperiment } from '../simulation/buffer-experiment';

export class LaboratoryFacade {
  readonly session = signal(1);
  private pending?: number;
  private serial = 0;
  readonly view;
  constructor(private sources: LaboratorySources) {
    this.view = computed(() => ({
      ...projectLaboratory(sources.snapshot(), sources.event()),
      sessionId: '8086-' + this.session(),
      fetchAddress: ((e) => (e ? physicalAddress(e.before.registers.CS, e.before.registers.IP) : undefined))(
        sources.event(),
      ),
      experience: sources.experience(),
      selectedPiece: sources.selection(),
    }));
  }
  request(): number | undefined {
    if (this.pending !== undefined) return;
    this.pending = ++this.serial;
    return this.pending;
  }
  cancel(): void {
    this.pending = undefined;
  }
  beginSession(): void {
    this.cancel();
    this.session.update((n) => n + 1);
  }
  complete(id: number, apply: () => void): boolean {
    if (id !== this.pending) return false;
    this.pending = undefined;
    apply();
    return true;
  }
}
