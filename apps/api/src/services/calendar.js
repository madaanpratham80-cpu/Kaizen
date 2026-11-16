import { ianaTimezoneSchema, z } from '@kaizen/contracts';
import { Temporal } from '@js-temporal/polyfill';
import {
  dateColumn,
  dayBounds,
  firstTransitionDate,
  localDateAt,
  plainDate,
} from '../domain/calendar.js';
import { readServerClock, withPlayerLock } from './player-lock.js';
import { REWARD_XP } from '../domain/quest-rules.js';
const BATCH_LIMIT = 30;
const RETRY_AFTER_SECONDS = 1;
const restInput = z.strictObject({
  effectiveFrom: z.iso.date(),
  restWeekdays: z
    .array(z.number().int().min(1).max(7))
    .max(7)
    .refine(
      (days) => days.length === new Set(days).size,
      'Weekdays must be unique',
    ),
});
/** @typedef {{ userId: string }} Owner */
export class CalendarError extends Error {
  status;
  code;
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
function locked(prisma, { userId }, work, clock = readServerClock) {
  return withPlayerLock(
    prisma,
    userId,
    () =>
      new CalendarError(
        503,
        'PLAYER_STATE_UNAVAILABLE',
        'Player state is temporarily unavailable.',
      ),
    async (tx) => work(tx, await clock(tx)),
  );
}
const latestDay = (tx, userId) =>
  tx.dayPlan.findFirst({ where: { userId }, orderBy: { localDate: 'desc' } });
const pendingTransition = (tx, userId) =>
  tx.calendarTimezoneTransition.findFirst({
    where: { userId, appliedAt: null },
  });
/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */
/**
 * @param {PrismaClient} prisma
 * @param {Owner} owner
 * @param {unknown} raw
 * @returns {Promise<import('@prisma/client').DayPreferenceVersion>}
 */
export function setPlannedRest(prisma, owner, raw) {
  const input = restInput.parse(raw);
  const { userId } = owner;
  return locked(prisma, owner, async (tx, now) => {
    const { timezone } = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });
    const effectiveFrom = dateColumn(
      Temporal.PlainDate.from(input.effectiveFrom),
    );
    if (
      effectiveFrom <= dateColumn(localDateAt(now, timezone)) ||
      (await tx.dayPlan.findUnique({
        where: { userId_localDate: { userId, localDate: effectiveFrom } },
        select: { id: true },
      }))
    ) {
      throw new CalendarError(
        409,
        'INVALID_EFFECTIVE_DATE',
        'Select a future date with no opened plan.',
      );
    }
    const previous = await tx.dayPreferenceVersion.findFirst({
      where: { userId },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (
      previous &&
      (previous.effectiveFrom >= effectiveFrom ||
        (previous.effectiveTo && previous.effectiveTo > effectiveFrom))
    ) {
      throw new CalendarError(
        409,
        'REST_VERSION_CONFLICT',
        'Rest preferences must follow the latest version.',
      );
    }
    if (previous && previous.effectiveTo === null) {
      await tx.dayPreferenceVersion.update({
        where: {
          userId_effectiveFrom: {
            userId,
            effectiveFrom: previous.effectiveFrom,
          },
        },
        data: { effectiveTo: effectiveFrom },
      });
    }
    return tx.dayPreferenceVersion.create({
      data: {
        userId,
        effectiveFrom,
        restWeekdays: [...input.restWeekdays].sort((a, b) => a - b),
      },
    });
  });
}
/**
 * @param {PrismaClient} prisma
 * @param {Owner} owner
 * @param {unknown} raw
 * @param {typeof readServerClock} [clock]
 * @returns {Promise<import('@prisma/client').CalendarTimezoneTransition | null>}
 */
export function scheduleTimezoneTransition(
  prisma,
  owner,
  raw,
  clock = readServerClock,
) {
  const toTimezone = ianaTimezoneSchema.parse(raw);
  const { userId } = owner;
  return locked(
    prisma,
    owner,
    async (tx, now) => {
      const existing = await pendingTransition(tx, userId);
      if (existing) {
        if (existing.toTimezone === toTimezone) return existing;
        throw new CalendarError(
          409,
          'TIMEZONE_CHANGE_PENDING',
          'A timezone change is already pending.',
        );
      }
      const { timezone } = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { timezone: true },
      });
      if (timezone === toTimezone) return null;
      const day = await latestDay(tx, userId);
      if (!day || day.startsAtUtc > now || day.deadlineUtc <= now) {
        throw new CalendarError(
          409,
          'CALENDAR_NOT_READY',
          'Sync the calendar before changing timezone.',
        );
      }
      const next = firstTransitionDate(
        plainDate(day.localDate),
        day.deadlineUtc,
        toTimezone,
      );
      return tx.calendarTimezoneTransition.create({
        data: {
          userId,
          fromTimezone: timezone,
          toTimezone,
          lastOldDate: day.localDate,
          gapStartsAt: day.deadlineUtc,
          ...next,
        },
      });
    },
    clock,
  );
}
function effectiveOn(date) {
  return {
    effectiveFrom: { lte: date },
    OR: [{ effectiveTo: null }, { effectiveTo: { gt: date } }],
  };
}
async function openPlan(tx, userId, timezone, date) {
  const localDate = dateColumn(date);
  const rest = await tx.dayPreferenceVersion.findFirst({
    where: { userId, ...effectiveOn(localDate) },
  });
  const resting = rest?.restWeekdays.includes(date.dayOfWeek) ?? false;
  const rules = resting
    ? []
    : await tx.scheduleVersion.findMany({
        where: {
          userId,
          ...effectiveOn(localDate),
          AND: [
            {
              OR: [
                { recurrence: 'DAILY' },
                { recurrence: 'WEEKLY', weekdays: { has: date.dayOfWeek } },
              ],
            },
          ],
          quest: {
            OR: [
              { archiveEffectiveDate: null },
              { archiveEffectiveDate: { gt: localDate } },
            ],
          },
        },
        orderBy: { questId: 'asc' },
      });
  const plan = await tx.dayPlan.create({
    data: {
      userId,
      localDate,
      timezoneSnapshot: timezone,
      ...dayBounds(date, timezone),
      plannedCount: rules.length,
      status: resting ? 'REST' : rules.length ? 'OPEN' : 'EMPTY',
    },
  });
  if (!rules.length) return plan;
  const occurrences = await tx.questOccurrence.createManyAndReturn({
    data: rules.map(
      ({
        questId,
        title,
        category,
        pillar,
        difficulty,
        target,
        ruleVersion,
      }) => ({
        userId,
        dayPlanId: plan.id,
        questId,
        title,
        category,
        pillar,
        difficulty,
        target,
        ruleVersion,
        rewardXp: REWARD_XP[difficulty],
        planned: true,
      }),
    ),
    select: { id: true, questId: true },
  });
  const priority = occurrences.find(
    ({ questId }) => questId === rules[0].questId,
  );
  if (!priority) throw new Error('Expected a planned priority occurrence');
  return tx.dayPlan.update({
    where: { userId_id: { userId, id: plan.id } },
    data: { priorityId: priority.id },
  });
}
async function syncOne(tx, userId, now) {
  let { timezone, createdAt } = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { timezone: true, createdAt: true },
  });
  const last = await latestDay(tx, userId);
  if (last && last.startsAtUtc <= now && now < last.deadlineUtc) {
    return { status: 'ready', plan: last };
  }
  if (last && last.startsAtUtc > now) return { status: 'wait' };
  let date = last
    ? plainDate(last.localDate).add({ days: 1 })
    : localDateAt(createdAt, timezone);
  const transition = await pendingTransition(tx, userId);
  if (
    transition &&
    last?.localDate.getTime() === transition.lastOldDate.getTime()
  ) {
    if (now < transition.effectiveAt) return { status: 'wait' };
    date = plainDate(transition.firstNewDate);
    timezone = transition.toTimezone;
    await tx.user.update({ where: { id: userId }, data: { timezone } });
    await tx.calendarTimezoneTransition.update({
      where: { id: transition.id, userId },
      data: { appliedAt: now },
    });
  }
  let bounds = dayBounds(date, timezone);
  // Some IANA transitions skip an entire local date.
  while (bounds.startsAtUtc.getTime() === bounds.deadlineUtc.getTime()) {
    date = date.add({ days: 1 });
    bounds = dayBounds(date, timezone);
  }
  if (bounds.startsAtUtc > now) return { status: 'wait' };
  const plan = await openPlan(tx, userId, timezone, date);
  return now < plan.deadlineUtc
    ? { status: 'ready', plan }
    : { status: 'advance' };
}
/**
 * @param {PrismaClient} prisma
 * @param {Owner} owner
 * @param {typeof readServerClock} [clock]
 * @returns {Promise<{status: 'ready', plan: import('@prisma/client').DayPlan} | {status: 'catching-up', retryAfterSeconds: number}>}
 */
export async function syncCalendar(prisma, owner, clock = readServerClock) {
  for (let count = 0; count < BATCH_LIMIT; count += 1) {
    const step = await locked(
      prisma,
      owner,
      (tx, now) => syncOne(tx, owner.userId, now),
      clock,
    );
    if (step.status === 'ready') return { status: 'ready', plan: step.plan };
    if (step.status === 'wait') break;
  }
  return {
    status: 'catching-up',
    retryAfterSeconds: RETRY_AFTER_SECONDS,
  };
}
