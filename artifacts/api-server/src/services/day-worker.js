import { materializeNextDay } from './calendar.js';
import { finalizeDayInTransaction } from './day-finalization.js';
import { readServerClock } from './player-lock.js';
import { oldestOverdueDay, withProgressionLock } from './progression-store.js';

const DATES_PER_OWNER = 30;
const OWNER_PAGE_SIZE = 100;

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {Date} asOf
 * @param {string | null} [after]
 * @returns {Promise<{userId: string}[]>}
 */
export function findCalendarCandidates(prisma, asOf, after = null) {
  return prisma.$queryRaw`
    WITH wall AS (
      SELECT ${asOf}::timestamptz AT TIME ZONE 'UTC' AS "asOf"
    )
    SELECT u.id AS "userId"
    FROM "User" u
    JOIN "PlayerState" p ON p."userId" = u.id
    CROSS JOIN wall
    LEFT JOIN LATERAL (
      SELECT "startsAtUtc", "deadlineUtc", "closedAt"
      FROM "DayPlan"
      WHERE "userId" = u.id
      ORDER BY "localDate" DESC LIMIT 1
    ) recent ON true
    WHERE (${after}::uuid IS NULL OR u.id > ${after}::uuid)
      AND u."createdAt" <= wall."asOf"
      AND (
        recent."deadlineUtc" IS NULL OR recent."startsAtUtc" > wall."asOf"
        OR recent."deadlineUtc" <= wall."asOf" OR recent."closedAt" IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM "DayPlan" overdue
          WHERE overdue."userId" = u.id AND overdue."closedAt" IS NULL
            AND overdue."deadlineUtc" <= wall."asOf"
        )
      )
    ORDER BY u.id LIMIT ${OWNER_PAGE_SIZE}
  `;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string}} owner
 * @param {typeof readServerClock} [clock]
 * @returns {Promise<{closed: number, status: 'ready' | 'waiting' | 'batch-limit'}>}
 */
export async function finalizeOwnerBatch(
  prisma,
  { userId },
  clock = readServerClock,
) {
  let closed = 0;
  while (closed < DATES_PER_OWNER) {
    const status = await withProgressionLock(prisma, userId, async (tx) => {
      // A committed closure always has its ledger event and checkpoint together.
      const now = await clock(tx);
      const overdue = await oldestOverdueDay(tx, userId, now);
      if (overdue)
        return (await finalizeDayInTransaction(tx, userId, overdue.id, clock))
          .status;
      const next = await materializeNextDay(tx, userId, now);
      if (next.status !== 'advance') return next.status;
      return (await finalizeDayInTransaction(tx, userId, next.plan.id, clock))
        .status;
    });
    if (status === 'ready') return { closed, status: 'ready' };
    if (status !== 'closed') return { closed, status: 'waiting' };
    closed += 1;
  }
  return { closed, status: 'batch-limit' };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {import('pino').Logger} logger
 * @returns {Promise<{owners: number, closed: number, capped: number, failed: number}>}
 */
export async function runDayFinalizationPass(prisma, logger) {
  const asOf = await readServerClock(prisma);
  const summary = { owners: 0, closed: 0, capped: 0, failed: 0 };
  let cursor = null;
  for (;;) {
    const owners = await findCalendarCandidates(prisma, asOf, cursor);
    if (!owners.length) return summary;
    for (const owner of owners) {
      summary.owners += 1;
      try {
        const result = await finalizeOwnerBatch(prisma, owner);
        summary.closed += result.closed;
        if (result.status === 'batch-limit') summary.capped += 1;
      } catch (error) {
        summary.failed += 1;
        logger.error(
          { userId: owner.userId, code: error?.code ?? 'UNEXPECTED_FAILURE' },
          'Could not finish calendar batch',
        );
      }
    }
    cursor = owners.at(-1).userId;
  }
}
