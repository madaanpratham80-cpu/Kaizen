import { Prisma } from '@prisma/client';
import { HISTORY_DAYS, z } from '@kaizen/contracts';
import { Temporal } from '@js-temporal/polyfill';
import { dateColumn, localDateAt } from '../domain/calendar.js';
import { rankForXp } from '../domain/ranks.js';
import { readServerClock } from './player-lock.js';
import { ProgressionError } from './progression-store.js';

const DEFAULT_PAGE_SIZE = 25;
const CURSOR_VERSION = 1;
const sequence = z.number().int().min(1).max(2_147_483_647);
const cursorSchema = z
  .strictObject({
    v: z.literal(CURSOR_VERSION),
    owner: z.uuid(),
    high: sequence,
    before: sequence,
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .refine(({ before, high }) => before <= high);
const badWindow = () =>
  new ProgressionError(
    400,
    'INVALID_INPUT',
    'Invalid date window or ledger cursor.',
  );

function decodeCursor(raw, userId) {
  if (!raw) return null;
  let decoded;
  try {
    const bytes = Buffer.from(raw, 'base64url');
    if (bytes.toString('base64url') !== raw) throw badWindow();
    decoded = cursorSchema.parse(JSON.parse(bytes.toString()));
  } catch {
    throw badWindow();
  }
  if (decoded.owner !== userId) throw badWindow();
  return decoded;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function ledgerRows(userId, timezone, high) {
  return Prisma.sql`
    SELECT e.id, e.sequence, e.kind, e."xpDelta", e."healthDelta", e."ruleVersion",
      e."recordedAt", e."dayId", e."occurrenceId", e."sealCode", o.title, o.pillar,
      COALESCE(d."localDate", od."localDate",
        ((e."recordedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timezone})::date) AS "localDate"
    FROM "ProgressEvent" e
    LEFT JOIN "DayPlan" d ON d.id = e."dayId" AND d."userId" = e."userId"
    LEFT JOIN "QuestOccurrence" o ON o.id = e."occurrenceId" AND o."userId" = e."userId"
    LEFT JOIN "DayPlan" od ON od.id = o."dayPlanId" AND od."userId" = e."userId"
    WHERE e."userId" = ${userId}::uuid AND e.sequence <= ${high}
  `;
}

/**
 * @param {string} userId
 * @param {Date} start
 * @param {Date} end
 * @returns {import('@prisma/client').Prisma.Sql}
 */
export function heatmapQuery(userId, start, end) {
  return Prisma.sql`
    SELECT d."localDate", d.status, COUNT(o.id)::integer AS completions
    FROM "DayPlan" d
    LEFT JOIN "QuestOccurrence" o ON o."userId" = d."userId" AND o."dayPlanId" = d.id AND o.status = 'COMPLETED'
    WHERE d."userId" = ${userId}::uuid AND d."localDate" BETWEEN (${start}::timestamptz AT TIME ZONE 'UTC')::date AND (${end}::timestamptz AT TIME ZONE 'UTC')::date
    GROUP BY d."localDate", d.status
  `;
}

async function readWindow(tx, source, from, to, limit, before) {
  const dates = Prisma.sql`"localDate" BETWEEN (${from}::timestamptz AT TIME ZONE 'UTC')::date AND (${to}::timestamptz AT TIME ZONE 'UTC')::date`;
  const cutoff = before ? Prisma.sql`AND sequence < ${before}` : Prisma.empty;
  const ledger = await tx.$queryRaw`
    WITH ledger AS (${source})
    SELECT * FROM ledger WHERE ${dates} ${cutoff}
    ORDER BY sequence DESC LIMIT ${limit + 1}
  `;
  const daily = await tx.$queryRaw`
    WITH ledger AS (${source})
    SELECT "localDate", SUM("xpDelta") AS "xpDelta", SUM("healthDelta") AS "healthDelta",
      COUNT(*) FILTER (WHERE kind = 'COMPLETION')::integer AS completions
    FROM ledger WHERE ${dates} GROUP BY "localDate" ORDER BY "localDate"
  `;
  return {
    ledger,
    aggregates: daily.map((row) => ({
      ...row,
      localDate: formatDate(row.localDate),
      xpDelta: Number(row.xpDelta),
      healthDelta: Number(row.healthDelta),
    })),
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{userId: string}} owner
 * @param {{from?: string, to?: string, limit?: number, cursor?: string}} query
 * @returns {Promise<object>}
 */
export function readProgress(prisma, { userId }, query) {
  const { limit = DEFAULT_PAGE_SIZE } = query;
  const cursor = decodeCursor(query.cursor, userId);
  if (
    cursor &&
    query.from &&
    (query.from !== cursor.from || query.to !== cursor.to)
  )
    throw badWindow();
  return prisma.$transaction(
    async (tx) => {
      const now = await readServerClock(tx);
      const account = await tx.user.findUnique({
        where: { id: userId },
        select: {
          timezone: true,
          playerState: {
            select: {
              totalXp: true,
              stateVersion: true,
              nextEventSequence: true,
            },
          },
        },
      });
      if (!account)
        throw new ProgressionError(401, 'SESSION_INVALID', 'Invalid session.');
      if (!account.playerState)
        throw new ProgressionError(
          503,
          'PLAYER_STATE_UNAVAILABLE',
          'Player state is temporarily unavailable.',
        );
      const { timezone, playerState } = account;
      const today = localDateAt(now, timezone);
      const heatStart = today.subtract({ days: HISTORY_DAYS - 1 });
      const from = Temporal.PlainDate.from(
        query.from ?? cursor?.from ?? heatStart.toString(),
      );
      const to = Temporal.PlainDate.from(
        query.to ?? cursor?.to ?? today.toString(),
      );
      const windowLength = from.until(to).days;
      if (
        windowLength < 0 ||
        windowLength >= HISTORY_DAYS ||
        Temporal.PlainDate.compare(to, today) > 0
      )
        throw badWindow();
      const latest = playerState.nextEventSequence - 1;
      const high = cursor?.high ?? latest;
      if (high > latest) throw badWindow();

      const source = ledgerRows(userId, timezone, high);
      const { ledger, aggregates } = await readWindow(
        tx,
        source,
        dateColumn(from),
        dateColumn(to),
        limit,
        cursor?.before,
      );
      const page = ledger
        .slice(0, limit)
        .map((row) => ({ ...row, localDate: formatDate(row.localDate) }));
      const window = { from: from.toString(), to: to.toString() };
      const nextCursor =
        ledger.length > limit
          ? Buffer.from(
              JSON.stringify({
                v: CURSOR_VERSION,
                owner: userId,
                high,
                before: page.at(-1).sequence,
                ...window,
              }),
            ).toString('base64url')
          : null;

      const rows = await tx.$queryRaw(
        heatmapQuery(userId, dateColumn(heatStart), dateColumn(today)),
      );
      const cells = new Map(
        rows.map(({ localDate, status, completions }) => [
          formatDate(localDate),
          { status, completions },
        ]),
      );
      const heatmap = Array.from({ length: HISTORY_DAYS }, (_, days) => {
        const localDate = heatStart.add({ days }).toString();
        return {
          localDate,
          ...(cells.get(localDate) ?? { status: null, completions: 0 }),
        };
      });
      const pillarTotals = await tx.$queryRaw`
      SELECT o.pillar, SUM(e."xpDelta") AS xp
      FROM "ProgressEvent" e
      JOIN "QuestOccurrence" o ON o.id = e."occurrenceId" AND o."userId" = e."userId"
      WHERE e."userId" = ${userId}::uuid AND e.kind = 'COMPLETION'
      GROUP BY o.pillar ORDER BY o.pillar
    `;
      const seals = await tx.userAchievement.findMany({
        where: { userId },
        omit: { userId: true },
        orderBy: [{ unlockedAt: 'desc' }, { achievementCode: 'asc' }],
      });
      return {
        window,
        aggregates,
        heatmap,
        ledger: page,
        nextCursor,
        seals,
        rank: rankForXp(playerState.totalXp),
        stateVersion: playerState.stateVersion,
        pillarTotals: pillarTotals.map(({ pillar, xp }) => ({
          pillar,
          xp: Number(xp),
        })),
      };
    },
    { isolationLevel: 'RepeatableRead' },
  );
}
