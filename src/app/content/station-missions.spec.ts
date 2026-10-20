import { describe, expect, it } from 'vitest';
import { missionFor, STATION_MISSIONS, type MissionContext } from './station-missions';

const idle: MissionContext = {
  segment: 0x2000,
  offset: 0x000a,
  physical: 0x2000a,
  trace: [],
  cursor: -1,
  bufferStage: 0,
  bufferCompleted: false,
  bufferVersion: 0,
  separateMemory: false,
  pcMonitor: '',
  pcResultFile: '',
};

describe('misiones por estación', () => {
  it('every_station_has_a_checked_mission', () => {
    for (const station of ['memory', 'time', 'apple', 'machine'] as const) {
      const mission = missionFor(station);
      expect(mission, station).toBeDefined();
      expect(mission!.check(idle), station + ' starts unsolved').toBe(false);
    }
    expect(STATION_MISSIONS).toHaveLength(4);
  });

  it('memory_needs_a_different_pair_for_the_same_cell', () => {
    const m = missionFor('memory')!;
    expect(m.check({ ...idle, segment: 0x2001, offset: 0xfffa, physical: 0x2000a })).toBe(true);
    expect(m.check({ ...idle, segment: 0x2000, offset: 0x000a })).toBe(false);
    expect(m.check({ ...idle, segment: 0x2001, offset: 0x0000, physical: 0x20010 })).toBe(false);
  });

  it('time_needs_the_cursor_on_the_first_ax_change', () => {
    const m = missionFor('time')!;
    const trace = [{ changed: ['IP'] }, { changed: ['AX', 'IP'] }, { changed: ['BX'] }];
    expect(m.check({ ...idle, trace, cursor: 1 })).toBe(true);
    expect(m.check({ ...idle, trace, cursor: 2 })).toBe(false);
    expect(m.check({ ...idle, trace: trace.slice(0, 2), cursor: 1 })).toBe(false);
  });

  it('apple_rejects_the_separate_memory_shortcut', () => {
    const m = missionFor('apple')!;
    const done = { ...idle, bufferStage: 2, bufferCompleted: true, bufferVersion: 1 };
    expect(m.check(done)).toBe(true);
    expect(m.check({ ...done, separateMemory: true })).toBe(false);
    expect(m.check({ ...done, bufferCompleted: false })).toBe(false);
  });

  it('machine_needs_the_sum_on_the_monitor_and_in_the_file', () => {
    const m = missionFor('machine')!;
    expect(m.check({ ...idle, pcMonitor: '10', pcResultFile: '10' })).toBe(true);
    expect(m.check({ ...idle, pcMonitor: '10', pcResultFile: '' })).toBe(false);
    expect(m.check({ ...idle, pcMonitor: '9', pcResultFile: '9' })).toBe(false);
  });
});
