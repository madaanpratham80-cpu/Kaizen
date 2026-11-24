import { describe, expect, it } from 'vitest';
import { habitStreak } from '../src/domain/habit-streak.js';

describe('habit streak', () => {
  it('returns zero current and best for empty history', () => {
    expect(habitStreak([])).toEqual({ current: 0, best: 0 });
  });
  it('resets current at a missed scheduled date and preserves best', () => {
    expect(
      habitStreak(['COMPLETED', 'COMPLETED', 'MISSED', 'COMPLETED']),
    ).toEqual({ current: 1, best: 2 });
  });
  it('ignores rest, unscheduled and still-open dates', () => {
    expect(
      habitStreak(['COMPLETED', null, 'PENDING', 'COMPLETED', null]),
    ).toEqual({ current: 2, best: 2 });
  });
});
