export const PLAYER_LOCK_TIMEOUT = '2s';
/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */
/**
 * @template T
 * @param {PrismaClient} prisma
 * @param {string} userId
 * @param {() => Error} missing
 * @param {(tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>} work
 * @returns {Promise<T>}
 */
export function withPlayerLock(prisma, userId, missing, work) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('lock_timeout', ${PLAYER_LOCK_TIMEOUT}, true)`;
      const [owner] = await tx.$queryRaw`
      SELECT "userId" FROM "PlayerState" WHERE "userId" = ${userId}::uuid FOR UPDATE
    `;
      if (!owner) throw missing();
      return work(tx);
    },
    { maxWait: 2_000, timeout: 5_000, isolationLevel: 'ReadCommitted' },
  );
}
/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @returns {Promise<Date>}
 */
export async function readServerClock(tx) {
  const [clock] = await tx.$queryRaw`SELECT clock_timestamp() AS now`;
  return clock.now;
}
