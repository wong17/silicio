import { describe, expect, it } from 'vitest';
import { Cpu8086, physicalAddress } from '../simulation/cpu8086';
import { projectLaboratory } from './laboratory.facade';
import { ActivityChannel, bitsOf, IDLE_ACTIVITY, projectActivity } from './station-activity';

function stepped(source: string, steps = 1) {
  const cpu = new Cpu8086();
  cpu.load(source);
  let event = cpu.step()!;
  for (let i = 1; i < steps; i++) event = cpu.step()!;
  const view = {
    ...projectLaboratory(cpu.snapshot(), event),
    sessionId: '8086-1',
    fetchAddress: physicalAddress(event.before.registers.CS, event.before.registers.IP),
  };
  return { view, event };
}

describe('actividad de estación', () => {
  it('activity_bits_match_the_physical_address', () => {
    const { view, event } = stepped('MOV AX, 5');
    const a = projectActivity(view, 'fetch', 1);
    expect(a.address).toBe(physicalAddress(event.before.registers.CS, event.before.registers.IP));
    expect(a.ale).toBe(true);
    const bits = bitsOf(a.address, 20);
    expect(bits.reduce((n, on, i) => n + (on ? 2 ** i : 0), 0)).toBe(a.address);
    expect(a.bytes).toEqual(event.instruction.bytes);
  });

  it('idle_activity_lights_nothing', () => {
    const { view } = stepped('MOV AX, 5');
    const a = projectActivity(view, 'idle');
    expect(a).toMatchObject({ phase: 'idle', blocks: [], rd: false, wr: false, ale: false, bytes: [], changed: [] });
    expect(projectActivity({ ...view, instruction: undefined }, 'fetch').blocks).toEqual([]);
  });

  it('execute_reports_the_registers_that_changed', () => {
    const { view } = stepped('MOV AX, 5');
    const a = projectActivity(view, 'execute');
    expect(a.changed).toContain('AX');
    expect(a.blocks).toContain('alu');
  });

  it('reduced_motion_keeps_signal_state', () => {
    // Final phase of a step still carries the bus state, so a still frame shows what happened.
    const { view } = stepped('MOV AX,9\nMOV [32],AX', 2);
    const a = projectActivity(view, 'write', 2);
    expect(a.wr || a.rd || a.changed.length > 0).toBe(true);
  });

  it('late_activity_from_an_old_session_is_dropped', () => {
    const channel = new ActivityChannel();
    const seen: string[] = [];
    channel.begin('8086-2');
    channel.subscribe((a) => seen.push(a.sessionId));
    const accepted = channel.publish({ ...IDLE_ACTIVITY, sessionId: '8086-1', phase: 'fetch' });
    expect(accepted).toBe(false);
    expect(channel.current.sessionId).toBe('8086-2');
    expect(channel.publish({ ...IDLE_ACTIVITY, sessionId: '8086-2', phase: 'fetch' })).toBe(true);
    expect(channel.current.phase).toBe('fetch');
  });
});
