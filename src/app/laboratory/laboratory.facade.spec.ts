import { describe, it, expect } from 'vitest';
import { Cpu8086 } from '../simulation/cpu8086';
import { projectLaboratory, BufferExperiment, LaboratoryFacade } from './laboratory.facade';
describe('laboratory projection', () => {
  it('future_view_uses_real_register_and_event', () => {
    const cpu = new Cpu8086();
    cpu.load('ADD AX, [10]\nHLT');
    const event = cpu.step()!;
    const view = projectLaboratory(cpu.snapshot(), event);
    expect(view.registers.find((r) => r.name === 'AX')).toMatchObject({
      value: 12,
      hex: '000C',
      decimal: 12,
      changedMask: 11,
    });
    expect(view.registers[0].bits).toHaveLength(16);
    expect(view.operation?.operands).toEqual([7, 5]);
    expect(view.operation?.result).toBe(12);
  });
  it('buffer_identity_survives_stage_change', () => {
    const b = new BufferExperiment();
    b.advance();
    b.advance();
    expect(b.view.input.id).toBe('B0');
    expect(b.view.output.id).toBe('B1');
    expect(b.view.output.values).toEqual([2, 4, 6, 8]);
    expect(b.view.completed).toBe(true);
  });
  it('cpu_waits_for_completion_signal', () => {
    const b = new BufferExperiment();
    b.advance();
    expect(b.view.completed).toBe(false);
    expect(b.view.output.values).toEqual([]);
  });
});
it('late_worker_result_does_not_replace_current_session', () => {
  const cpu = new Cpu8086();
  cpu.load('ADD AX, [10]\nHLT');
  const event = cpu.step()!;
  cpu.restore(event.before);
  const facade = new LaboratoryFacade({
    snapshot: () => cpu.snapshot(),
    event: () => undefined,
    selection: () => 'alu',
    experience: () => '8086',
  });
  const old = facade.request()!;
  facade.beginSession();
  cpu.registers.AX = 99;
  expect(facade.complete(old, () => cpu.restore(event.after))).toBe(false);
  expect(cpu.registers.AX).toBe(99);
  const active = facade.request()!;
  expect(facade.complete(active, () => cpu.restore(event.after))).toBe(true);
  expect(cpu.registers.AX).toBe(12);
});
it('only_one_worker_request_is_pending', () => {
  const c = new Cpu8086(),
    f = new LaboratoryFacade({
      snapshot: () => c.snapshot(),
      event: () => undefined,
      selection: () => 'alu',
      experience: () => '8086',
    });
  const first = f.request();
  expect(f.request()).toBeUndefined();
  f.cancel();
  expect(f.request()).not.toBe(first);
});
