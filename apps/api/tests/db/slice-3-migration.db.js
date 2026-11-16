import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { useAuthDatabase } from './auth-fixture.js';

const { prisma, register } = useAuthDatabase();
const date = (day) => new Date(Date.UTC(2026, 10, day));
const fields = { title: 'Read', category: 'Academic', pillar: 'Cognitive' };

async function createDay(userId, day) {
  return prisma.dayPlan.create({
    data: {
      userId,
      localDate: date(day),
      timezoneSnapshot: 'UTC',
      startsAtUtc: date(day),
      deadlineUtc: date(day + 1),
      status: 'OPEN',
    },
  });
}

async function createOccurrence(userId, dayPlanId) {
  const quest = await prisma.quest.create({ data: { ...fields, userId } });
  return prisma.questOccurrence.create({
    data: {
      ...fields,
      userId,
      dayPlanId,
      questId: quest.id,
      planned: true,
      difficulty: 'EASY',
      target: 1,
      rewardXp: 10,
      ruleVersion: 1,
    },
  });
}

it('slice-3-migration enforces ledger keys, receipt identity, and achievement provenance', async () => {
  const first = (await register()).user.id;
  const second = (await register()).user.id;
  const owned = { userId: { in: [first, second] } };
  const code = randomUUID();
  const operationId = randomUUID();
  try {
    for (const userId of [first, second]) {
      expect(
        await prisma.playerState.findUnique({ where: { userId } }),
      ).toMatchObject({
        stateVersion: 0,
        nextEventSequence: 1,
      });
    }
    for (const data of [{ stateVersion: -1 }, { nextEventSequence: 0 }]) {
      await expect(
        prisma.playerState.update({ where: { userId: first }, data }),
      ).rejects.toThrow('PlayerState_values_check');
    }
    const day = await createDay(first, 1);
    const otherDay = await createDay(first, 2);
    const foreignDay = await createDay(second, 1);
    const quest = await createOccurrence(first, day.id);
    const foreignQuest = await createOccurrence(second, foreignDay.id);
    const event = {
      userId: first,
      sequence: 1,
      awardKey: 'complete:first',
      kind: 'COMPLETION',
      dayId: day.id,
      occurrenceId: quest.id,
      xpDelta: 10,
      healthDelta: 5,
      ruleVersion: 1,
    };
    await prisma.progressEvent.create({ data: event });
    await prisma.progressEvent.create({
      data: {
        ...event,
        userId: second,
        dayId: foreignDay.id,
        occurrenceId: foreignQuest.id,
      },
    });
    await expect(
      prisma.progressEvent.create({ data: { ...event, awardKey: 'other' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    for (const refs of [
      { dayId: otherDay.id },
      { dayId: foreignDay.id },
      { dayId: null, occurrenceId: foreignQuest.id },
    ]) {
      await expect(
        prisma.progressEvent.create({
          data: { ...event, sequence: 2, awardKey: 'bad-reference', ...refs },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }
    const receipt = {
      userId: first,
      operationId,
      requestHash: 'a'.repeat(64),
      responseBody: { ok: true },
    };
    await prisma.completionReceipt.create({ data: receipt });
    await prisma.completionReceipt.create({
      data: { ...receipt, userId: second },
    });
    await expect(
      prisma.completionReceipt.create({ data: receipt }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.completionReceipt.create({
        data: {
          ...receipt,
          operationId: randomUUID(),
          requestHash: 'x'.repeat(64),
        },
      }),
    ).rejects.toThrow('CompletionReceipt_hash_check');
    await prisma.completionReceipt.delete({
      where: { userId_operationId: { userId: first, operationId } },
    });
    await expect(
      prisma.progressEvent.create({ data: { ...event, sequence: 2 } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await prisma.achievement.createMany({
      data: [1, 2].map((ruleVersion) => ({
        code,
        ruleVersion,
        eligibilityRule: { min: 7 },
      })),
    });
    const unlock = {
      userId: first,
      achievementCode: code,
      ruleVersion: 1,
      bonusXp: 25,
      qualifyingDayId: day.id,
      qualifyingOccurrenceId: quest.id,
    };
    for (const invalid of [
      { ruleVersion: 3 },
      { qualifyingDayId: otherDay.id },
      { qualifyingDayId: null, qualifyingOccurrenceId: foreignQuest.id },
    ]) {
      await expect(
        prisma.userAchievement.create({ data: { ...unlock, ...invalid } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }
    await expect(
      prisma.userAchievement.create({ data: { ...unlock, bonusXp: -1 } }),
    ).rejects.toThrow('UserAchievement_values_check');
    await prisma.userAchievement.create({ data: unlock });
    await prisma.userAchievement.create({
      data: {
        ...unlock,
        userId: second,
        qualifyingDayId: foreignDay.id,
        qualifyingOccurrenceId: foreignQuest.id,
      },
    });
    await expect(
      prisma.userAchievement.create({ data: { ...unlock, ruleVersion: 2 } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.progressEvent.count({ where: owned })).toBe(2);
    expect(await prisma.userAchievement.count({ where: owned })).toBe(2);
  } finally {
    await prisma.$transaction([
      prisma.completionReceipt.deleteMany({ where: owned }),
      prisma.userAchievement.deleteMany({ where: owned }),
      prisma.progressEvent.deleteMany({ where: owned }),
      prisma.achievement.deleteMany({ where: { code } }),
      prisma.questOccurrence.deleteMany({ where: owned }),
      prisma.dayPlan.deleteMany({ where: owned }),
      prisma.quest.deleteMany({ where: owned }),
    ]);
  }
});
