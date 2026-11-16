import {
  archiveQuestSchema,
  createQuestSchema,
  editQuestSchema,
  listQuestsSchema,
  questIdSchema,
  type z,
} from '@kaizen/contracts';
import type { Prisma, PrismaClient } from '@prisma/client';

type Owner = { userId: string };
type QuestInput = z.infer<typeof createQuestSchema>;
type Tx = Prisma.TransactionClient;
type QuestErrorCode =
  | 'QUEST_NOT_FOUND'
  | 'QUEST_VERSION_CONFLICT'
  | 'QUEST_ARCHIVED'
  | 'INVALID_EFFECTIVE_DATE'
  | 'SCHEDULE_CONFLICT'
  | 'PLAYER_STATE_UNAVAILABLE';
export class QuestCatalogError extends Error {
  constructor(
    readonly status: number,
    readonly code: QuestErrorCode,
    message: string,
  ) {
    super(message);
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
} as const;

function utcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function questFields(input: QuestInput) {
  return {
    title: input.title,
    category: input.category,
    pillar: pillars[input.category],
  };
}

function scheduleFields(input: QuestInput, effectiveFrom: Date) {
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

function writeQuest<T>(
  prisma: PrismaClient,
  owner: Owner,
  write: (tx: Tx, now: Date, timezone: string) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('lock_timeout', ${LOCK_TIMEOUT}, true)`;
      const [player] = await tx.$queryRaw<{ userId: string }[]>`
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
      const [clock] = await tx.$queryRaw<
        { now: Date }[]
      >`SELECT clock_timestamp() AS now`;
      return write(tx, clock.now, timezone);
    },
    { maxWait: TRANSACTION_WAIT_MS, timeout: TRANSACTION_TIMEOUT_MS },
  );
}

async function eligibleDate(
  tx: Tx,
  owner: Owner,
  input: string,
  now: Date,
  timezone: string,
) {
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

function ownedQuest(owner: Owner, id: string) {
  return { userId_id: { userId: owner.userId, id } };
}

export async function getQuest(
  prisma: Pick<Tx, 'quest'>,
  owner: Owner,
  id: string,
) {
  const quest = await prisma.quest.findUnique({
    where: ownedQuest(owner, questIdSchema.parse(id)),
  });
  if (!quest)
    throw new QuestCatalogError(404, 'QUEST_NOT_FOUND', 'Quest not found.');
  return quest;
}

export async function listQuests(
  prisma: PrismaClient,
  owner: Owner,
  input: unknown = {},
) {
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

export async function getQuestSchedule(
  prisma: PrismaClient,
  owner: Owner,
  id: string,
  date: string,
) {
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

function checkVersion(
  quest: Awaited<ReturnType<typeof getQuest>>,
  expectedVersion: number,
) {
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

export function createQuest(
  prisma: PrismaClient,
  owner: Owner,
  rawInput: unknown,
) {
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

export function editQuest(
  prisma: PrismaClient,
  owner: Owner,
  id: string,
  rawInput: unknown,
) {
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

export function archiveQuest(
  prisma: PrismaClient,
  owner: Owner,
  id: string,
  rawInput: unknown,
) {
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
