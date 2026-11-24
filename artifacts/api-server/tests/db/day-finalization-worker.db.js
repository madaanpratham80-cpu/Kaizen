import { PrismaClient } from '@prisma/client';
import { Temporal } from '@js-temporal/polyfill';
import { describe, expect, it } from 'vitest';
import { dayBounds, dateColumn } from '../../src/domain/calendar.js';
import { completeOccurrence } from '../../src/services/completion.js';
import {
  finalizeOwnerBatch,
  findCalendarCandidates,
} from '../../src/services/day-worker.js';
import {
  holdPlayer,
  operation,
  useCompletionDatabase,
  waitForBlocked,
} from './completion-fixture.js';

const { prisma, owner, plan, occurrence } = useCompletionDatabase();
const day = (value) => Temporal.PlainDate.from(value);
const fixedToday = day('2026-11-16');
const asOf = new Date('2026-11-16T12:00:00Z');
const fixedClock = async () => asOf;

async function absent(days, timezone = 'UTC', today = fixedToday) {
  const actor = await owner();
  const { startsAtUtc } = dayBounds(today.subtract({ days }), timezone);
  await prisma.user.update({
    where: { id: actor.userId },
    data: { createdAt: startsAtUtc, timezone },
  });
  return actor;
}

function eventsFor({ userId }) {
  return prisma.progressEvent.findMany({
    where: { userId },
    orderBy: { sequence: 'asc' },
    include: { day: { select: { localDate: true } } },
  });
}

describe('day-finalization-worker', () => {
  it('discovers overdue and never-materialized accounts and closes a seven-day absence in order', async () => {
    const missing = await absent(7);
    const overdue = await owner();
    await plan(overdue, { offset: -1 });
    await plan(overdue);
    const ready = await owner();
    await plan(ready);
    const earlier = new Date('2026-11-08T23:59:59Z');
    expect(await findCalendarCandidates(prisma, earlier)).not.toContainEqual({
      userId: missing.userId,
    });
    const candidates = await findCalendarCandidates(prisma, new Date());
    expect(candidates).toEqual(
      expect.arrayContaining([
        { userId: missing.userId },
        { userId: overdue.userId },
      ]),
    );
    expect(candidates).not.toContainEqual({ userId: ready.userId });

    expect(await finalizeOwnerBatch(prisma, missing, fixedClock)).toEqual({
      closed: 7,
      status: 'ready',
    });
    const events = await eventsFor(missing);
    expect(
      events.map(({ day: entry, kind }) => [entry.localDate, kind]),
    ).toEqual(
      Array.from({ length: 7 }, (_, index) => [
        dateColumn(fixedToday.subtract({ days: 7 - index })),
        'DAY_CLOSE',
      ]),
    );
    expect(new Set(events.map(({ awardKey }) => awardKey)).size).toBe(7);
    expect(
      await prisma.playerState.findUnique({
        where: { userId: missing.userId },
      }),
    ).toMatchObject({
      lastFinalizedDate: dateColumn(fixedToday.subtract({ days: 1 })),
      totalXp: 0,
      health: 70,
    });
    expect(await finalizeOwnerBatch(prisma, missing, fixedClock)).toEqual({
      closed: 0,
      status: 'ready',
    });
  });

  it('handles a ninety-day absence in thirty-date batches and eventually opens today', async () => {
    const actor = await absent(90);
    for (let batch = 1; batch <= 3; batch += 1) {
      expect(await finalizeOwnerBatch(prisma, actor, fixedClock)).toEqual({
        closed: 30,
        status: 'batch-limit',
      });
      expect(
        await prisma.dayPlan.count({ where: { userId: actor.userId } }),
      ).toBe(batch * 30);
    }
    expect(await finalizeOwnerBatch(prisma, actor, fixedClock)).toEqual({
      closed: 0,
      status: 'ready',
    });
    const events = await eventsFor(actor);
    expect(events).toHaveLength(90);
    expect(events.map(({ sequence }) => sequence)).toEqual(
      Array.from({ length: 90 }, (_, index) => index + 1),
    );
    expect(events.at(-1).day.localDate).toEqual(
      dateColumn(fixedToday.subtract({ days: 1 })),
    );
    expect(
      await prisma.dayPlan.findFirst({
        where: { userId: actor.userId, closedAt: null },
      }),
    ).toMatchObject({ localDate: dateColumn(fixedToday) });
  });

  it('resumes from the last committed checkpoint after a failed close transaction', async () => {
    const actor = await absent(35);
    await prisma.user.update({
      where: { id: actor.userId },
      data: { displayName: 'Worker restart fixture' },
    });
    await prisma.$executeRaw`
      CREATE FUNCTION pause_test_day_worker() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.kind = 'DAY_CLOSE' AND NEW.sequence = 13
          AND EXISTS (SELECT 1 FROM "User" WHERE id = NEW."userId" AND "displayName" = 'Worker restart fixture') THEN
          RAISE EXCEPTION 'worker interrupted at thirteenth close';
        END IF;
        RETURN NEW;
      END;
      $$
    `;
    try {
      await prisma.$executeRaw`
        CREATE TRIGGER pause_test_day_worker BEFORE INSERT ON "ProgressEvent"
        FOR EACH ROW EXECUTE FUNCTION pause_test_day_worker()
      `;
      await expect(
        finalizeOwnerBatch(prisma, actor, fixedClock),
      ).rejects.toThrow('worker interrupted at thirteenth close');
      expect(
        await prisma.dayPlan.count({ where: { userId: actor.userId } }),
      ).toBe(12);
      expect(
        await prisma.playerState.findUnique({
          where: { userId: actor.userId },
        }),
      ).toMatchObject({
        lastFinalizedDate: dateColumn(fixedToday.subtract({ days: 24 })),
        nextEventSequence: 13,
      });
    } finally {
      await prisma.$executeRaw`DROP TRIGGER IF EXISTS pause_test_day_worker ON "ProgressEvent"`;
      await prisma.$executeRaw`DROP FUNCTION pause_test_day_worker()`;
    }
    const restarted = new PrismaClient();
    try {
      expect(await finalizeOwnerBatch(restarted, actor, fixedClock)).toEqual({
        closed: 23,
        status: 'ready',
      });
      const events = await eventsFor(actor);
      expect(events).toHaveLength(35);
      expect(new Set(events.map(({ awardKey }) => awardKey)).size).toBe(35);
      expect(events[12].day.localDate).toEqual(
        dateColumn(fixedToday.subtract({ days: 23 })),
      );
    } finally {
      await restarted.$disconnect();
    }
  });

  it('shares the completion lock and closes before a competing late completion', async () => {
    const actor = await owner();
    const expired = await plan(actor, { offset: -1 });
    const target = await occurrence(expired);
    const contender = new PrismaClient();
    const lock = await holdPlayer(actor);
    const pattern = '%PlayerState%FOR UPDATE%';
    const worker = finalizeOwnerBatch(prisma, actor);
    let results = Promise.allSettled([worker]);
    try {
      await waitForBlocked(prisma, lock.pid, pattern);
      results = Promise.allSettled([
        worker,
        completeOccurrence(contender, actor, target.id, operation()),
      ]);
      await waitForBlocked(prisma, lock.pid, pattern, 2);
    } finally {
      await lock.release();
      await results;
      await contender.$disconnect();
    }
    const [closed, rejected] = await results;
    expect(closed).toMatchObject({
      status: 'fulfilled',
      value: { closed: 1, status: 'ready' },
    });
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: { code: 'DAY_EXPIRED' },
    });
    expect(await eventsFor(actor)).toEqual([
      expect.objectContaining({
        kind: 'DAY_CLOSE',
        healthDelta: -5,
        xpDelta: 0,
      }),
    ]);
  });

  it.each([
    ['2026-03-08', 23],
    ['2026-11-01', 25],
  ])(
    'closes the %s DST day using its %i-hour boundary',
    async (localDate, hours) => {
      const timezone = 'America/New_York';
      const today = day(localDate).add({ days: 1 });
      const actor = await absent(1, timezone, today);
      const now = dayBounds(today, timezone).startsAtUtc;
      expect(await finalizeOwnerBatch(prisma, actor, async () => now)).toEqual({
        closed: 1,
        status: 'ready',
      });
      const closed = await prisma.dayPlan.findUnique({
        where: {
          userId_localDate: {
            userId: actor.userId,
            localDate: dateColumn(day(localDate)),
          },
        },
      });
      expect(closed.closedAt).toEqual(now);
      expect((closed.deadlineUtc - closed.startsAtUtc) / 3_600_000).toBe(hours);
    },
  );
});
