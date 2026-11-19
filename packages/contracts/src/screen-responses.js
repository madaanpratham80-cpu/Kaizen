import { z } from 'zod';
import { ianaTimezoneSchema, publicUserSchema } from './auth.js';
import { HISTORY_DAYS } from './profile.js';
import { questCategorySchema, questDifficultySchema } from './quests.js';

const id = z.uuid();
const count = z.int().nonnegative();
const version = z.int().positive();
const localDate = z.iso.date();
const instant = z.iso.datetime();
const dayStatus = z.enum(['OPEN', 'ACTIVE', 'MISSED', 'REST', 'EMPTY']);
const occurrenceStatus = z.enum(['PENDING', 'COMPLETED']);
const pillar = z.enum(['Cognitive', 'Physical', 'Craft']);

/**
 * @template {z.ZodType} Data
 * @param {Data} data
 */
const envelope = (data) => z.strictObject({ data, requestId: id });

const progression = {
  health: count.max(100),
  totalXp: count,
  currentStreak: count,
  bestStreak: count,
  stateVersion: count,
};
const questFields = {
  title: z.string(),
  category: questCategorySchema,
  pillar,
};
const snapshotFields = {
  ...questFields,
  difficulty: questDifficultySchema,
  target: count,
  ruleVersion: version,
};
const plan = z.strictObject({
  id,
  userId: id,
  localDate: instant,
  timezoneSnapshot: ianaTimezoneSchema,
  startsAtUtc: instant,
  deadlineUtc: instant,
  status: dayStatus,
  priorityId: id.nullable(),
  priorityLockedAt: instant.nullable(),
  plannedCount: count,
  healthGainAccounted: count,
  streakApplied: z.boolean(),
  closedAt: instant.nullable(),
});
const occurrence = z.strictObject({
  id,
  userId: id,
  questId: id,
  dayPlanId: id,
  ...snapshotFields,
  planned: z.boolean(),
  status: occurrenceStatus,
  completedAt: instant.nullable(),
  rewardXp: count,
});
const recoveryHint = z.discriminatedUnion('code', [
  z.strictObject({ code: z.literal('SMALL_COMMITMENT'), occurrenceId: id }),
  z.strictObject({ code: z.literal('SIMPLER_FUTURE_PLAN') }),
]);

export const todayResponseSchema = envelope(
  z.strictObject({
    status: z.enum(['ready', 'catching-up']),
    plan: plan.nullable(),
    occurrences: z.array(occurrence),
    priority: occurrence.nullable(),
    ...progression,
    recoveryHint: recoveryHint.nullable(),
  }),
);

export const calendarSyncResponseSchema = envelope(
  z.discriminatedUnion('status', [
    z.strictObject({ status: z.literal('ready'), plan }),
    z.strictObject({
      status: z.literal('catching-up'),
      retryAfterSeconds: version,
    }),
  ]),
);

export const completionResponseSchema = envelope(
  z.union([
    z.strictObject({
      status: z.literal('catching-up'),
      retryAfterSeconds: version,
    }),
    z.strictObject({
      status: z.enum(['completed', 'alreadyCompleted']),
      occurrence: z.strictObject({
        id,
        status: z.literal('COMPLETED'),
        completedAt: instant,
      }),
      xpDelta: count,
      healthDelta: z.int(),
      eventIds: z.array(id),
      seals: z.array(
        z.strictObject({
          code: z.string().min(1),
          ruleVersion: version,
          bonusXp: count,
        }),
      ),
      ...progression,
    }),
  ]),
);

const schedule = z.strictObject({
  id,
  userId: id,
  questId: id,
  ...snapshotFields,
  effectiveFrom: instant,
  effectiveTo: instant.nullable(),
  recurrence: z.enum(['DAILY', 'WEEKLY']),
  weekdays: z.array(z.int().min(1).max(7)).max(7),
});
const quest = z.strictObject({
  id,
  userId: id,
  ...questFields,
  archivedAt: instant.nullable(),
  archiveEffectiveDate: instant.nullable(),
  version,
  schedules: z.array(schedule).max(1),
});
export const questsResponseSchema = envelope(
  z.strictObject({ quests: z.array(quest), nextCursor: id.nullable() }),
);
export const questMutationResponseSchema = envelope(
  quest.omit({ schedules: true }),
);

const habitOccurrence = z.strictObject({
  id: id.nullable(),
  questId: id,
  title: z.string(),
  target: count,
  status: z.union([occurrenceStatus, z.enum(['MISSED', 'SCHEDULED'])]),
});
const habitDay = z.strictObject({
  date: localDate,
  id: id.nullable(),
  status: z.union([dayStatus, z.enum(['EXCUSED', 'SCHEDULED'])]).nullable(),
  timing: z.enum(['elapsed', 'today', 'future']),
  occurrences: z.array(habitOccurrence),
});
export const habitsResponseSchema = envelope(
  z.strictObject({
    week: localDate,
    habits: z.array(
      z.strictObject({
        questId: id,
        title: z.string(),
        streak: z.strictObject({ current: count, best: count }),
        completionRate: z.number().min(0).max(1).nullable(),
        cells: z
          .array(
            z.strictObject({
              date: localDate,
              label: z.enum([
                'Completed',
                'Missed',
                'Rest',
                'Excused',
                'Not scheduled',
                'Pending',
                'Scheduled',
              ]),
            }),
          )
          .length(7),
      }),
    ),
    days: z.array(habitDay).length(7),
    scheduled: count,
    completed: count,
    compliance: z.number().min(0).max(1).nullable(),
  }),
);

const seal = z.strictObject({
  achievementCode: z.string().min(1),
  ruleVersion: version,
  unlockedAt: instant,
  qualifyingOccurrenceId: id.nullable(),
  qualifyingDayId: id.nullable(),
  bonusXp: count,
});
const rank = z.strictObject({
  title: z.string().min(1),
  minimumLevel: version,
  ruleVersion: version,
});
const deltas = { xpDelta: z.int(), healthDelta: z.int() };
const ledgerEntry = z.strictObject({
  id,
  sequence: version,
  kind: z.string().min(1),
  ...deltas,
  ruleVersion: version,
  recordedAt: instant,
  dayId: id.nullable(),
  occurrenceId: id.nullable(),
  sealCode: z.string().nullable(),
  title: z.string().nullable(),
  pillar: pillar.nullable(),
  localDate,
});
export const progressResponseSchema = envelope(
  z.strictObject({
    window: z.strictObject({ from: localDate, to: localDate }),
    aggregates: z.array(
      z.strictObject({ localDate, ...deltas, completions: count }),
    ),
    heatmap: z
      .array(
        z.strictObject({
          localDate,
          status: dayStatus.nullable(),
          completions: count,
        }),
      )
      .length(HISTORY_DAYS),
    ledger: z.array(ledgerEntry),
    nextCursor: z.string().min(1).nullable(),
    seals: z.array(seal),
    rank,
    stateVersion: count,
    pillarTotals: z.array(z.strictObject({ pillar, xp: count })),
  }),
);

export const profileResponseSchema = envelope(
  z.strictObject({
    user: publicUserSchema.extend({ goals: z.array(z.string()) }),
    ...progression,
    level: version,
    xpIntoLevel: count,
    rank,
    seals: z.array(seal),
    pillarTotals: z.array(z.strictObject({ pillar, xp: count })),
  }),
);
