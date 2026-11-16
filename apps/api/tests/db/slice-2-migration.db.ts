import { expect, it } from 'vitest';
import { useAuthDatabase } from './auth-fixture.js';

const { prisma, register } = useAuthDatabase();
const date = (day: number) => new Date(Date.UTC(2026, 10, day));
const snapshot = {
  title: 'Read',
  category: 'Academic',
  pillar: 'Cognitive',
  difficulty: 'EASY',
  target: 1,
  ruleVersion: 1,
} as const;

it('slice-2-migration enforces ownership, ranges, uniqueness and value checks', async () => {
  const first = (await register()).user.id;
  const second = (await register()).user.id;
  const quest = {
    userId: first,
    title: snapshot.title,
    category: snapshot.category,
    pillar: snapshot.pillar,
  };
  try {
    await prisma.playerState.upsert({
      where: { userId: first },
      create: { userId: first },
      update: {},
    });
    await expect(
      prisma.playerState.create({ data: { userId: first } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.playerState.update({
        where: { userId: first },
        data: { health: 101 },
      }),
    ).rejects.toThrow('PlayerState_values_check');
    const [one, two] = await Promise.all([
      prisma.quest.create({ data: quest }),
      prisma.quest.create({ data: quest }),
    ]);
    const rule = {
      ...snapshot,
      userId: first,
      questId: one.id,
      recurrence: 'DAILY',
      effectiveFrom: date(1),
      effectiveTo: date(5),
    };
    await prisma.scheduleVersion.create({ data: rule });
    await prisma.scheduleVersion.create({
      data: { ...rule, effectiveFrom: date(5), effectiveTo: null },
    });
    await prisma.scheduleVersion.create({ data: { ...rule, questId: two.id } });
    await expect(
      prisma.scheduleVersion.create({
        data: { ...rule, effectiveFrom: date(3) },
      }),
    ).rejects.toThrow('ScheduleVersion_no_overlap');
    await expect(
      prisma.scheduleVersion.create({
        data: { ...rule, effectiveFrom: date(6), effectiveTo: date(6) },
      }),
    ).rejects.toThrow('ScheduleVersion_values_check');
    await expect(
      prisma.scheduleVersion.create({ data: { ...rule, userId: second } }),
    ).rejects.toMatchObject({ code: 'P2003' });

    const rest = {
      userId: first,
      effectiveFrom: date(1),
      effectiveTo: date(5),
      restWeekdays: [7],
    };
    await prisma.dayPreferenceVersion.create({ data: rest });
    await prisma.dayPreferenceVersion.create({
      data: { ...rest, userId: second },
    });
    await expect(
      prisma.dayPreferenceVersion.create({
        data: { ...rest, effectiveFrom: date(3) },
      }),
    ).rejects.toThrow('DayPreferenceVersion_no_overlap');

    const plan = {
      userId: first,
      localDate: date(1),
      timezoneSnapshot: 'UTC',
      startsAtUtc: date(1),
      deadlineUtc: date(2),
      status: 'OPEN',
    } as const;
    const day = await prisma.dayPlan.create({ data: plan });
    const later = await prisma.dayPlan.create({
      data: {
        ...plan,
        localDate: date(2),
        startsAtUtc: date(2),
        deadlineUtc: date(3),
      },
    });
    const foreign = await prisma.dayPlan.create({
      data: { ...plan, userId: second },
    });
    await expect(prisma.dayPlan.create({ data: plan })).rejects.toMatchObject({
      code: 'P2002',
    });
    await expect(
      prisma.dayPlan.create({
        data: { ...plan, localDate: date(3), deadlineUtc: date(1) },
      }),
    ).rejects.toThrow('DayPlan_values_check');
    const occurrence = {
      ...snapshot,
      rewardXp: 10,
      userId: first,
      dayPlanId: day.id,
      questId: one.id,
      planned: true,
    };
    const created = await prisma.questOccurrence.create({ data: occurrence });
    await expect(
      prisma.questOccurrence.create({ data: occurrence }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.questOccurrence.create({
        data: { ...occurrence, dayPlanId: foreign.id },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      prisma.dayPlan.update({
        where: { id: later.id },
        data: { priorityId: created.id },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      prisma.dayPlan.update({
        where: { id: foreign.id },
        data: { priorityId: created.id },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await prisma.dayPlan.update({
      where: { id: day.id },
      data: { priorityId: created.id },
    });

    const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
    `;
    expect(indexes.map(({ indexname }) => indexname)).toEqual(
      expect.arrayContaining([
        'DayPlan_unclosed_deadline_idx',
        'Quest_userId_archivedAt_idx',
        'QuestOccurrence_dayPlanId_status_idx',
        'ScheduleVersion_userId_questId_effectiveFrom_key',
        'DayPreferenceVersion_userId_effectiveFrom_key',
      ]),
    );
  } finally {
    const owned = { userId: { in: [first, second] } };
    await prisma.$transaction([
      prisma.dayPlan.updateMany({ where: owned, data: { priorityId: null } }),
      prisma.questOccurrence.deleteMany({ where: owned }),
      prisma.dayPlan.deleteMany({ where: owned }),
      prisma.scheduleVersion.deleteMany({ where: owned }),
      prisma.quest.deleteMany({ where: owned }),
      prisma.dayPreferenceVersion.deleteMany({ where: owned }),
      prisma.playerState.deleteMany({ where: owned }),
    ]);
  }
});
