import { Prisma } from '@prisma/client';
import {
  questFields,
  QUEST_RULE_VERSION,
  REWARD_XP,
} from '../domain/quest-rules.js';
import { CalendarError } from './calendar.js';
import { readServerClock, withPlayerLock } from './player-lock.js';
import { findCurrentPlan } from './today.js';

const DAILY_QUICK_QUEST_LIMIT = 20;
const missingState = () =>
  new CalendarError(
    503,
    'PLAYER_STATE_UNAVAILABLE',
    'Player state is temporarily unavailable.',
  );
const resourceConflict = () =>
  new CalendarError(
    409,
    'QUICK_QUEST_CONFLICT',
    'This Quick Quest identifier cannot be reused.',
  );

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string}} owner
 * @param {import('@kaizen/contracts').z.infer<typeof import('@kaizen/contracts').quickQuestSchema>} input
 * @returns {Promise<{created: boolean, occurrence: import('@prisma/client').QuestOccurrence}>}
 */
export async function createQuickQuest(
  prisma,
  { userId },
  { id, title, category, difficulty, target },
) {
  try {
    return await withPlayerLock(prisma, userId, missingState, async (tx) => {
      const previous = await tx.questOccurrence.findFirst({
        where: { id, userId },
      });
      if (previous) {
        if (
          previous.planned ||
          previous.title !== title ||
          previous.category !== category ||
          previous.difficulty !== difficulty ||
          previous.target !== target
        )
          throw resourceConflict();
        return { created: false, occurrence: previous };
      }
      const plan = await findCurrentPlan(tx, userId, await readServerClock(tx));
      if (!plan)
        throw new CalendarError(
          409,
          'CALENDAR_NOT_READY',
          'Sync the calendar before creating a Quick Quest.',
        );
      const count = await tx.questOccurrence.count({
        where: { userId, dayPlanId: plan.id, planned: false },
      });
      if (count >= DAILY_QUICK_QUEST_LIMIT) {
        throw new CalendarError(
          409,
          'QUICK_QUEST_LIMIT',
          'Daily Quick Quest limit reached.',
        );
      }
      const fields = questFields({ title, category });
      const quest = await tx.quest.create({ data: { ...fields, userId } });
      const occurrence = await tx.questOccurrence.create({
        data: {
          id,
          ...fields,
          userId,
          dayPlanId: plan.id,
          questId: quest.id,
          planned: false,
          difficulty,
          target,
          ruleVersion: QUEST_RULE_VERSION,
          rewardXp: REWARD_XP[difficulty],
        },
      });
      return { created: true, occurrence };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      error.meta?.modelName === 'QuestOccurrence' &&
      error.meta?.target?.includes('id')
    ) {
      throw resourceConflict();
    }
    throw error;
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string}} owner
 * @param {string} dayPlanId
 * @param {string} occurrenceId
 * @returns {Promise<import('@prisma/client').DayPlan>}
 */
export function changePriority(prisma, { userId }, dayPlanId, occurrenceId) {
  return withPlayerLock(prisma, userId, missingState, async (tx) => {
    const now = await readServerClock(tx);
    const where = { userId_id: { userId, id: dayPlanId } };
    const plan = await tx.dayPlan.findUnique({ where });
    if (!plan)
      throw new CalendarError(404, 'DAY_PLAN_NOT_FOUND', 'Day plan not found.');
    if (
      plan.priorityLockedAt ||
      plan.closedAt ||
      plan.status !== 'OPEN' ||
      now < plan.startsAtUtc ||
      now >= plan.deadlineUtc
    ) {
      throw new CalendarError(
        409,
        'PRIORITY_LOCKED',
        'Priority can only change on an open, unlocked day.',
      );
    }
    const occurrence = await tx.questOccurrence.findUnique({
      where: { userId_dayPlanId_id: { userId, dayPlanId, id: occurrenceId } },
    });
    if (!occurrence)
      throw new CalendarError(
        404,
        'OCCURRENCE_NOT_FOUND',
        'Occurrence not found on this day.',
      );
    if (!occurrence.planned)
      throw new CalendarError(
        409,
        'PRIORITY_UNPLANNED',
        'Priority must be a planned occurrence.',
      );
    return tx.dayPlan.update({ where, data: { priorityId: occurrence.id } });
  });
}
