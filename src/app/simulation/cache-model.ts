/**
 * Didactic direct-mapped cache, separate from the 8086: it shows how the same reads cost less with more
 * lines. The costs are the model's own (1 unit for a hit, 11 for a miss), not the latency of any product.
 */
export interface CacheConfig {
  lines: 4 | 8;
  blockBytes: 16;
}

export interface CacheAccess {
  /** Address of the byte this lookup asks for. */
  address: number;
  block: number;
  index: number;
  tag: number;
  hit: boolean;
  cost: number;
  /** True for the second lookup of a word that crosses two blocks. */
  split?: boolean;
}

export const HIT_COST = 1;
export const MISS_COST = 11;
export const BLOCK_BYTES = 16;

export interface CacheResult {
  accesses: CacheAccess[];
  hits: number;
  cost: number;
}

/**
 * Runs word reads through the cache. Each address is the first byte of a 16-bit word: when the word's two
 * bytes live in different blocks it becomes two lookups. The cache starts empty and only reads are modelled.
 */
export function runCache(config: CacheConfig, addresses: number[]): CacheResult {
  const tags: (number | undefined)[] = new Array(config.lines).fill(undefined);
  const accesses: CacheAccess[] = [];
  const lookup = (address: number, split: boolean): void => {
    const a = address & 0xfffff;
    const block = Math.floor(a / config.blockBytes);
    const index = block % config.lines;
    const tag = Math.floor(block / config.lines);
    const hit = tags[index] === tag;
    tags[index] = tag;
    const entry: CacheAccess = { address: a, block, index, tag, hit, cost: hit ? HIT_COST : MISS_COST };
    if (split) entry.split = true;
    accesses.push(entry);
  };
  for (const address of addresses) {
    const first = address & 0xfffff;
    lookup(first, false);
    const last = (first + 1) & 0xfffff;
    if (Math.floor(last / config.blockBytes) !== Math.floor(first / config.blockBytes)) lookup(last, true);
  }
  return {
    accesses,
    hits: accesses.filter((a) => a.hit).length,
    cost: accesses.reduce((n, a) => n + a.cost, 0),
  };
}

/** The fixed trace of the cache mission: the same block twice, then a block that collides in four lines. */
export const MISSION_TRACE = [0x0000, 0x0002, 0x0040, 0x0000] as const;
