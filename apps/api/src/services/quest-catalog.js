import {
  archiveQuestSchema,
  createQuestSchema,
  editQuestSchema,
  listQuestsSchema,
  questIdSchema,
} from '@kaizen/contracts';
/** @typedef {import('@prisma/client').PrismaClient} PrismaClient */
/** @typedef {{ userId: string }} Owner */
/** @typedef {import('zod').infer<typeof createQuestSchema>} QuestInput */
/** @typedef {import('@prisma/client').Prisma.TransactionClient} Tx */
/**
 * @typedef {(
 *   'QUEST_NOT_FOUND' | 'QUEST_VERSION_CONFLICT' | 'QUEST_ARCHIVED' |
 *   'INVALID_EFFECTIVE_DATE' | 'SCHEDULE_CONFLICT' | 'PLAYER_STATE_UNAVAILABLE'
 * )} QuestErrorCode
 */
export class QuestCatalogError extends Error {
  /**
   * @param {number} status
   * @param {QuestErrorCode} code
   * @param {string} message
   */
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const RULE_VERSION = 1;
const LOCK_TIMEOUT = '2s';
const TRANSACTION_WAIT_MS = 2_000;
const TRANSACTION_TIMEOUT_MS = 5_000;
const pillars = {
  Academic: 'Cognitive',
  Physical: 'Physical',
  Productivity: 'Craft',
  Language: 'Craft',
};
/**
 * @param {string} date
 */
function utcDate(date) {
  return new Date(`${date}T00:00:00.000Z`);
}
/**
 * @param {QuestInput} input
 */
function questFields(input) {
  return {
    title: input.title,
    category: input.category,
    pillar: pillars[input.category],
  };
}
/**
 * @param {QuestInput} input
 * @param {Date} effectiveFrom
 */
function scheduleFields(input, effectiveFrom) {
  return {
    ...questFields(input),
    effectiveFrom,
    recurrence: input.recurrence.kind,
    weekdays:
      input.recurrence.kind === 'WEEKLY'
        ? [...input.recurrence.weekdays].sort((a, b) => a - b)
        : [],
    difficulty: input.difficulty,
    target: input.target,
    ruleVersion: RULE_VERSION,
  };
}
/**
 * @template T
 * @param {PrismaClient} prisma
 * @param {Owner} owner
 * @param {(tx: Tx, now: Date, timezone: string) => Promise<T>} write
 */
function writeQuest(prisma, owner, write) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('lock_timeout', ${LOCK_TIMEOUT}, true)`;
      const [player] = await tx.$queryRaw`
      SELECT "userId" FROM "PlayerState" WHERE "userId" = ${owner.userId}::uuid FOR UPDATE
    `;
      if (!player) {
        throw new QuestCatalogError(
          503,
          'PLAYER_STATE_UNAVAILABLE',
          'Player state is temporarily unavailable.',
        );
      }
      const { timezone } = await tx.user.findUniqueOrThrow({
        where: { id: owner.userId },
        select: { timezone: true },
      });
      const [clock] = await tx.$queryRaw`SELECT clock_timestamp() AS now`;
      return write(tx, clock.now, timezone);
    },
    { maxWait: TRANSACTION_WAIT_MS, timeout: TRANSACTION_TIMEOUT_MS },
  );
}
/**
 * @param {Tx} tx
 * @param {Owner} owner
 * @param {string} input
 * @param {Date} now
 * @param {string} timezone
 */
async function eligibleDate(tx, owner, input, now, timezone) {
  const { year, month, day } = Object.fromEntries(
    new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  const localToday = utcDate(`${year.padStart(4, '0')}-${month}-${day}`);
  const date = utcDate(input);
  if (
    date <= localToday ||
    (await tx.dayPlan.findUnique({
      where: { userId_localDate: { userId: owner.userId, localDate: date } },
      select: { id: true },
    }))
  ) {
    throw new QuestCatalogError(
      409,
      'INVALID_EFFECTIVE_DATE',
      'Select a future date with no opened plan.',
    );
  }
  return date;
}
/**
 * @param {Owner} owner
 * @param {string} id
 */
function ownedQuest(owner, id) {
  return { userId_id: { userId: owner.userId, id } };
}
/**
 * @param {Pick<Tx, 'quest'>} prisma
 * @param {Owner} owner
 * @param {string} id
 * @returns {Promise<import('@prisma/client').Quest>}
 */
export async function getQuest(prisma, owner, id) {
  const quest = await prisma.quest.findUnique({
    where: ownedQuest(owner, questIdSchema.parse(id)),
  });
  if (!quest)
    throw new QuestCatalogError(404, 'QUEST_NOT_FOUND', 'Quest not found.');
  return quest;
}
/**
 * @param {PrismaClient} prisma
 * @param {Owner} owner
 * @param {unknown} [input]
 * @returns {Promise<{quests: import('@prisma/client').Quest[], nextCursor: string | null}>}
 */
export async function listQuests(prisma, owner, input = {}) {
  const { after, limit } = listQuestsSchema.parse(input);
  const rows = await prisma.quest.findMany({
    where: { userId: owner.userId, id: after ? { gt: after } : undefined },
    orderBy: { id: 'asc' },
    take: limit + 1,
  });
  const quests = rows.slice(0, limit);
  return {
    quests,
    nextCursor: rows.length > limit ? (quests.at(-1)?.id ?? null) : null,
  };
}
/**
 * @param {PrismaClient} prisma
 * @param {Owner} owner
 * @param {string} id
 * @param {string} date
 * @returns {Promise<import('@prisma/client').ScheduleVersion | null>}
 */
export async function getQuestSchedule(prisma, owner, id, date) {
  const { effectiveFrom } = createQuestSchema
    .pick({ effectiveFrom: true })
    .parse({ effectiveFrom: date });
  const localDate = utcDate(effectiveFrom);
  // Filter the archive cutoff in the same query as the effective range.
  return prisma.scheduleVersion.findFirst({
    where: {
      userId: owner.userId,
      questId: questIdSchema.parse(id),
      effectiveFrom: { lte: localDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: localDate } }],
      quest: {
        OR: [
          { archiveEffectiveDate: null },
          { archiveEffectiveDate: { gt: localDate } },
        ],
      },
    },
    orderBy: { effectiveFrom: 'desc' },
  });
}
/**
 * @param {Awaited<ReturnType<typeof getQuest>>} quest
 * @param {number} expectedVersion
 */
function checkVersion(quest, expectedVersion) {
  if (quest.version !== expectedVersion) {
    throw new QuestCatalogError(
      409,
      'QUEST_VERSION_CONFLICT',
      'Quest version does not match.',
    );
  }
  if (quest.archiveEffectiveDate) {
    throw new QuestCatalogError(
      409,
      'QUEST_ARCHIVED',
      'Quest is already scheduled for archive.',
    );
  }
}
/**
 * @param {PrismaClient} prisma
 * @param {Owner} owner
 * @param {unknown} rawInput
 * @returns {Promise<import('@prisma/client').Quest>}
 */
export function createQuest(prisma, owner, rawInput) {
  const input = createQuestSchema.parse(rawInput);
  return writeQuest(prisma, owner, async (tx, now, timezone) => {
    const date = await eligibleDate(
      tx,
      owner,
      input.effectiveFrom,
      now,
      timezone,
    );
    return tx.quest.create({
      data: {
        ...questFields(input),
        userId: owner.userId,
        schedules: { create: scheduleFields(input, date) },
      },
    });
  });
}
/**
 * @param {PrismaClient} prisma
 * @param {Owner} owner
 * @param {string} id
 * @param {unknown} rawInput
 * @returns {Promise<import('@prisma/client').Quest>}
 */
export function editQuest(prisma, owner, id, rawInput) {
  const input = editQuestSchema.parse(rawInput);
  return writeQuest(prisma, owner, async (tx, now, timezone) => {
    const quest = await getQuest(tx, owner, id);
    checkVersion(quest, input.expectedVersion);
    const date = await eligibleDate(
      tx,
      owner,
      input.effectiveFrom,
      now,
      timezone,
    );
    const previous = await tx.scheduleVersion.findFirst({
      where: { userId: owner.userId, questId: quest.id },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!previous || previous.effectiveFrom >= date || previous.effectiveTo) {
      throw new QuestCatalogError(
        409,
        'SCHEDULE_CONFLICT',
        'Schedule must follow the latest version.',
      );
    }
    await tx.scheduleVersion.update({
      where: {
        userId_questId_effectiveFrom: {
          userId: owner.userId,
          questId: quest.id,
          effectiveFrom: previous.effectiveFrom,
        },
      },
      data: { effectiveTo: date },
    });
    return tx.quest.update({
      where: { ...ownedQuest(owner, quest.id), version: input.expectedVersion },
      data: {
        ...questFields(input),
        version: { increment: 1 },
        schedules: { create: scheduleFields(input, date) },
      },
    });
  });
}
/**
 * @param {PrismaClient} prisma
 * @param {Owner} owner
 * @param {string} id
 * @param {unknown} rawInput
 * @returns {Promise<import('@prisma/client').Quest>}
 */
export function archiveQuest(prisma, owner, id, rawInput) {
  const input = archiveQuestSchema.parse(rawInput);
  return writeQuest(prisma, owner, async (tx, now, timezone) => {
    const quest = await getQuest(tx, owner, id);
    checkVersion(quest, input.expectedVersion);
    const date = await eligibleDate(
      tx,
      owner,
      input.effectiveFrom,
      now,
      timezone,
    );
    return tx.quest.update({
      where: { ...ownedQuest(owner, quest.id), version: input.expectedVersion },
      data: {
        archivedAt: now,
        archiveEffectiveDate: date,
        version: { increment: 1 },
      },
    });
  });
}
