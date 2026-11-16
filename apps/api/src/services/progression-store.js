import { setTimeout } from 'node:timers/promises';
import { withPlayerLock } from './player-lock.js';

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 15;
export const CATCH_UP_RETRY_AFTER_SECONDS = 1;

export class ProgressionError extends Error {
  /**
   * @param {number} status
   * @param {string} code
   * @param {string} message
   */
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * @template T
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 * @param {(tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>} work
 * @returns {Promise<T>}
 */
export async function withProgressionLock(prisma, userId, work) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await withPlayerLock(
        prisma,
        userId,
        () =>
          new ProgressionError(
            503,
            'PLAYER_STATE_UNAVAILABLE',
            'Player state is temporarily unavailable.',
          ),
        work,
      );
    } catch (error) {
      const sqlState = error.code === 'P2010' ? error.meta?.code : undefined;
      const transient =
        error.code === 'P2034' || sqlState === '40P01' || sqlState === '40001';
      if (transient && attempt < MAX_RETRIES) {
        const window = RETRY_BASE_MS * 2 ** attempt;
        await setTimeout(window + Math.floor(Math.random() * window));
        continue;
      }
      if (
        transient ||
        sqlState === '55P03' ||
        ['P2024', 'P2028'].includes(error.code)
      ) {
        throw new ProgressionError(
          503,
          'PROGRESSION_BUSY',
          'Progression is temporarily busy. Retry this request.',
        );
      }
      throw error;
    }
  }
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} userId
 * @param {string} dayId
 */
export async function lockProgressionDay(tx, userId, dayId) {
  const [day] = await tx.$queryRaw`
    SELECT * FROM "DayPlan" WHERE "userId" = ${userId}::uuid AND id = ${dayId}::uuid
    FOR UPDATE
  `;
  return day;
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} userId
 * @param {Date} now
 */
export function oldestOverdueDay(tx, userId, now) {
  return tx.dayPlan.findFirst({
    where: { userId, closedAt: null, deadlineUtc: { lte: now } },
    orderBy: { localDate: 'asc' },
    select: { id: true },
  });
}
