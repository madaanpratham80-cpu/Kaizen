import { PrismaClient } from '@prisma/client';
import pino from 'pino';

/**
 * @param {string} name
 * @param {(prisma: PrismaClient, logger: import('pino').Logger) => Promise<Record<string, number> & {failed?: number}>} run
 * @returns {Promise<void>}
 */
export async function runJob(name, run) {
  const prisma = new PrismaClient();
  const logger = pino().child({ job: name });
  try {
    const result = await run(prisma, logger);
    if (result.failed) process.exitCode = 1;
    logger.info(result, 'Job finished');
  } catch (error) {
    process.exitCode = 1;
    logger.error({ code: error?.code ?? 'UNEXPECTED_FAILURE' }, 'Job failed');
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      process.exitCode = 1;
      logger.error('Failed to close the job database pool');
    }
  }
}
