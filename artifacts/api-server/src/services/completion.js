import { createHash } from 'node:crypto';
import {
  completionRequestSchema,
  occurrenceIdSchema,
  z,
} from '@kaizen/contracts';
import {
  completionXp,
  eligibleSeals,
  healthOnCompletion,
  transitionStreak,
} from '../domain/progression.js';
import { readServerClock } from './player-lock.js';
import {
  CATCH_UP_RETRY_AFTER_SECONDS,
  lockProgressionDay,
  oldestOverdueDay,
  ProgressionError,
  withProgressionLock,
} from './progression-store.js';

const identity = z.object({
  userId: z.uuid(),
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
});
const sessionInvalid = () =>
  new ProgressionError(401, 'SESSION_INVALID', 'Invalid session.');
const occurrenceNotFound = () =>
  new ProgressionError(404, 'OCCURRENCE_NOT_FOUND', 'Occurrence not found.');

async function assertSession(db, userId, tokenHash, now) {
  const session = await db.session.findUnique({
    where: { tokenHash, userId, expiresAt: { gt: now } },
    select: { id: true },
  });
  if (!session) throw sessionInvalid();
}

async function lockOccurrence(tx, userId, occurrenceId) {
  const reference = await tx.questOccurrence.findUnique({
    where: { userId_id: { userId, id: occurrenceId } },
    select: { dayPlanId: true },
  });
  if (!reference) throw occurrenceNotFound();
  const day = await lockProgressionDay(tx, userId, reference.dayPlanId);
  const [occurrence] = await tx.$queryRaw`
    SELECT * FROM "QuestOccurrence"
    WHERE "userId" = ${userId}::uuid AND "dayPlanId" = ${reference.dayPlanId}::uuid
      AND id = ${occurrenceId}::uuid
    FOR UPDATE
  `;
  if (!day || !occurrence) throw occurrenceNotFound();
  return { day, occurrence };
}

function response(
  status,
  occurrence,
  state,
  xpDelta = 0,
  healthDelta = 0,
  eventIds = [],
  seals = [],
) {
  return {
    status,
    occurrence: {
      id: occurrence.id,
      status: occurrence.status,
      completedAt: occurrence.completedAt?.toISOString() ?? null,
    },
    xpDelta,
    healthDelta,
    eventIds,
    seals,
    totalXp: state.totalXp,
    health: state.health,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    stateVersion: state.stateVersion,
  };
}

async function applyOccurrence(tx, { userId, now, state, day, occurrence }) {
  const completed = await tx.questOccurrence.update({
    where: {
      userId_dayPlanId_id: { userId, dayPlanId: day.id, id: occurrence.id },
    },
    data: { status: 'COMPLETED', completedAt: now },
  });
  const completedPlannedCount = occurrence.planned
    ? await tx.questOccurrence.count({
        where: {
          userId,
          dayPlanId: day.id,
          planned: true,
          status: 'COMPLETED',
        },
      })
    : 0;
  const health = healthOnCompletion({
    ...day,
    completedPlannedCount,
    health: state.health,
    planned: occurrence.planned,
  });
  const activated =
    day.status === 'OPEN' &&
    !day.streakApplied &&
    occurrence.planned &&
    day.priorityId === occurrence.id;
  const lastMeaningful = activated
    ? await tx.dayPlan.findFirst({
        where: {
          userId,
          localDate: { lt: day.localDate },
          closedAt: { not: null },
          status: { in: ['ACTIVE', 'MISSED'] },
        },
        orderBy: { localDate: 'desc' },
        select: { status: true },
      })
    : null;
  const streak = transitionStreak(
    { ...state, recoveryPending: lastMeaningful?.status === 'MISSED' },
    {
      from: day.status,
      to: activated ? 'ACTIVE' : day.status,
      planned: occurrence.planned,
    },
  );
  if (occurrence.planned) {
    await tx.dayPlan.update({
      where: { userId_id: { userId, id: day.id } },
      data: {
        priorityLockedAt: day.priorityLockedAt ?? now,
        healthGainAccounted: health.healthGainAccounted,
        ...(activated && { status: 'ACTIVE', streakApplied: true }),
      },
    });
  }

  const xp = completionXp(occurrence);
  const event = await tx.progressEvent.create({
    data: {
      userId,
      sequence: state.nextEventSequence,
      awardKey: `completion:${occurrence.id}`,
      kind: 'COMPLETION',
      occurrenceId: occurrence.id,
      dayId: day.id,
      xpDelta: xp,
      healthDelta: health.healthDelta,
      ruleVersion: occurrence.ruleVersion,
      recordedAt: now,
    },
    select: { id: true },
  });
  const eventIds = [event.id];
  const seals = await unlockSeals(tx, {
    userId,
    now,
    state,
    day,
    occurrence,
    streak,
    eventIds,
  });
  const xpDelta = xp + seals.reduce((total, seal) => total + seal.bonusXp, 0);
  const saved = await tx.playerState.update({
    where: { userId },
    data: {
      totalXp: { increment: xpDelta },
      health: health.health,
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      nextEventSequence: { increment: eventIds.length },
      stateVersion: { increment: 1 },
    },
  });
  return response(
    'completed',
    completed,
    saved,
    xpDelta,
    health.healthDelta,
    eventIds,
    seals,
  );
}

async function unlockSeals(
  tx,
  { userId, now, state, day, occurrence, streak, eventIds },
) {
  const lifetimeCompletions = await tx.questOccurrence.count({
    where: { userId, status: 'COMPLETED' },
  });
  const unlocked = await tx.userAchievement.findMany({
    where: { userId },
    select: { achievementCode: true },
  });
  const seals = eligibleSeals({
    ...streak,
    lifetimeCompletions,
    unlockedCodes: unlocked.map(({ achievementCode }) => achievementCode),
  });
  for (const { code, ruleVersion, bonusXp } of seals) {
    await tx.userAchievement.create({
      data: {
        userId,
        achievementCode: code,
        ruleVersion,
        bonusXp,
        unlockedAt: now,
        qualifyingDayId: day.id,
        qualifyingOccurrenceId: occurrence.id,
      },
    });
    const bonus = await tx.progressEvent.create({
      data: {
        userId,
        sequence: state.nextEventSequence + eventIds.length,
        awardKey: `seal:${code}`,
        kind: 'SEAL',
        sealCode: code,
        dayId: day.id,
        occurrenceId: occurrence.id,
        xpDelta: bonusXp,
        healthDelta: 0,
        ruleVersion,
        recordedAt: now,
      },
      select: { id: true },
    });
    eventIds.push(bonus.id);
  }
  return seals;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string, tokenHash: string}} actor Authenticated account and server-derived session digest.
 * @param {string} rawOccurrenceId
 * @param {unknown} body
 * @returns {Promise<object>} Committed response, saved replay, or bounded catch-up result.
 */
export async function completeOccurrence(prisma, actor, rawOccurrenceId, body) {
  const auth = identity.safeParse(actor);
  if (!auth.success) throw sessionInvalid();
  const { userId, tokenHash } = auth.data;
  const occurrenceId = occurrenceIdSchema.parse(rawOccurrenceId);
  const { operationId } = completionRequestSchema.parse(body);
  await assertSession(prisma, userId, tokenHash, await readServerClock(prisma));
  const requestHash = createHash('sha256')
    .update(
      JSON.stringify([
        'POST',
        '/api/v1/occurrences/:id/complete',
        occurrenceId,
        { operationId },
      ]),
    )
    .digest('hex');

  return withProgressionLock(prisma, userId, async (tx) => {
    await assertSession(tx, userId, tokenHash, await readServerClock(tx));
    const key = { userId, operationId };
    const previous = await tx.completionReceipt.findUnique({
      where: { userId_operationId: key },
    });
    if (previous) {
      if (previous.requestHash !== requestHash) {
        throw new ProgressionError(
          409,
          'OPERATION_CONFLICT',
          'Operation ID was already used for different input.',
        );
      }
      return previous.responseBody;
    }

    const { day, occurrence } = await lockOccurrence(tx, userId, occurrenceId);
    const now = await readServerClock(tx);
    await assertSession(tx, userId, tokenHash, now);
    const state = await tx.playerState.findUniqueOrThrow({ where: { userId } });
    let result;
    if (occurrence.status === 'COMPLETED') {
      result = response('alreadyCompleted', occurrence, state);
    } else {
      if (day.closedAt || now >= day.deadlineUtc) {
        throw new ProgressionError(
          409,
          'DAY_EXPIRED',
          'The completion deadline has passed.',
        );
      }
      if (now < day.startsAtUtc || (await oldestOverdueDay(tx, userId, now))) {
        return {
          status: 'catching-up',
          retryAfterSeconds: CATCH_UP_RETRY_AFTER_SECONDS,
        };
      }
      result = await applyOccurrence(tx, {
        userId,
        now,
        state,
        day,
        occurrence,
      });
    }
    await tx.completionReceipt.create({
      data: { ...key, requestHash, responseBody: result, createdAt: now },
    });
    return result;
  });
}
