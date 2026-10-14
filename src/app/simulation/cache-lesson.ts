import { MISSION_TRACE, runCache, type CacheAccess, type CacheResult } from './cache-model';

export interface Guess {
  access: number;
  predicted: boolean;
  actual: boolean;
}

/**
 * The cache mission (M09): predict hit or miss for each read of the four-line cache before it is shown,
 * then compare the cost with the eight-line one. State lives here so the console and the scene agree.
 */
export class CacheLesson {
  readonly four: CacheResult;
  readonly eight: CacheResult;
  guesses: Guess[] = [];
  /** Number of accesses revealed so far (equals the number of predictions made). */
  get revealed(): number {
    return this.guesses.length;
  }

  constructor(readonly addresses: number[] = [...MISSION_TRACE]) {
    this.four = runCache({ lines: 4, blockBytes: 16 }, addresses);
    this.eight = runCache({ lines: 8, blockBytes: 16 }, addresses);
  }

  get total(): number {
    return this.four.accesses.length;
  }

  get complete(): boolean {
    return this.revealed >= this.total;
  }

  /** The access the student is about to predict, or undefined when the run is complete. */
  get pending(): CacheAccess | undefined {
    return this.four.accesses[this.revealed];
  }

  /** Records a prediction and reveals the access. Returns whether it was right, or undefined when done. */
  predict(hit: boolean): boolean | undefined {
    const access = this.pending;
    if (!access) return undefined;
    this.guesses.push({ access: this.revealed, predicted: hit, actual: access.hit });
    return hit === access.hit;
  }

  get correct(): number {
    return this.guesses.filter((g) => g.predicted === g.actual).length;
  }

  /** Solved when every access was predicted and the predictions were right. */
  get solved(): boolean {
    return this.complete && this.correct === this.total;
  }

  /** Cost saved by the larger cache once the comparison is complete. */
  get saving(): number {
    return this.four.cost - this.eight.cost;
  }

  /** Slot (line index) the scene lights for the last revealed access, with its outcome. */
  get lastLookup(): { index: number; hit: boolean } | undefined {
    const n = this.revealed - 1;
    const a = this.four.accesses[n];
    return a ? { index: a.index, hit: a.hit } : undefined;
  }

  reset(): void {
    this.guesses = [];
  }

  /** An independent copy, so the console can hold each state as a new value. */
  clone(): CacheLesson {
    const copy = new CacheLesson(this.addresses);
    copy.guesses = this.guesses.map((g) => ({ ...g }));
    return copy;
  }
}
