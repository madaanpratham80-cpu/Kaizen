import { syncCalendar } from './calendar.js';
import { finalizeDay } from './day-finalization.js';
import { readServerClock } from './player-lock.js';
import {
  CATCH_UP_RETRY_AFTER_SECONDS,
  oldestOverdueDay,
} from './progression-store.js';

const CLOSE_BATCH_LIMIT = 30;

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string}} owner
 * @returns {ReturnType<typeof syncCalendar>} Readiness after bounded materialization and chronological finalization.
 */
export async function syncProgressCalendar(prisma, owner) {
  const materialized = await syncCalendar(prisma, owner);
  let closed = 0;
  for (; closed < CLOSE_BATCH_LIMIT; closed += 1) {
    const next = await finalizeDay(prisma, owner);
    if (next.status === 'idle') break;
  }
  if (materialized.status !== 'ready') return materialized;
  const now = await readServerClock(prisma);
  if (
    now >= materialized.plan.deadlineUtc ||
    (closed === CLOSE_BATCH_LIMIT &&
      (await oldestOverdueDay(prisma, owner.userId, now)))
  ) {
    return {
      status: 'catching-up',
      retryAfterSeconds: CATCH_UP_RETRY_AFTER_SECONDS,
    };
  }
  return materialized;
}
