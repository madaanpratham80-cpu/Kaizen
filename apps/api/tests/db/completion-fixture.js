import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { setTimeout } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';
import { afterEach } from 'vitest';
import { useAuthDatabase } from './auth-fixture.js';

export const operation = () => ({ operationId: randomUUID() });

export function useCompletionDatabase() {
  const { prisma, register } = useAuthDatabase();
  const owners = [];
  afterEach(async () => {
    const where = { userId: { in: owners } };
    await prisma.$transaction([
      prisma.completionReceipt.deleteMany({ where }),
      prisma.userAchievement.deleteMany({ where }),
      prisma.progressEvent.deleteMany({ where }),
      prisma.dayPlan.updateMany({ where, data: { priorityId: null } }),
      prisma.questOccurrence.deleteMany({ where }),
      prisma.dayPlan.deleteMany({ where }),
      prisma.quest.deleteMany({ where }),
    ]);
    owners.length = 0;
  });

  async function owner() {
    const { user, sessionToken } = await register();
    owners.push(user.id);
    return {
      userId: user.id,
      tokenHash: createHash('sha256')
        .update(Buffer.from(sessionToken, 'base64url'))
        .digest('hex'),
    };
  }

  async function plan(
    { userId },
    {
      offset = 0,
      plannedCount = 1,
      deadlineUtc,
      status = 'OPEN',
      closedAt,
    } = {},
  ) {
    const localDate = new Date();
    localDate.setUTCHours(0, 0, 0, 0);
    localDate.setUTCDate(localDate.getUTCDate() + offset);
    const startsAtUtc = new Date(Date.now() - (1 - offset) * 60_000);
    return prisma.dayPlan.create({
      data: {
        userId,
        localDate,
        startsAtUtc,
        timezoneSnapshot: 'UTC',
        deadlineUtc:
          deadlineUtc ?? new Date(Date.now() + (offset < 0 ? -30_000 : 60_000)),
        status,
        plannedCount,
        closedAt,
      },
    });
  }

  async function occurrence(
    day,
    { planned = true, priority = planned, rewardXp = 10 } = {},
  ) {
    const { userId, id: dayPlanId } = day;
    const fields = {
      userId,
      title: 'Read',
      category: 'Academic',
      pillar: 'Cognitive',
    };
    const quest = await prisma.quest.create({ data: fields });
    const created = await prisma.questOccurrence.create({
      data: {
        ...fields,
        dayPlanId,
        questId: quest.id,
        planned,
        difficulty: 'EASY',
        target: 1,
        rewardXp,
        ruleVersion: 1,
      },
    });
    if (priority) {
      await prisma.dayPlan.update({
        where: { userId_id: { userId, id: dayPlanId } },
        data: { priorityId: created.id },
      });
    }
    return created;
  }

  return { prisma, owner, plan, occurrence };
}

export async function waitForBlocked(
  observer,
  blocker,
  queryPattern,
  count = 1,
) {
  const limit = performance.now() + 3_000;
  do {
    const rows = await observer.$queryRaw`
      WITH RECURSIVE blocked(pid) AS (
        SELECT ${blocker}::integer
        UNION
        SELECT activity.pid
        FROM pg_stat_activity activity
        JOIN blocked ON blocked.pid = ANY(pg_blocking_pids(activity.pid))
        WHERE activity.wait_event_type = 'Lock'
      )
      SELECT activity.pid FROM pg_stat_activity activity JOIN blocked USING (pid)
      WHERE activity.pid <> ${blocker}::integer AND activity.query LIKE ${queryPattern}
    `;
    if (rows.length >= count) return rows;
    await setTimeout(10);
  } while (performance.now() < limit);
  throw new Error(`Expected ${count} blocked PostgreSQL session(s)`);
}

export async function waitForDatabaseTime(prisma, deadline) {
  const limit = performance.now() + 3_000;
  do {
    const [{ reached }] = await prisma.$queryRaw`
      SELECT clock_timestamp() >= ${deadline} AS reached
    `;
    if (reached) return;
    await setTimeout(10);
  } while (performance.now() < limit);
  throw new Error('PostgreSQL clock did not reach the deadline');
}

export async function holdTransaction(owner, lock) {
  const connection = new PrismaClient();
  const ready = Promise.withResolvers();
  const release = Promise.withResolvers();
  const done = connection
    .$transaction(
      async (tx) => {
        const [{ pid }] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;
        await lock(tx, owner);
        ready.resolve(pid);
        await release.promise;
      },
      { timeout: 10_000 },
    )
    .finally(() => connection.$disconnect());
  done.catch(ready.reject);

  return {
    pid: await ready.promise,
    release: async () => {
      release.resolve();
      await done;
    },
  };
}

export function holdPlayer(owner) {
  return holdTransaction(
    owner,
    (tx, { userId }) => tx.$queryRaw`
    SELECT "userId" FROM "PlayerState" WHERE "userId" = ${userId}::uuid FOR UPDATE
  `,
  );
}
