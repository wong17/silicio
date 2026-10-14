import { describe, expect, it } from 'vitest';
import { MISSION_TRACE, runCache } from './cache-model';

const four = { lines: 4, blockBytes: 16 } as const;
const eight = { lines: 8, blockBytes: 16 } as const;
const outcome = (r: ReturnType<typeof runCache>) => r.accesses.map((a) => (a.hit ? 'acierto' : 'fallo'));

describe('caché didáctica', () => {
  it('four_lines_give_miss_hit_miss_miss_and_cost_34', () => {
    // Case T61.
    const r = runCache(four, [...MISSION_TRACE]);
    expect(outcome(r)).toEqual(['fallo', 'acierto', 'fallo', 'fallo']);
    expect(r.cost).toBe(34);
    expect(r.hits).toBe(1);
  });

  it('eight_lines_give_miss_hit_miss_hit_and_cost_24', () => {
    const r = runCache(eight, [...MISSION_TRACE]);
    expect(outcome(r)).toEqual(['fallo', 'acierto', 'fallo', 'acierto']);
    expect(r.cost).toBe(24);
  });

  it('both_configurations_read_the_same_data', () => {
    const a = runCache(four, [...MISSION_TRACE]);
    const b = runCache(eight, [...MISSION_TRACE]);
    expect(a.accesses.map((x) => x.address)).toEqual(b.accesses.map((x) => x.address));
    expect(a.accesses.map((x) => x.block)).toEqual(b.accesses.map((x) => x.block));
  });

  it('access_across_two_blocks_is_two_lookups', () => {
    const r = runCache(four, [0x000f]);
    expect(r.accesses).toHaveLength(2);
    expect(r.accesses[0]).toMatchObject({ block: 0, hit: false });
    expect(r.accesses[1]).toMatchObject({ block: 1, split: true, hit: false });
    expect(r.cost).toBe(22);
  });

  it('cold_cache_always_misses_first', () => {
    for (const config of [four, eight]) {
      for (const address of [0, 0x10, 0x7ff0, 0xfffff]) expect(runCache(config, [address]).accesses[0].hit).toBe(false);
    }
  });

  it('index_and_tag_come_from_the_block_number', () => {
    const r = runCache(four, [0x0040]);
    expect(r.accesses[0]).toMatchObject({ block: 4, index: 0, tag: 1 });
    const e = runCache(eight, [0x0040]);
    expect(e.accesses[0]).toMatchObject({ block: 4, index: 4, tag: 0 });
  });

  it('an_empty_trace_costs_nothing', () => {
    expect(runCache(four, [])).toEqual({ accesses: [], hits: 0, cost: 0 });
  });
});
