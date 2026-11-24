import { describe, expect, it } from 'vitest';
import {
  completionXp,
  eligibleSeals,
  healthOnClose,
  healthOnCompletion,
  levelProgress,
  transitionStreak,
} from '../src/domain/progression.js';

const fresh = { currentStreak: 0, bestStreak: 0, recoveryPending: false };
const active = { from: 'OPEN', to: 'ACTIVE', planned: true };

describe('progression-domain', () => {
  it('uses snapshot XP for planned and Quick Quest completions', () => {
    expect(completionXp({ rewardXp: 35, planned: true })).toBe(35);
    expect(completionXp({ rewardXp: 13, planned: false })).toBe(13);
  });

  it.each([
    [0, 1, 0],
    [99, 1, 99],
    [100, 2, 0],
    [199, 2, 99],
    [200, 3, 0],
  ])('calculates level and progress at %i XP', (xp, level, xpIntoLevel) => {
    expect(levelProgress(xp)).toEqual({ level, xpIntoLevel });
  });

  it('awards only the incremental planned allowance and computes the rounded close penalty', () => {
    const plan = { status: 'OPEN', plannedCount: 4, completedPlannedCount: 2 };
    expect(
      healthOnCompletion({
        ...plan,
        planned: true,
        health: 70,
        healthGainAccounted: 1,
      }),
    ).toEqual({ health: 71, healthDelta: 1, healthGainAccounted: 2 });
    expect(
      healthOnCompletion({
        ...plan,
        planned: true,
        health: 71,
        healthGainAccounted: 2,
      }),
    ).toEqual({ health: 71, healthDelta: 0, healthGainAccounted: 2 });
    expect(healthOnClose({ ...plan, health: 72 })).toEqual({
      health: 69,
      healthDelta: -3,
    });
    expect(
      healthOnClose({ ...plan, health: 72, completedPlannedCount: 4 }),
    ).toEqual({ health: 72, healthDelta: 0 });
  });

  it('caps actual health gain and retains the earned allowance at 100', () => {
    const plan = {
      status: 'ACTIVE',
      planned: true,
      plannedCount: 5,
      completedPlannedCount: 4,
      healthGainAccounted: 2,
    };
    expect(healthOnCompletion({ ...plan, health: 99 })).toEqual({
      health: 100,
      healthDelta: 1,
      healthGainAccounted: 4,
    });
    expect(healthOnCompletion({ ...plan, health: 100 })).toEqual({
      health: 100,
      healthDelta: 0,
      healthGainAccounted: 4,
    });
    expect(healthOnClose({ ...plan, health: 0 })).toEqual({
      health: 0,
      healthDelta: 0,
    });
    expect(
      healthOnClose({ ...plan, completedPlannedCount: 0, health: 2 }),
    ).toEqual({ health: 0, healthDelta: -2 });
  });

  it.each([
    ['OPEN', 0],
    ['REST', 4],
    ['EMPTY', 0],
  ])(
    'skips health gain and close on %s with %i planned',
    (status, plannedCount) => {
      const plan = {
        status,
        plannedCount,
        completedPlannedCount: 0,
        health: 70,
      };
      expect(
        healthOnCompletion({ ...plan, planned: true, healthGainAccounted: 0 }),
      ).toEqual({ health: 70, healthDelta: 0, healthGainAccounted: 0 });
      expect(healthOnClose(plan)).toEqual({ health: 70, healthDelta: 0 });
    },
  );

  it('excludes Quick Quests from health and streak even on an OPEN day', () => {
    expect(
      healthOnCompletion({
        status: 'OPEN',
        planned: false,
        plannedCount: 2,
        completedPlannedCount: 1,
        health: 70,
        healthGainAccounted: 0,
      }),
    ).toEqual({ health: 70, healthDelta: 0, healthGainAccounted: 0 });
    expect(transitionStreak(fresh, { ...active, planned: false })).toEqual({
      ...fresh,
      activated: false,
      recovered: false,
    });
  });

  it('keeps the streak through REST and EMPTY and counts an ACTIVE day once', () => {
    let streak = transitionStreak(fresh, active);
    expect(streak).toEqual({
      currentStreak: 1,
      bestStreak: 1,
      recoveryPending: false,
      activated: true,
      recovered: false,
    });
    for (const status of ['REST', 'EMPTY', 'ACTIVE']) {
      streak = transitionStreak(streak, { from: status, to: status });
      expect(streak).toMatchObject({
        currentStreak: 1,
        bestStreak: 1,
        activated: false,
      });
    }
    expect(transitionStreak(streak, active)).toMatchObject({
      currentStreak: 2,
      bestStreak: 2,
    });
  });

  it('keeps recovery pending through REST and EMPTY after a miss, then consumes it once', () => {
    let streak = transitionStreak(
      { ...fresh, currentStreak: 3, bestStreak: 9 },
      { from: 'OPEN', to: 'MISSED' },
    );
    expect(streak).toMatchObject({
      currentStreak: 0,
      bestStreak: 9,
      recoveryPending: true,
    });
    for (const status of ['REST', 'EMPTY'])
      streak = transitionStreak(streak, { from: status, to: status });
    expect(streak.recoveryPending).toBe(true);
    const recovered = transitionStreak(streak, active);
    expect(recovered).toMatchObject({
      currentStreak: 1,
      bestStreak: 9,
      recoveryPending: false,
      activated: true,
      recovered: true,
    });
    expect(
      transitionStreak(recovered, { from: 'ACTIVE', to: 'ACTIVE' }).recovered,
    ).toBe(false);
  });

  it('evaluates seal thresholds once per code and allows only the lifetime seal for a Quick Quest', () => {
    const before = {
      currentStreak: 6,
      lifetimeCompletions: 99,
      activated: true,
      recovered: false,
      unlockedCodes: [],
    };
    expect(eligibleSeals(before)).toEqual([]);
    const reached = {
      ...before,
      currentStreak: 7,
      lifetimeCompletions: 100,
      recovered: true,
    };
    const seals = eligibleSeals(reached);
    expect(seals).toEqual([
      { code: 'seven-day-warrior', ruleVersion: 1, bonusXp: 25 },
      { code: 'iron-will', ruleVersion: 1, bonusXp: 25 },
      { code: 'hundred-gates', ruleVersion: 1, bonusXp: 25 },
    ]);
    expect(
      eligibleSeals({
        ...reached,
        unlockedCodes: seals.map(({ code }) => code),
      }),
    ).toEqual([]);
    expect(
      eligibleSeals({ ...reached, activated: false, recovered: false }),
    ).toEqual([seals[2]]);
  });
});
