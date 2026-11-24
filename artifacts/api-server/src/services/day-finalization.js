import { QUEST_RULE_VERSION } from '../domain/quest-rules.js';
import { healthOnClose, transitionStreak } from '../domain/progression.js';
import { readServerClock } from './player-lock.js';
import {
  lockProgressionDay,
  oldestOverdueDay,
  ProgressionError,
  withProgressionLock,
} from './progression-store.js';

async function closeDay(tx, userId, day, completedPlannedCount, now) {
  const state = await tx.playerState.findUniqueOrThrow({ where: { userId } });
  if (state.lastFinalizedDate && day.localDate <= state.lastFinalizedDate) {
    throw new ProgressionError(
      409,
      'CALENDAR_CHECKPOINT_CONFLICT',
      'Day precedes the committed calendar checkpoint.',
    );
  }
  const health = healthOnClose({
    ...day,
    health: state.health,
    completedPlannedCount,
  });
  const status = day.status === 'OPEN' ? 'MISSED' : day.status;
  const { currentStreak, bestStreak } = transitionStreak(
    { ...state, recoveryPending: false },
    { from: day.status, to: status },
  );
  await tx.dayPlan.update({
    where: { userId_id: { userId, id: day.id } },
    data: { status, closedAt: now },
  });
  const event = await tx.progressEvent.create({
    data: {
      userId,
      sequence: state.nextEventSequence,
      awardKey: `close:${day.id}`,
      kind: 'DAY_CLOSE',
      dayId: day.id,
      healthDelta: health.healthDelta,
      xpDelta: 0,
      ruleVersion: QUEST_RULE_VERSION,
      recordedAt: now,
    },
    select: { id: true },
  });
  const saved = await tx.playerState.update({
    where: { userId },
    data: {
      health: health.health,
      currentStreak,
      bestStreak,
      lastFinalizedDate: day.localDate,
      nextEventSequence: { increment: 1 },
      stateVersion: { increment: 1 },
    },
    select: { stateVersion: true },
  });
  return {
    status: 'closed',
    dayStatus: status,
    healthDelta: health.healthDelta,
    eventId: event.id,
    ...saved,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string}} owner Account selected by the authenticated caller or the calendar service.
 * @param {string} [dayId] When omitted, close the earliest overdue day.
 * @returns {Promise<object>} The closure result or the reason no day was closed.
 */
export function finalizeDay(prisma, { userId }, dayId) {
  return withProgressionLock(prisma, userId, (tx) =>
    finalizeDayInTransaction(tx, userId, dayId),
  );
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx Transaction holding the PlayerState lock.
 * @param {string} userId
 * @param {string} [dayId]
 * @param {typeof readServerClock} [clock]
 * @returns {Promise<object>}
 */
export async function finalizeDayInTransaction(
  tx,
  userId,
  dayId,
  clock = readServerClock,
) {
  const now = await clock(tx);
  const candidateId = dayId ?? (await oldestOverdueDay(tx, userId, now))?.id;
  if (!candidateId) return { status: 'idle' };
  const day = await lockProgressionDay(tx, userId, candidateId);
  if (!day)
    throw new ProgressionError(
      404,
      'DAY_PLAN_NOT_FOUND',
      'Day plan not found.',
    );
  if (day.closedAt) return { status: 'alreadyClosed' };
  const occurrences = await tx.$queryRaw`
    SELECT planned, status
    FROM "QuestOccurrence"
    WHERE "userId" = ${userId}::uuid AND "dayPlanId" = ${day.id}::uuid
    ORDER BY id FOR UPDATE
  `;
  const afterLocks = await clock(tx);
  if (day.deadlineUtc > afterLocks) return { status: 'notDue' };
  const next = await oldestOverdueDay(tx, userId, afterLocks);
  if (next?.id !== day.id) return { status: 'catching-up' };
  const completedPlannedCount = occurrences.filter(
    ({ planned, status }) => planned && status === 'COMPLETED',
  ).length;
  return closeDay(tx, userId, day, completedPlannedCount, afterLocks);
}
