import { readServerClock } from './player-lock.js';

const SESSION_BATCH_SIZE = 500;
const MAX_BATCHES = 20;
const LOCK_TIMEOUT = '2s';
const TRANSACTION_TIMEOUT_MS = 5_000;
const POOL_WAIT_MS = 2_000;

function removeBatch(prisma, cutoff) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('lock_timeout', ${LOCK_TIMEOUT}, true)`;
      return tx.$executeRaw`
      WITH expired AS (
        SELECT id FROM "Session"
        WHERE "expiresAt" <= (${cutoff}::timestamptz AT TIME ZONE 'UTC')
        ORDER BY "expiresAt", id
        LIMIT ${SESSION_BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM "Session" AS session
      USING expired
      WHERE session.id = expired.id
    `;
    },
    { maxWait: POOL_WAIT_MS, timeout: TRANSACTION_TIMEOUT_MS },
  );
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {typeof readServerClock} [clock]
 * @returns {Promise<{deleted: number, batches: number}>}
 */
export async function cleanupExpiredSessions(prisma, clock = readServerClock) {
  // A stable cutoff keeps one invocation bounded even as more sessions expire.
  const cutoff = await clock(prisma);
  let deleted = 0;
  for (let batches = 1; batches <= MAX_BATCHES; batches += 1) {
    const batch = await removeBatch(prisma, cutoff);
    deleted += batch;
    if (batch < SESSION_BATCH_SIZE) return { deleted, batches };
  }
  return { deleted, batches: MAX_BATCHES };
}
