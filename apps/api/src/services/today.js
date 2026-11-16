import { CalendarError } from './calendar.js';
import { readServerClock } from './player-lock.js';

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} userId
 * @param {Date} now
 * @returns {Promise<import('@prisma/client').DayPlan | null>}
 */
export function findCurrentPlan(tx, userId, now) {
  return tx.dayPlan.findFirst({
    where: {
      userId,
      startsAtUtc: { lte: now },
      deadlineUtc: { gt: now },
      closedAt: null,
    },
    orderBy: { localDate: 'desc' },
  });
}

async function readRecoveryHint(tx, userId, plan, occurrences, now) {
  if (plan?.status === 'ACTIVE') return null;
  const last = await tx.dayPlan.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'MISSED'] },
      closedAt: { not: null },
      deadlineUtc: { lte: now },
    },
    orderBy: { localDate: 'desc' },
    select: { status: true },
  });
  if (last?.status !== 'MISSED') return null;
  const easy = occurrences.find(
    ({ planned, difficulty, status }) =>
      planned && difficulty === 'EASY' && status === 'PENDING',
  );
  return easy
    ? { code: 'SMALL_COMMITMENT', occurrenceId: easy.id }
    : { code: 'SIMPLER_FUTURE_PLAN' };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string}} owner
 * @returns {Promise<object>} A coherent snapshot of the current day and committed progression.
 */
export function readToday(prisma, { userId }) {
  return prisma.$transaction(
    async (tx) => {
      const now = await readServerClock(tx);
      const plan = await findCurrentPlan(tx, userId, now);
      const state = await tx.playerState.findUnique({
        where: { userId },
        select: {
          health: true,
          totalXp: true,
          currentStreak: true,
          bestStreak: true,
          stateVersion: true,
        },
      });
      if (!state)
        throw new CalendarError(
          503,
          'PLAYER_STATE_UNAVAILABLE',
          'Player state is temporarily unavailable.',
        );
      const occurrences = plan
        ? await tx.questOccurrence.findMany({
            where: { userId, dayPlanId: plan.id },
            orderBy: [{ planned: 'desc' }, { id: 'asc' }],
          })
        : [];
      const priority =
        occurrences.find(({ id }) => id === plan?.priorityId) ?? null;
      const recoveryHint = await readRecoveryHint(
        tx,
        userId,
        plan,
        occurrences,
        now,
      );
      return {
        status: plan ? 'ready' : 'catching-up',
        plan,
        occurrences,
        priority,
        ...state,
        recoveryHint,
      };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
