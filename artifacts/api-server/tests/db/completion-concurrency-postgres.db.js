import { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { completeOccurrence } from '../../src/services/completion.js';
import { finalizeDay } from '../../src/services/day-finalization.js';
import { readServerClock } from '../../src/services/player-lock.js';
import {
  holdPlayer,
  holdTransaction,
  operation,
  useCompletionDatabase,
  waitForBlocked,
  waitForDatabaseTime,
} from './completion-fixture.js';

const { prisma, owner, plan, occurrence } = useCompletionDatabase();
const PLAYER_QUERY = '%PlayerState%FOR UPDATE%';

async function onTwoConnections(run) {
  const first = new PrismaClient();
  const second = new PrismaClient();
  try {
    return await run(first, second);
  } finally {
    await Promise.all([first.$disconnect(), second.$disconnect()]);
  }
}

async function raceCompletions(actor, one, two, op1, op2) {
  return onTwoConnections(async (first, second) => {
    const blocker = await holdPlayer(actor);
    const attempts = Promise.allSettled([
      completeOccurrence(first, actor, one.id, op1),
      completeOccurrence(second, actor, two.id, op2),
    ]);
    try {
      await waitForBlocked(prisma, blocker.pid, PLAYER_QUERY, 2);
    } finally {
      await blocker.release();
      await attempts;
    }
    return attempts;
  });
}

function successful(results) {
  return results.map((result) => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
}

async function ledger({ userId }) {
  return prisma.progressEvent.findMany({
    where: { userId },
    orderBy: { sequence: 'asc' },
  });
}

describe('completion-concurrency-postgres', () => {
  it('commits one reward for simultaneous requests targeting the same occurrence', async () => {
    const actor = await owner();
    const target = await occurrence(await plan(actor));
    const results = successful(
      await raceCompletions(actor, target, target, operation(), operation()),
    );
    expect(results.map(({ status }) => status).sort()).toEqual([
      'alreadyCompleted',
      'completed',
    ]);
    expect(results.reduce((sum, { xpDelta }) => sum + xpDelta, 0)).toBe(10);
    expect(await ledger(actor)).toEqual([
      expect.objectContaining({ occurrenceId: target.id, xpDelta: 10 }),
    ]);
    expect(
      await prisma.playerState.findUnique({ where: { userId: actor.userId } }),
    ).toMatchObject({
      stateVersion: 1,
      totalXp: 10,
      health: 75,
      currentStreak: 1,
      nextEventSequence: 2,
    });
  });

  it('keeps both rewards and cumulative health when distinct occurrences race', async () => {
    const actor = await owner();
    const day = await plan(actor, { plannedCount: 2 });
    const one = await occurrence(day);
    const two = await occurrence(day, { priority: false, rewardXp: 20 });
    const results = successful(
      await raceCompletions(actor, one, two, operation(), operation()),
    );
    expect(results.map(({ stateVersion }) => stateVersion).sort()).toEqual([
      1, 2,
    ]);
    expect(results.map(({ xpDelta }) => xpDelta).sort()).toEqual([10, 20]);
    expect(results.map(({ healthDelta }) => healthDelta).sort()).toEqual([
      2, 3,
    ]);
    expect(await ledger(actor)).toHaveLength(2);
    expect(
      await prisma.playerState.findUnique({ where: { userId: actor.userId } }),
    ).toMatchObject({
      stateVersion: 2,
      totalXp: 30,
      health: 75,
      currentStreak: 1,
      nextEventSequence: 3,
    });
  });

  it('replays the exact authoritative response for concurrent identical operation IDs', async () => {
    const actor = await owner();
    const target = await occurrence(await plan(actor));
    const op = operation();
    const [first, second] = successful(
      await raceCompletions(actor, target, target, op, op),
    );
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      status: 'completed',
      xpDelta: 10,
      stateVersion: 1,
    });
    expect(await ledger(actor)).toHaveLength(1);
    expect(
      await prisma.completionReceipt.count({ where: { userId: actor.userId } }),
    ).toBe(1);
  });

  it('returns 409 for the losing request when an operation ID is reused with different input', async () => {
    const actor = await owner();
    const day = await plan(actor, { plannedCount: 2 });
    const one = await occurrence(day);
    const two = await occurrence(day, { priority: false });
    const op = operation();
    const results = await raceCompletions(actor, one, two, op, op);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(
      results.find(({ status }) => status === 'rejected').reason,
    ).toMatchObject({
      status: 409,
      code: 'OPERATION_CONFLICT',
    });
    expect(await ledger(actor)).toHaveLength(1);
    expect(
      await prisma.completionReceipt.count({ where: { userId: actor.userId } }),
    ).toBe(1);
    expect(
      await prisma.questOccurrence.count({
        where: { userId: actor.userId, status: 'COMPLETED' },
      }),
    ).toBe(1);
  });

  it('rolls back the occurrence, day, player state, events, unlock and receipt on a late failure', async () => {
    const actor = await owner();
    const where = { userId: actor.userId };
    const day = await plan(actor);
    const target = await occurrence(day);
    const beforeDay = await prisma.dayPlan.findUnique({
      where: { id: day.id },
    });
    const before = await prisma.playerState.update({
      where,
      data: { currentStreak: 6, bestStreak: 6 },
    });
    const op = operation();
    await prisma.$executeRaw`
      CREATE FUNCTION reject_test_progression_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."responseBody"->'seals' @> '[{"code":"seven-day-warrior"}]'::jsonb THEN
          IF (SELECT count(*) FROM "ProgressEvent" WHERE "userId" = NEW."userId") = 2
            AND EXISTS (SELECT 1 FROM "UserAchievement" WHERE "userId" = NEW."userId") THEN
            RAISE EXCEPTION 'test receipt failure after both awards';
          END IF;
          RAISE EXCEPTION 'test receipt failure before expected awards';
        END IF;
        RETURN NEW;
      END;
      $$
    `;
    try {
      await prisma.$executeRaw`
        CREATE TRIGGER reject_test_progression_receipt BEFORE INSERT ON "CompletionReceipt"
        FOR EACH ROW EXECUTE FUNCTION reject_test_progression_receipt()
      `;
      await expect(
        completeOccurrence(prisma, actor, target.id, op),
      ).rejects.toThrow('test receipt failure after both awards');
      expect(
        await prisma.questOccurrence.findUnique({ where: { id: target.id } }),
      ).toEqual(target);
      expect(
        await prisma.dayPlan.findUnique({ where: { id: day.id } }),
      ).toEqual(beforeDay);
      expect(await prisma.playerState.findUnique({ where })).toEqual(before);
      expect(await ledger(actor)).toEqual([]);
      expect(await prisma.userAchievement.count({ where })).toBe(0);
      expect(await prisma.completionReceipt.count({ where })).toBe(0);
    } finally {
      await prisma.$executeRaw`DROP TRIGGER IF EXISTS reject_test_progression_receipt ON "CompletionReceipt"`;
      await prisma.$executeRaw`DROP FUNCTION reject_test_progression_receipt()`;
    }
    expect(
      await completeOccurrence(prisma, actor, target.id, op),
    ).toMatchObject({ xpDelta: 35 });
  });

  it('closes first when the finalizer holds queue precedence and rejects completion', async () => {
    const actor = await owner();
    const day = await plan(actor, {
      deadlineUtc: new Date(Date.now() - 1_000),
    });
    const target = await occurrence(day);
    await onTwoConnections(async (closer, completer) => {
      const blocker = await holdPlayer(actor);
      const closing = finalizeDay(closer, actor, day.id);
      let attempts = Promise.allSettled([closing]);
      try {
        await waitForBlocked(prisma, blocker.pid, PLAYER_QUERY);
        const completing = completeOccurrence(
          completer,
          actor,
          target.id,
          operation(),
        );
        attempts = Promise.allSettled([closing, completing]);
        await waitForBlocked(prisma, blocker.pid, PLAYER_QUERY, 2);
      } finally {
        await blocker.release();
        await attempts;
      }
      const [closed, rejected] = await attempts;
      expect(closed).toMatchObject({
        status: 'fulfilled',
        value: { status: 'closed', dayStatus: 'MISSED', healthDelta: -5 },
      });
      expect(rejected).toMatchObject({
        status: 'rejected',
        reason: { code: 'DAY_EXPIRED' },
      });
    });
    expect(await ledger(actor)).toEqual([
      expect.objectContaining({ kind: 'DAY_CLOSE', xpDelta: 0 }),
    ]);
    expect(
      await prisma.completionReceipt.count({ where: { userId: actor.userId } }),
    ).toBe(0);
    expect(
      await prisma.questOccurrence.findUnique({ where: { id: target.id } }),
    ).toMatchObject({ status: 'PENDING' });
  });

  it('closes after a completion that passed its deadline check while holding the lock', async () => {
    const actor = await owner();
    const day = await plan(actor, { plannedCount: 2 });
    const target = await occurrence(day);
    await occurrence(day, { priority: false });
    await prisma.$executeRaw`
      CREATE FUNCTION pause_test_progression_award() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtextextended(NEW."userId"::text, 0));
        RETURN NEW;
      END;
      $$
    `;
    try {
      await prisma.$executeRaw`
        CREATE TRIGGER pause_test_progression_award BEFORE INSERT ON "ProgressEvent"
        FOR EACH ROW WHEN (NEW.kind = 'COMPLETION') EXECUTE FUNCTION pause_test_progression_award()
      `;
      await onTwoConnections(async (completer, closer) => {
        const barrier = await holdTransaction(
          actor,
          (tx, { userId }) => tx.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))
        `,
        );
        let attempts = Promise.resolve([]);
        const deadline = new Date(
          (await readServerClock(prisma)).getTime() + 1_200,
        );
        try {
          await prisma.dayPlan.update({
            where: { id: day.id },
            data: { deadlineUtc: deadline },
          });
          const completing = completeOccurrence(
            completer,
            actor,
            target.id,
            operation(),
          );
          attempts = Promise.allSettled([completing]);
          const [{ pid }] = await waitForBlocked(
            prisma,
            barrier.pid,
            '%INSERT%ProgressEvent%',
          );
          const closing = finalizeDay(closer, actor, day.id);
          attempts = Promise.allSettled([completing, closing]);
          await waitForBlocked(prisma, pid, PLAYER_QUERY);
          await waitForDatabaseTime(prisma, deadline);
        } finally {
          await barrier.release();
          await attempts;
        }
        const [completed, closed] = successful(await attempts);
        expect(completed).toMatchObject({
          status: 'completed',
          xpDelta: 10,
          healthDelta: 2,
          currentStreak: 1,
        });
        expect(
          new Date(completed.occurrence.completedAt).getTime(),
        ).toBeLessThan(deadline.getTime());
        expect(closed).toMatchObject({
          status: 'closed',
          dayStatus: 'ACTIVE',
          healthDelta: -3,
          stateVersion: 2,
        });
      });
      expect(await finalizeDay(prisma, actor, day.id)).toEqual({
        status: 'alreadyClosed',
      });
      expect(
        (await ledger(actor)).map(({ kind, xpDelta, healthDelta }) => [
          kind,
          xpDelta,
          healthDelta,
        ]),
      ).toEqual([
        ['COMPLETION', 10, 2],
        ['DAY_CLOSE', 0, -3],
      ]);
      expect(
        await prisma.playerState.findUnique({
          where: { userId: actor.userId },
        }),
      ).toMatchObject({
        totalXp: 10,
        health: 69,
        currentStreak: 1,
        stateVersion: 2,
        lastFinalizedDate: day.localDate,
      });
    } finally {
      await prisma.$executeRaw`DROP TRIGGER IF EXISTS pause_test_progression_award ON "ProgressEvent"`;
      await prisma.$executeRaw`DROP FUNCTION pause_test_progression_award()`;
    }
  });
});
