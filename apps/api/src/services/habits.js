import { Temporal } from '@js-temporal/polyfill';
import { dateColumn, dayBounds } from '../domain/calendar.js';
import { habitStreak } from '../domain/habit-streak.js';
import { readServerClock } from './player-lock.js';
import { ProgressionError } from './progression-store.js';

const WEEK_DAYS = 7;
const datesInWeek = (start) =>
  Array.from({ length: WEEK_DAYS }, (_, days) => start.add({ days }));
const inEffect = (rule, date) =>
  rule.effectiveFrom <= date && (!rule.effectiveTo || date < rule.effectiveTo);
const overlaps = (start, end) => ({
  effectiveFrom: { lte: end },
  OR: [{ effectiveTo: null }, { effectiveTo: { gt: start } }],
});

function zoneOn(date, transitions, currentZone) {
  const next = transitions.find(({ firstNewDate }) => firstNewDate > date);
  if (next) {
    return { timezone: next.fromTimezone, excused: date > next.lastOldDate };
  }
  return {
    timezone: transitions.at(-1)?.toTimezone ?? currentZone,
    excused: false,
  };
}

function summarizeDate(
  date,
  { account, plans, schedules, rest, transitions, now },
) {
  const local = dateColumn(date);
  const saved = plans.find(
    ({ localDate }) => localDate.getTime() === local.getTime(),
  );
  if (saved) {
    const { id, status, startsAtUtc, deadlineUtc, occurrences } = saved;
    return {
      date: date.toString(),
      id,
      status,
      timing:
        now >= deadlineUtc
          ? 'elapsed'
          : now >= startsAtUtc
            ? 'today'
            : 'future',
      occurrences: occurrences.map(
        ({ id, questId, title, target, status }) => ({
          id,
          questId,
          title,
          target,
          status,
        }),
      ),
    };
  }
  const { timezone, excused } = zoneOn(local, transitions, account.timezone);
  const { startsAtUtc, deadlineUtc } = dayBounds(date, timezone);
  const timing =
    now >= deadlineUtc ? 'elapsed' : now >= startsAtUtc ? 'today' : 'future';
  if (excused || startsAtUtc.getTime() === deadlineUtc.getTime()) {
    return {
      date: date.toString(),
      id: null,
      status: 'EXCUSED',
      timing,
      occurrences: [],
    };
  }
  const beforeAccount = account.createdAt >= deadlineUtc;
  const resting =
    !beforeAccount &&
    rest.some(
      (rule) =>
        inEffect(rule, local) && rule.restWeekdays.includes(date.dayOfWeek),
    );
  const occurrences =
    beforeAccount || resting
      ? []
      : schedules
          .filter(
            (rule) =>
              inEffect(rule, local) &&
              (!rule.quest.archiveEffectiveDate ||
                local < rule.quest.archiveEffectiveDate) &&
              (rule.recurrence === 'DAILY' ||
                rule.weekdays.includes(date.dayOfWeek)),
          )
          .map(({ questId, title, target }) => ({
            id: null,
            questId,
            title,
            target,
            status: timing === 'elapsed' ? 'MISSED' : 'SCHEDULED',
          }));
  return {
    date: date.toString(),
    id: null,
    timing,
    status: beforeAccount
      ? null
      : resting
        ? 'REST'
        : occurrences.length
          ? 'SCHEDULED'
          : 'EMPTY',
    occurrences,
  };
}

async function readStreaks(tx, userId, account, end, now, days, weekSchedules) {
  const [plans, schedules, rest, transitions] = await Promise.all([
    tx.dayPlan.findMany({
      where: { userId, localDate: { lte: end } },
      include: {
        occurrences: {
          where: { userId, planned: true },
          orderBy: { questId: 'asc' },
        },
      },
      orderBy: { localDate: 'asc' },
    }),
    tx.scheduleVersion.findMany({
      where: { userId, effectiveFrom: { lte: end } },
      include: { quest: { select: { archiveEffectiveDate: true } } },
      orderBy: { effectiveFrom: 'asc' },
    }),
    tx.dayPreferenceVersion.findMany({
      where: { userId, effectiveFrom: { lte: end } },
    }),
    tx.calendarTimezoneTransition.findMany({
      where: { userId },
      orderBy: { firstNewDate: 'asc' },
    }),
  ]);
  const habits = new Map();
  for (const item of weekSchedules)
    habits.set(item.questId, { questId: item.questId, title: item.title });
  for (const day of days) {
    for (const item of day.occurrences)
      habits.set(item.questId, { questId: item.questId, title: item.title });
  }
  const histories = new Map([...habits.keys()].map((id) => [id, []]));
  const initialZone = transitions[0]?.fromTimezone ?? account.timezone;
  let date = Temporal.Instant.from(account.createdAt.toISOString())
    .toZonedDateTimeISO(initialZone)
    .toPlainDate();
  const today = Temporal.Instant.from(now.toISOString())
    .toZonedDateTimeISO(account.timezone)
    .toPlainDate();
  const last = Temporal.PlainDate.from(end.toISOString().slice(0, 10));
  // Stored snapshots remain authoritative even when a fixture predates account creation.
  if (plans[0] && plans[0].localDate < dateColumn(date))
    date = Temporal.PlainDate.from(
      plans[0].localDate.toISOString().slice(0, 10),
    );
  for (
    ;
    Temporal.PlainDate.compare(date, last) <= 0 &&
    Temporal.PlainDate.compare(date, today) <= 0;
    date = date.add({ days: 1 })
  ) {
    const day = summarizeDate(date, {
      account,
      plans,
      schedules,
      rest,
      transitions,
      now,
    });
    if (day.timing === 'future') continue;
    for (const item of day.occurrences) {
      const outcome =
        item.status === 'COMPLETED'
          ? 'COMPLETED'
          : day.timing === 'elapsed'
            ? 'MISSED'
            : 'PENDING';
      histories.get(item.questId)?.push(outcome);
    }
  }
  return [...habits.values()].map((habit) => ({
    ...habit,
    streak: habitStreak(histories.get(habit.questId)),
  }));
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string}} owner
 * @param {string} week First local date in ISO format.
 * @returns {Promise<object>}
 */
export function readHabitWeek(prisma, { userId }, week) {
  const dates = datesInWeek(Temporal.PlainDate.from(week));
  const start = dateColumn(dates[0]);
  const end = dateColumn(dates.at(-1));
  return prisma.$transaction(
    async (tx) => {
      const now = await readServerClock(tx);
      const account = await tx.user.findUnique({
        where: { id: userId },
        select: { timezone: true, createdAt: true },
      });
      if (!account)
        throw new ProgressionError(401, 'SESSION_INVALID', 'Invalid session.');
      const plans = await tx.dayPlan.findMany({
        where: { userId, localDate: { gte: start, lte: end } },
        include: {
          occurrences: {
            where: { userId, planned: true },
            orderBy: { questId: 'asc' },
          },
        },
      });
      const schedules = await tx.scheduleVersion.findMany({
        where: { userId, ...overlaps(start, end) },
        include: { quest: { select: { archiveEffectiveDate: true } } },
        orderBy: { questId: 'asc' },
      });
      const rest = await tx.dayPreferenceVersion.findMany({
        where: { userId, ...overlaps(start, end) },
      });
      const transitions = await tx.calendarTimezoneTransition.findMany({
        where: {
          userId,
          firstNewDate: { gt: start },
          lastOldDate: { lte: end },
        },
        orderBy: { firstNewDate: 'asc' },
      });
      const later = await tx.calendarTimezoneTransition.findFirst({
        where: { userId, lastOldDate: { gt: end } },
        orderBy: { lastOldDate: 'asc' },
      });
      if (later) transitions.push(later);
      if (!transitions.length) {
        const prior = await tx.calendarTimezoneTransition.findFirst({
          where: { userId, firstNewDate: { lte: start } },
          orderBy: { firstNewDate: 'desc' },
        });
        if (prior) transitions.push(prior);
      }
      const days = dates.map((date) =>
        summarizeDate(date, {
          account,
          plans,
          schedules,
          rest,
          transitions,
          now,
        }),
      );
      const scheduled = days
        .filter(({ timing }) => timing === 'elapsed')
        .flatMap(({ occurrences }) => occurrences);
      const completed = scheduled.filter(
        ({ status }) => status === 'COMPLETED',
      ).length;
      return {
        week,
        habits: await readStreaks(
          tx,
          userId,
          account,
          end,
          now,
          days,
          schedules,
        ),
        days,
        scheduled: scheduled.length,
        completed,
        compliance: scheduled.length ? completed / scheduled.length : null,
      };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
