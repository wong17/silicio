import { describe, expect, it } from 'vitest';
import { IdleGovernor, ResolutionGovernor } from './render-governors';

describe('gobernadores de render', () => {
  it('resolution_scale_settles', () => {
    const g = new ResolutionGovernor();
    // Load that straddles the dead band would oscillate forever without the reversal lock.
    const history: number[] = [];
    for (let i = 0; i < 200; i++) history.push(g.update(i % 2 === 0 ? 20 : 10));
    expect(g.settled).toBe(true);
    const tail = history.slice(-20);
    expect(new Set(tail).size).toBe(1);
  });

  it('steps_are_five_percent_and_never_below_half', () => {
    const g = new ResolutionGovernor();
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) seen.add(g.update(40));
    expect(Math.min(...seen)).toBe(0.5);
    for (const v of seen) expect(Math.round(v * 100) % 5).toBe(0);
  });

  it('a_big_load_change_unlocks_it', () => {
    const g = new ResolutionGovernor();
    for (let i = 0; i < 200; i++) g.update(i % 2 === 0 ? 20 : 10);
    expect(g.settled).toBe(true);
    const before = g.value;
    for (let i = 0; i < 6; i++) g.update(40);
    expect(g.value).toBeLessThan(before);
  });

  it('idle_frame_rate_recovers_on_input', () => {
    const g = new IdleGovernor(3000);
    g.touch(0);
    expect(g.frameAllowed(1000, false)).toBe(true);
    const frames = [4000, 4016, 4032, 4048].map((t) => g.frameAllowed(t, false));
    expect(frames.filter(Boolean)).toHaveLength(2);
    g.touch(4100);
    expect(g.frameAllowed(4116, false)).toBe(true);
    expect(g.frameAllowed(4132, false)).toBe(true);
  });

  it('busy_work_keeps_the_full_rate', () => {
    const g = new IdleGovernor(100);
    g.touch(0);
    for (let t = 1000; t < 1100; t += 16) expect(g.frameAllowed(t, true)).toBe(true);
  });
});

import { QualityGovernor } from './render-governors';
describe('calidad automática', () => {
  it('steps_down_after_sustained_slowness', () => {
    const g = new QualityGovernor();
    expect(g.update('high', 30, 0.7)).toBeUndefined();
    expect(g.update('high', 30, 0.7)).toBeUndefined();
    expect(g.update('high', 30, 0.7)).toBe('balanced');
  });
  it('one_slow_window_is_not_enough', () => {
    const g = new QualityGovernor();
    g.update('balanced', 40, 0.6);
    g.update('balanced', 12, 1);
    expect(g.update('balanced', 40, 0.6)).toBeUndefined();
  });
  it('cools_down_between_decisions', () => {
    const g = new QualityGovernor();
    for (let i = 0; i < 3; i++) g.update('high', 30, 0.7);
    for (let i = 0; i < QualityGovernor.COOLDOWN; i++) expect(g.update('balanced', 30, 0.7)).toBeUndefined();
  });
  it('never_goes_below_low_or_above_high', () => {
    const g = new QualityGovernor();
    for (let i = 0; i < 10; i++) expect(g.update('low', 60, 0.5)).toBeUndefined();
    const h = new QualityGovernor();
    for (let i = 0; i < 20; i++) expect(h.update('high', 6, 1)).toBeUndefined();
  });
  it('steps_up_only_after_a_long_calm_stretch', () => {
    const g = new QualityGovernor();
    let result: string | undefined;
    for (let i = 0; i < 8; i++) result = g.update('low', 8, 1);
    expect(result).toBe('balanced');
  });
});
