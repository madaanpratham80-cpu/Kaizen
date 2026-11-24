import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  archiveQuest,
  createQuest,
  editQuest,
  getQuest,
  getQuestSchedule,
  listQuests,
} from '../../src/services/quest-catalog.js';
import { useAuthDatabase } from './auth-fixture.js';
const owners = new Set();
const { prisma, register } = useAuthDatabase();
// Delete catalog dependents before the auth fixture deletes the users.
afterEach(async () => {
  const where = { userId: { in: [...owners] } };
  await prisma.$transaction([
    prisma.scheduleVersion.deleteMany({ where }),
    prisma.quest.deleteMany({ where }),
    prisma.dayPlan.deleteMany({ where }),
    prisma.playerState.deleteMany({ where }),
  ]);
  owners.clear();
});
async function owner(withState = true) {
  const { user } = await register();
  owners.add(user.id);
  if (!withState)
    await prisma.playerState.delete({ where: { userId: user.id } });
  return { userId: user.id };
}
function date(offset) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}
function input(offset = 5) {
  return {
    title: 'Read',
    category: 'Academic',
    difficulty: 'EASY',
    target: 1,
    recurrence: { kind: 'DAILY' },
    effectiveFrom: date(offset),
  };
}
describe('quest-catalog-postgres', () => {
  it('creates and reads an owned quest and paginates the owned collection', async () => {
    const first = await owner();
    const second = await owner();
    const quest = await createQuest(prisma, first, input());
    const otherOwnQuest = await createQuest(prisma, first, input());
    await createQuest(prisma, second, input());
    expect(await getQuest(prisma, first, quest.id)).toMatchObject({
      title: 'Read',
      pillar: 'Cognitive',
      version: 1,
    });
    const page = await listQuests(prisma, first, { limit: 1 });
    expect(page.nextCursor).toBe(page.quests[0].id);
    const rest = await listQuests(prisma, first, {
      after: page.nextCursor,
      limit: 1,
    });
    expect(rest.nextCursor).toBeNull();
    expect([...page.quests, ...rest.quests].map(({ id }) => id).sort()).toEqual(
      [quest.id, otherOwnQuest.id].sort(),
    );
  });
  it('fails safely when the owner has no player state', async () => {
    const account = await owner(false);
    await expect(createQuest(prisma, account, input())).rejects.toMatchObject({
      status: 503,
      code: 'PLAYER_STATE_UNAVAILABLE',
    });
    expect(await prisma.quest.count({ where: account })).toBe(0);
  });
  it('returns the same missing-resource result for foreign reads, edits and archives', async () => {
    const first = await owner();
    const second = await owner();
    const quest = await createQuest(prisma, first, input());
    const missing = { status: 404, code: 'QUEST_NOT_FOUND' };
    for (const id of [quest.id, randomUUID()]) {
      await expect(getQuest(prisma, second, id)).rejects.toMatchObject(missing);
      await expect(
        editQuest(prisma, second, id, { ...input(7), expectedVersion: 1 }),
      ).rejects.toMatchObject(missing);
      await expect(
        archiveQuest(prisma, second, id, {
          effectiveFrom: date(6),
          expectedVersion: 1,
        }),
      ).rejects.toMatchObject(missing);
    }
    expect(await getQuest(prisma, first, quest.id)).toEqual(quest);
    expect(
      await prisma.scheduleVersion.count({
        where: { ...first, questId: quest.id },
      }),
    ).toBe(1);
  });
  it('commits exactly one concurrent edit for the same expected version', async () => {
    const account = await owner();
    const quest = await createQuest(prisma, account, input());
    const results = await Promise.allSettled(
      ['First', 'Second'].map((title) =>
        editQuest(prisma, account, quest.id, {
          ...input(8),
          title,
          expectedVersion: 1,
        }),
      ),
    );
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.find(({ status }) => status === 'rejected')).toMatchObject({
      reason: { code: 'QUEST_VERSION_CONFLICT' },
    });
    const saved = await getQuest(prisma, account, quest.id);
    expect(saved.version).toBe(2);
    expect(
      await getQuestSchedule(prisma, account, quest.id, date(8)),
    ).toMatchObject({ title: saved.title });
    expect(
      await prisma.scheduleVersion.count({
        where: { ...account, questId: quest.id },
      }),
    ).toBe(2);
  });
});
describe('quest-schedule-history', () => {
  it('preserves adjacent history and cuts off queued rules on exactly the archive date', async () => {
    const account = await owner();
    const quest = await createQuest(prisma, account, input());
    await createQuest(prisma, account, input());
    await editQuest(prisma, account, quest.id, {
      ...input(9),
      title: 'Revised',
      expectedVersion: 1,
    });
    await expect(
      editQuest(prisma, account, quest.id, { ...input(8), expectedVersion: 2 }),
    ).rejects.toMatchObject({ code: 'SCHEDULE_CONFLICT' });
    expect(
      await getQuestSchedule(prisma, account, quest.id, date(8)),
    ).toMatchObject({ title: 'Read' });
    expect(
      await getQuestSchedule(prisma, account, quest.id, date(9)),
    ).toMatchObject({ title: 'Revised' });
    await expect(
      archiveQuest(prisma, account, quest.id, {
        effectiveFrom: date(9),
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'QUEST_VERSION_CONFLICT' });
    const archived = await archiveQuest(prisma, account, quest.id, {
      effectiveFrom: date(9),
      expectedVersion: 2,
    });
    await expect(
      archiveQuest(prisma, account, quest.id, {
        effectiveFrom: date(10),
        expectedVersion: 3,
      }),
    ).rejects.toMatchObject({ code: 'QUEST_ARCHIVED' });
    await expect(
      editQuest(prisma, account, quest.id, {
        ...input(11),
        expectedVersion: 3,
      }),
    ).rejects.toMatchObject({ code: 'QUEST_ARCHIVED' });
    expect(await getQuest(prisma, account, quest.id)).toEqual(archived);
    expect(
      await getQuestSchedule(prisma, account, quest.id, date(8)),
    ).toMatchObject({ title: 'Read' });
    expect(
      await getQuestSchedule(prisma, account, quest.id, date(9)),
    ).toBeNull();
    expect(
      await getQuestSchedule(prisma, account, quest.id, date(10)),
    ).toBeNull();
    expect(
      await prisma.scheduleVersion.count({
        where: { ...account, questId: quest.id },
      }),
    ).toBe(2);
  });
  it('rejects elapsed, current and already opened effective dates', async () => {
    const account = await owner();
    const startsAtUtc = new Date(`${date(5)}T00:00:00.000Z`);
    await prisma.dayPlan.create({
      data: {
        ...account,
        localDate: startsAtUtc,
        startsAtUtc,
        deadlineUtc: new Date(`${date(6)}T00:00:00.000Z`),
        timezoneSnapshot: 'UTC',
        status: 'EMPTY',
      },
    });
    for (const offset of [-1, 0, 5]) {
      await expect(
        createQuest(prisma, account, input(offset)),
      ).rejects.toMatchObject({ code: 'INVALID_EFFECTIVE_DATE' });
    }
    expect(await prisma.quest.count({ where: account })).toBe(0);
  });
  it('rolls back the prior interval close when the version increment fails', async () => {
    const account = await owner();
    const quest = await createQuest(prisma, account, input());
    const maxVersion = 2_147_483_647;
    await prisma.quest.update({
      where: { userId_id: { ...account, id: quest.id } },
      data: { version: maxVersion },
    });
    const history = () =>
      prisma.scheduleVersion.findMany({
        where: { ...account, questId: quest.id },
      });
    const before = await history();
    await expect(
      editQuest(prisma, account, quest.id, {
        ...input(9),
        title: 'Rejected',
        expectedVersion: maxVersion,
      }),
    ).rejects.toThrow(/out of range|overflow/i);
    expect(await getQuest(prisma, account, quest.id)).toMatchObject({
      title: 'Read',
      version: maxVersion,
    });
    expect(await history()).toEqual(before);
  });
});
