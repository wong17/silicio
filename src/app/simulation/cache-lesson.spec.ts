import { describe, expect, it } from 'vitest';
import { CacheLesson } from './cache-lesson';

describe('misión M09: predecir la caché', () => {
  it('solves_when_every_prediction_is_right', () => {
    const lesson = new CacheLesson();
    expect(lesson.solved).toBe(false);
    for (const hit of [false, true, false, false]) expect(lesson.predict(hit)).toBe(true);
    expect(lesson.complete).toBe(true);
    expect(lesson.solved).toBe(true);
    expect(lesson.four.cost).toBe(34);
    expect(lesson.eight.cost).toBe(24);
    expect(lesson.saving).toBe(10);
  });

  it('a_wrong_prediction_completes_but_does_not_solve', () => {
    const lesson = new CacheLesson();
    expect(lesson.predict(true)).toBe(false);
    lesson.predict(true);
    lesson.predict(false);
    lesson.predict(false);
    expect(lesson.complete).toBe(true);
    expect(lesson.solved).toBe(false);
    expect(lesson.correct).toBe(3);
  });

  it('nothing_is_revealed_before_the_prediction', () => {
    const lesson = new CacheLesson();
    expect(lesson.revealed).toBe(0);
    expect(lesson.lastLookup).toBeUndefined();
    lesson.predict(false);
    expect(lesson.lastLookup).toEqual({ index: 0, hit: false });
  });

  it('reset_starts_again', () => {
    const lesson = new CacheLesson();
    lesson.predict(false);
    lesson.reset();
    expect(lesson.revealed).toBe(0);
    expect(lesson.pending?.hit).toBe(false);
  });

  it('extra_predictions_are_ignored', () => {
    const lesson = new CacheLesson();
    for (let i = 0; i < 6; i++) lesson.predict(false);
    expect(lesson.revealed).toBe(4);
  });
});
