import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LabSession } from './lab-session.service';

function ready() {
  const session = TestBed.inject(LabSession);
  session.source = 'MOV AX, 5\nADD AX, 3\nMOV BX, AX\nHLT';
  session.load();
  for (let i = 0; i < 3; i++) session.step();
  return session;
}

describe('restaurar un paso', () => {
  it('restore_updates_all_instruments', () => {
    const session = ready();
    expect(session.cursor()).toBe(2);
    expect(session.state().registers.AX).toBe(8);
    session.restore(0);
    expect(session.cursor()).toBe(0);
    expect(session.state().registers.AX).toBe(5);
    expect(session.state().registers.BX).toBe(0);
    // Every instrument reads the same restored session.
    expect(session.laboratory().registers.find((r) => r.name === 'AX')!.value).toBe(5);
    expect(session.timeline().cursor).toBe(0);
    expect(session.timeline().total).toBe(3);
    expect(session.phase()).toBe('write');
    expect(session.activity().phase).toBe('write');
    expect(session.activePart()).toBe('frame-0');
  });

  it('restoring_before_the_first_step_returns_to_idle', () => {
    const session = ready();
    const initial = session.cpu.trace[0].before.registers.AX;
    session.restore(-1);
    expect(session.phase()).toBe('idle');
    expect(session.state().registers.AX).toBe(initial);
    expect(session.activity().blocks).toEqual([]);
  });

  it('a_late_step_does_not_replay_after_restore', async () => {
    const session = ready();
    session.restore(0);
    await new Promise((r) => setTimeout(r, 700));
    expect(session.phase()).toBe('write');
  });
});
