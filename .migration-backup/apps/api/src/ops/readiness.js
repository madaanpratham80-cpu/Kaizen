const POOL_WAIT_MS = 250;
const TRANSACTION_MS = 750;
const STATEMENT_TIMEOUT = '500ms';

/**
 * @param {import('@prisma/client').PrismaClient} database
 * @returns {Promise<boolean>}
 */
export async function databaseReady(database) {
  try {
    await database.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT set_config('statement_timeout', ${STATEMENT_TIMEOUT}, true)`;
        await tx.$queryRaw`SELECT 1 AS ready`;
      },
      { maxWait: POOL_WAIT_MS, timeout: TRANSACTION_MS },
    );
    return true;
  } catch {
    return false;
  }
}
