import { afterEach, expect, it } from 'vitest';
import {
  scheduleTimezoneTransition,
  setPlannedRest,
  syncCalendar,
} from '../../src/services/calendar.js';
import { useAuthDatabase } from './auth-fixture.js';
import { registerAccount } from '../../src/services/registration.js';
const { prisma, register } = useAuthDatabase();
const ids = [];
const instant = (date) => new Date(`${date}T12:00:00Z`);
const day = (date) => new Date(`${date}T00:00:00Z`);
const clock = (date) => async () => instant(date);
afterEach(async () => {
  const where = { userId: { in: ids } };
  await prisma.$transaction([
    prisma.dayPlan.updateMany({ where, data: { priorityId: null } }),
    prisma.questOccurrence.deleteMany({ where }),
    prisma.dayPlan.deleteMany({ where }),
    prisma.scheduleVersion.deleteMany({ where }),
    prisma.dayPreferenceVersion.deleteMany({ where }),
    prisma.quest.deleteMany({ where }),
    prisma.calendarTimezoneTransition.deleteMany({ where }),
  ]);
  ids.length = 0;
});
async function owner(createdAt) {
  const { user } = await register();
  ids.push(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { createdAt: instant(createdAt) },
  });
  return { userId: user.id };
}
it('player-state-registration creates one baseline with the architecture defaults', async () => {
  const account = await owner('2026-11-01');
  expect(await prisma.playerState.findMany({ where: account })).toEqual([
    expect.objectContaining({
      health: 70,
      totalXp: 0,
      stateVersion: 0,
      nextEventSequence: 1,
    }),
  ]);
});
it('player-state-registration rolls back the account if baseline creation fails', async () => {
  const email = 'calendar-rollback@example.com';
  await prisma.$executeRaw`
    CREATE FUNCTION reject_calendar_test_baseline() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF EXISTS (SELECT 1 FROM "User" WHERE id = NEW."userId"
        AND "normalizedEmail" = 'calendar-rollback@example.com') THEN
        RAISE EXCEPTION 'calendar baseline rejected';
      END IF;
      RETURN NEW;
    END;
    $$
  `;
  try {
    await prisma.$executeRaw`
      CREATE TRIGGER reject_calendar_test_baseline BEFORE INSERT ON "PlayerState"
      FOR EACH ROW EXECUTE FUNCTION reject_calendar_test_baseline()
    `;
    await expect(
      registerAccount(prisma, {
        email,
        password: 'test password with spaces',
        timezone: 'UTC',
        gender: 'female',
        displayName: 'Test',
      }),
    ).rejects.toThrow('calendar baseline rejected');
    expect(await prisma.user.count({ where: { normalizedEmail: email } })).toBe(
      0,
    );
  } finally {
    await prisma.$executeRaw`DROP TRIGGER IF EXISTS reject_calendar_test_baseline ON "PlayerState"`;
    await prisma.$executeRaw`DROP FUNCTION reject_calendar_test_baseline()`;
  }
});
it('opens one successor when concurrent sync calls cross the prior deadline', async () => {
  const account = await owner('2026-11-16');
  const deadline = day('2026-11-17');
  const before = await syncCalendar(
    prisma,
    account,
    async () => new Date(deadline.getTime() - 1),
  );
  const [first, second] = await Promise.all([
    syncCalendar(prisma, account, async () => deadline),
    syncCalendar(prisma, account, async () => deadline),
  ]);
  expect(before).toMatchObject({ plan: { localDate: day('2026-11-16') } });
  expect(first).toMatchObject({ plan: { localDate: deadline } });
  expect(first).toEqual(second);
  expect(await prisma.dayPlan.count({ where: account })).toBe(2);
});
it('day-preference-history appends a boundary and refuses overlap and opened days', async () => {
  const account = await owner('2026-11-01');
  const from = '2099-01-01';
  const next = '2099-01-08';
  const original = await setPlannedRest(prisma, account, {
    effectiveFrom: from,
    restWeekdays: [7],
  });
  await setPlannedRest(prisma, account, {
    effectiveFrom: next,
    restWeekdays: [],
  });
  await expect(
    setPlannedRest(prisma, account, {
      effectiveFrom: '2099-01-04',
      restWeekdays: [1],
    }),
  ).rejects.toMatchObject({ code: 'REST_VERSION_CONFLICT' });
  const opened = day('2099-01-09');
  await prisma.dayPlan.create({
    data: {
      ...account,
      localDate: opened,
      startsAtUtc: opened,
      deadlineUtc: day('2099-01-10'),
      timezoneSnapshot: 'UTC',
      status: 'EMPTY',
    },
  });
  await expect(
    setPlannedRest(prisma, account, {
      effectiveFrom: '2099-01-09',
      restWeekdays: [1],
    }),
  ).rejects.toMatchObject({ code: 'INVALID_EFFECTIVE_DATE' });
  expect(
    await prisma.dayPreferenceVersion.findUnique({
      where: { id: original.id },
    }),
  ).toMatchObject({ restWeekdays: [7], effectiveTo: day(next) });
  expect(await prisma.dayPreferenceVersion.count({ where: account })).toBe(2);
});
it('day-materialization-postgres opens seven elapsed dates plus today once and preserves snapshots', async () => {
  const account = await owner('2026-11-01');
  const other = await owner('2026-11-01');
  const fields = { title: 'Read', category: 'Academic', pillar: 'Cognitive' };
  const quest = await prisma.quest.create({
    data: {
      ...account,
      ...fields,
      archivedAt: instant('2026-11-07'),
      archiveEffectiveDate: day('2026-11-08'),
    },
  });
  const rule = {
    ...account,
    ...fields,
    questId: quest.id,
    recurrence: 'DAILY',
    difficulty: 'EASY',
    ruleVersion: 1,
    target: 1,
  };
  await prisma.scheduleVersion.createMany({
    data: [
      {
        ...rule,
        effectiveFrom: day('2026-11-02'),
        effectiveTo: day('2026-11-06'),
      },
      {
        ...rule,
        title: 'New title',
        difficulty: 'HARD',
        effectiveFrom: day('2026-11-06'),
      },
    ],
  });
  await prisma.dayPreferenceVersion.create({
    data: {
      ...account,
      effectiveFrom: day('2026-11-04'),
      effectiveTo: day('2026-11-05'),
      restWeekdays: [3],
    },
  });
  const [a, b] = await Promise.all([
    syncCalendar(prisma, account, clock('2026-11-08')),
    syncCalendar(prisma, account, clock('2026-11-08')),
  ]);
  expect(a).toEqual(b);
  expect(a).toMatchObject({
    status: 'ready',
    plan: { localDate: day('2026-11-08'), status: 'EMPTY' },
  });
  const plans = await prisma.dayPlan.findMany({
    where: account,
    orderBy: { localDate: 'asc' },
    include: { occurrences: true },
  });
  expect(plans).toHaveLength(8);
  expect(plans[3]).toMatchObject({
    status: 'REST',
    plannedCount: 0,
    priorityId: null,
  });
  expect(plans[1].occurrences[0]).toMatchObject({
    title: 'Read',
    rewardXp: 10,
    planned: true,
  });
  expect(plans[5].occurrences[0]).toMatchObject({
    title: 'New title',
    rewardXp: 35,
    planned: true,
  });
  expect(plans[5].priorityId).toBe(plans[5].occurrences[0].id);
  await prisma.quest.update({
    where: { userId_id: { ...account, id: quest.id } },
    data: { title: 'Edited again' },
  });
  expect(await syncCalendar(prisma, account, clock('2026-11-08'))).toEqual(a);
  expect(
    await prisma.questOccurrence.findUnique({
      where: { id: plans[1].occurrences[0].id },
    }),
  ).toEqual(plans[1].occurrences[0]);
  expect(await prisma.dayPlan.count({ where: other })).toBe(0);
  expect(await prisma.dayPlan.count({ where: account })).toBe(8);
});
it('calendar-timezone-transition preserves an excused gap across batches and independent calls', async () => {
  const account = await owner('2026-11-16');
  await syncCalendar(prisma, account, clock('2026-11-16'));
  const [first, replay] = await Promise.all([
    scheduleTimezoneTransition(
      prisma,
      account,
      'Asia/Kolkata',
      clock('2026-11-16'),
    ),
    scheduleTimezoneTransition(
      prisma,
      account,
      'Asia/Kolkata',
      clock('2026-11-16'),
    ),
  ]);
  expect(first).toEqual(replay);
  expect(first).toMatchObject({ firstNewDate: day('2026-11-18') });
  await expect(
    scheduleTimezoneTransition(
      prisma,
      account,
      'America/Los_Angeles',
      clock('2026-11-16'),
    ),
  ).rejects.toMatchObject({ code: 'TIMEZONE_CHANGE_PENDING' });
  expect(
    await syncCalendar(prisma, account, clock('2026-11-17')),
  ).toMatchObject({ status: 'catching-up' });
  expect(await prisma.dayPlan.count({ where: account })).toBe(1);
  expect(
    await syncCalendar(prisma, account, clock('2027-01-31')),
  ).toMatchObject({ status: 'catching-up' });
  expect(await prisma.dayPlan.count({ where: account })).toBe(31);
  expect(
    await syncCalendar(prisma, account, clock('2027-01-31')),
  ).toMatchObject({ status: 'catching-up' });
  expect(
    await syncCalendar(prisma, account, clock('2027-01-31')),
  ).toMatchObject({ status: 'ready' });
  const plans = await prisma.dayPlan.findMany({
    where: account,
    orderBy: { localDate: 'asc' },
  });
  expect(plans).toHaveLength(76);
  expect(plans[0]).toMatchObject({
    localDate: day('2026-11-16'),
    timezoneSnapshot: 'UTC',
  });
  expect(plans[1]).toMatchObject({
    localDate: day('2026-11-18'),
    timezoneSnapshot: 'Asia/Kolkata',
  });
  expect(plans.at(-1)?.localDate).toEqual(day('2027-01-31'));
  expect(
    await prisma.calendarTimezoneTransition.findFirst({ where: account }),
  ).toMatchObject({
    lastOldDate: day('2026-11-16'),
    firstNewDate: day('2026-11-18'),
    appliedAt: instant('2027-01-31'),
  });
  expect(await prisma.playerState.findUnique({ where: account })).toMatchObject(
    { health: 70, currentStreak: 0, totalXp: 0 },
  );
});

it('applies a westward timezone transition once at the next unopened boundary', async () => {
  const account = await owner('2026-11-16');
  const before = await syncCalendar(prisma, account, clock('2026-11-16'));
  const transition = await scheduleTimezoneTransition(
    prisma,
    account,
    'America/Los_Angeles',
    clock('2026-11-16'),
  );
  expect(transition).toMatchObject({
    firstNewDate: day('2026-11-17'),
    gapStartsAt: before.plan.deadlineUtc,
    effectiveAt: new Date('2026-11-17T08:00:00Z'),
  });
  const at = async () => transition.effectiveAt;
  const [first, second] = await Promise.all([
    syncCalendar(prisma, account, at),
    syncCalendar(prisma, account, at),
  ]);
  expect(first).toEqual(second);
  expect(first.plan).toMatchObject({
    localDate: day('2026-11-17'),
    timezoneSnapshot: 'America/Los_Angeles',
  });
  expect(
    await prisma.dayPlan.findUnique({ where: { id: before.plan.id } }),
  ).toEqual(before.plan);
  expect(await prisma.dayPlan.count({ where: account })).toBe(2);
  expect(
    await prisma.calendarTimezoneTransition.findUnique({
      where: { id: transition.id },
    }),
  ).toMatchObject({ appliedAt: transition.effectiveAt });
});
