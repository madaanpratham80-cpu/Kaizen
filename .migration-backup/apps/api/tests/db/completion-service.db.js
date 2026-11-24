import { expect, it } from 'vitest';
import { completeOccurrence } from '../../src/services/completion.js';
import { readServerClock } from '../../src/services/player-lock.js';
import {
  useCompletionDatabase,
  operation,
  holdPlayer,
  waitForBlocked,
  waitForDatabaseTime,
} from './completion-fixture.js';

const { prisma, owner, plan, occurrence } = useCompletionDatabase();

it('replays the committed response after deadline and during catch-up, and rejects changed input', async () => {
  const actor = await owner();
  const today = await plan(actor, { plannedCount: 2 });
  const first = await occurrence(today);
  const second = await occurrence(today, { priority: false });
  const op = operation();
  const result = await completeOccurrence(prisma, actor, first.id, op);
  expect(result).toMatchObject({
    status: 'completed',
    xpDelta: 10,
    healthDelta: 2,
    currentStreak: 1,
    stateVersion: 1,
  });
  await plan(actor, { offset: -1 });
  expect(
    await completeOccurrence(prisma, actor, second.id, operation()),
  ).toEqual({
    status: 'catching-up',
    retryAfterSeconds: 1,
  });
  expect(
    await completeOccurrence(prisma, actor, first.id.toUpperCase(), {
      operationId: op.operationId.toUpperCase(),
    }),
  ).toEqual(result);
  await prisma.dayPlan.update({
    where: { id: today.id },
    data: { deadlineUtc: new Date() },
  });
  expect(await completeOccurrence(prisma, actor, first.id, op)).toEqual(result);
  await expect(
    completeOccurrence(prisma, actor, second.id, op),
  ).rejects.toMatchObject({ status: 409, code: 'OPERATION_CONFLICT' });
  await expect(
    completeOccurrence(prisma, actor, second.id, operation()),
  ).rejects.toMatchObject({ code: 'DAY_EXPIRED' });
  expect(
    await prisma.progressEvent.count({ where: { userId: actor.userId } }),
  ).toBe(1);
  expect(
    await prisma.completionReceipt.count({ where: { userId: actor.userId } }),
  ).toBe(1);
});

it('applies each seal once and never gives Quick Quests planned health or streak', async () => {
  const actor = await owner();
  const prior = await plan(actor, {
    offset: -1,
    status: 'MISSED',
    closedAt: new Date(),
  });
  expect(prior.closedAt).toBeTruthy();
  const today = await plan(actor);
  const planned = await occurrence(today);
  const quick = await occurrence(today, { planned: false });
  const quickResult = await completeOccurrence(
    prisma,
    actor,
    quick.id,
    operation(),
  );
  expect(quickResult).toMatchObject({
    xpDelta: 10,
    healthDelta: 0,
    currentStreak: 0,
    seals: [],
  });
  const result = await completeOccurrence(
    prisma,
    actor,
    planned.id,
    operation(),
  );
  expect(result).toMatchObject({
    xpDelta: 35,
    healthDelta: 5,
    currentStreak: 1,
    seals: [{ code: 'iron-will', bonusXp: 25 }],
  });
  expect(result.eventIds).toHaveLength(2);
  const repeat = await completeOccurrence(
    prisma,
    actor,
    planned.id,
    operation(),
  );
  expect(repeat).toMatchObject({
    status: 'alreadyCompleted',
    xpDelta: 0,
    seals: [],
    stateVersion: 2,
  });
  const events = await prisma.progressEvent.findMany({
    where: { userId: actor.userId },
    orderBy: { sequence: 'asc' },
  });
  expect(events.map(({ sequence, xpDelta }) => [sequence, xpDelta])).toEqual([
    [1, 10],
    [2, 10],
    [3, 25],
  ]);
});

it('does not reveal foreign occurrences and rechecks a revoked session after lock wait', async () => {
  const alice = await owner();
  const bob = await owner();
  const target = await occurrence(await plan(alice));
  await expect(
    completeOccurrence(prisma, bob, target.id, operation()),
  ).rejects.toMatchObject({ status: 404, code: 'OCCURRENCE_NOT_FOUND' });
  const blocker = await holdPlayer(alice);
  const attempt = completeOccurrence(prisma, alice, target.id, operation());
  attempt.catch(() => {});
  try {
    await waitForBlocked(prisma, blocker.pid, '%PlayerState%FOR UPDATE%');
    await prisma.session.deleteMany({
      where: { userId: alice.userId, tokenHash: alice.tokenHash },
    });
  } finally {
    await blocker.release();
  }
  await expect(attempt).rejects.toMatchObject({
    status: 401,
    code: 'SESSION_INVALID',
  });
  expect(
    await prisma.progressEvent.count({ where: { userId: alice.userId } }),
  ).toBe(0);
});

it('uses the database deadline after an observed lock wait', async () => {
  const actor = await owner();
  const today = await plan(actor);
  const target = await occurrence(today);
  const blocker = await holdPlayer(actor);
  const deadline = new Date((await readServerClock(prisma)).getTime() + 1_000);
  await prisma.dayPlan.update({
    where: { id: today.id },
    data: { deadlineUtc: deadline },
  });
  const attempt = completeOccurrence(prisma, actor, target.id, operation());
  attempt.catch(() => {});
  try {
    await waitForBlocked(prisma, blocker.pid, '%PlayerState%FOR UPDATE%');
    await waitForDatabaseTime(prisma, deadline);
  } finally {
    await blocker.release();
  }
  await expect(attempt).rejects.toMatchObject({ code: 'DAY_EXPIRED' });
});

it('returns a bounded busy error when the player lock is unavailable', async () => {
  const actor = await owner();
  const target = await occurrence(await plan(actor));
  const blocker = await holdPlayer(actor);
  const attempt = completeOccurrence(prisma, actor, target.id, operation());
  attempt.catch(() => {});
  try {
    await waitForBlocked(prisma, blocker.pid, '%PlayerState%FOR UPDATE%');
    await expect(attempt).rejects.toMatchObject({
      status: 503,
      code: 'PROGRESSION_BUSY',
    });
  } finally {
    await blocker.release();
  }
  expect(
    await prisma.completionReceipt.count({ where: { userId: actor.userId } }),
  ).toBe(0);
});
