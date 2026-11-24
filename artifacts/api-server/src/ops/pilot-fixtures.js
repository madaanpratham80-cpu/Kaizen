import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';

export const PILOT_USERS = 100;
export const PILOT_DAYS = 365;
const SEED_TIMEOUT_MS = 120_000;

function makeAccounts() {
  return Array.from({ length: PILOT_USERS }, (_, index) => {
    const token = randomBytes(32);
    return {
      id: randomUUID(),
      quest_id: randomUUID(),
      session_id: randomUUID(),
      email: `pilot-${index + 1}@example.test`,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      token: token.toString('base64url'),
    };
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma Disposable database owner.
 * @returns {Promise<{accounts: {id: string, token: string}[], from: Date, to: Date}>}
 */
export async function seedPilot(prisma) {
  const accounts = makeAccounts();
  const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 12);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await prisma.$transaction(
    async (tx) => {
      assert.equal(
        await tx.user.count(),
        0,
        'Pilot seeding requires an empty database',
      );
      await tx.$executeRaw`
      CREATE TEMP TABLE pilot_accounts (id uuid, quest_id uuid, session_id uuid, email text, "tokenHash" text) ON COMMIT DROP
    `;
      await tx.$executeRaw`
      INSERT INTO pilot_accounts
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(accounts.map(({ token: _token, ...account }) => account))}::jsonb)
        AS fields(id uuid, quest_id uuid, session_id uuid, email text, "tokenHash" text)
    `;
      await tx.$executeRaw`
      CREATE TEMP TABLE pilot_days ON COMMIT DROP AS
        SELECT gen_random_uuid() AS day_id, gen_random_uuid() AS occurrence_id, u.id AS user_id, quest_id,
          n AS day_number, (${today.toISOString().slice(0, 10)}::date - (${PILOT_DAYS - 1}::integer - n)) AS local_date
        FROM pilot_accounts u CROSS JOIN generate_series(0, ${PILOT_DAYS - 1}::integer) AS n
    `;
      await tx.$executeRaw`
      INSERT INTO "User" (id, "normalizedEmail", "displayName", "passwordHash", timezone, "createdAt")
        SELECT a.id, email, 'Pilot fixture', ${passwordHash}, 'UTC', d.local_date
        FROM pilot_accounts a JOIN pilot_days d ON d.user_id = a.id AND day_number = 0
    `;
      await tx.$executeRaw`
      INSERT INTO "Session" (id, "userId", "tokenHash", "expiresAt")
        SELECT session_id, id, "tokenHash", (clock_timestamp() AT TIME ZONE 'UTC') + interval '1 hour'
        FROM pilot_accounts
    `;
      await tx.$executeRaw`
      INSERT INTO "Quest" (id, "userId", title, category, pillar)
        SELECT quest_id, id, 'Read', 'Academic', 'Cognitive' FROM pilot_accounts
    `;
      await tx.$executeRaw`
      INSERT INTO "ScheduleVersion" (
        id, "userId", "questId", "effectiveFrom", recurrence, title, category, pillar, difficulty, target, "ruleVersion"
      )
        SELECT gen_random_uuid(), user_id, quest_id, local_date, 'DAILY', 'Read', 'Academic', 'Cognitive', 'EASY', 1, 1
        FROM pilot_days WHERE day_number = 0
    `;
      await tx.$executeRaw`
      INSERT INTO "DayPlan" (
        id, "userId", "localDate", "timezoneSnapshot", "startsAtUtc", "deadlineUtc",
        status, "plannedCount", "healthGainAccounted", "priorityLockedAt", "streakApplied", "closedAt"
      )
        SELECT day_id, user_id, local_date, 'UTC', local_date, local_date + 1,
          (CASE WHEN day_number < ${PILOT_DAYS - 1} THEN 'ACTIVE' ELSE 'OPEN' END)::"DayStatus", 1,
          CASE WHEN day_number < ${PILOT_DAYS - 1} THEN 5 ELSE 0 END,
          CASE WHEN day_number < ${PILOT_DAYS - 1} THEN local_date + time '12:00' END,
          day_number < ${PILOT_DAYS - 1},
          CASE WHEN day_number < ${PILOT_DAYS - 1} THEN local_date + 1 END
        FROM pilot_days
    `;
      await tx.$executeRaw`
      INSERT INTO "QuestOccurrence" (
        id, "userId", "questId", "dayPlanId", planned, status, "completedAt",
        title, category, pillar, difficulty, target, "rewardXp", "ruleVersion"
      )
        SELECT occurrence_id, user_id, quest_id, day_id, true,
          (CASE WHEN day_number < ${PILOT_DAYS - 1} THEN 'COMPLETED' ELSE 'PENDING' END)::"OccurrenceStatus",
          CASE WHEN day_number < ${PILOT_DAYS - 1} THEN local_date + time '12:00' END,
          'Read', 'Academic', 'Cognitive', 'EASY', 1, 10, 1
        FROM pilot_days
    `;
      await tx.$executeRaw`
      UPDATE "DayPlan" p SET "priorityId" = d.occurrence_id FROM pilot_days d WHERE p.id = d.day_id
    `;
      await tx.$executeRaw`
      INSERT INTO "PlayerState" (
        "userId", "totalXp", health, "currentStreak", "bestStreak", "lastFinalizedDate", "stateVersion", "nextEventSequence"
      )
        SELECT user_id, ${(PILOT_DAYS - 1) * 10}, 100, day_number, day_number, local_date - 1,
          day_number * 2, day_number * 2 + 2
        FROM pilot_days WHERE day_number = ${PILOT_DAYS - 1}
    `;
      await tx.$executeRaw`
      INSERT INTO "ProgressEvent" (
        id, "userId", sequence, "awardKey", kind, "occurrenceId", "dayId", "xpDelta", "healthDelta", "ruleVersion", "recordedAt"
      )
        SELECT gen_random_uuid(), user_id, 1, 'init', 'INITIALIZATION', NULL, NULL, 0, 70, 1, local_date
          FROM pilot_days WHERE day_number = 0
        UNION ALL
        SELECT gen_random_uuid(), user_id, day_number * 2 + 2, 'completion:' || occurrence_id, 'COMPLETION',
          occurrence_id, day_id, 10, CASE WHEN day_number < 6 THEN 5 ELSE 0 END, 1, local_date + time '12:00'
          FROM pilot_days WHERE day_number < ${PILOT_DAYS - 1}
        UNION ALL
        SELECT gen_random_uuid(), user_id, day_number * 2 + 3, 'close:' || day_id, 'DAY_CLOSE',
          NULL, day_id, 0, 0, 1, (local_date + 1)::timestamp
          FROM pilot_days WHERE day_number < ${PILOT_DAYS - 1}
    `;
    },
    { timeout: SEED_TIMEOUT_MS },
  );
  await prisma.$executeRaw`ANALYZE`;
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - PILOT_DAYS + 1);
  return {
    accounts: accounts.map(({ id, token }) => ({ id, token })),
    from,
    to: today,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<object>} Fixture counts and digest after ordered-ledger reconciliation.
 */
export async function reconcilePilot(prisma) {
  const [counts] = await prisma.$queryRaw`
    SELECT (SELECT count(*)::integer FROM "User") AS users,
      (SELECT count(*)::integer FROM "DayPlan") AS plans,
      (SELECT count(*)::integer FROM "QuestOccurrence") AS occurrences,
      (SELECT count(*)::integer FROM "ProgressEvent") AS events
  `;
  assert.deepEqual(counts, {
    users: PILOT_USERS,
    plans: PILOT_USERS * PILOT_DAYS,
    occurrences: PILOT_USERS * PILOT_DAYS,
    events: PILOT_USERS * ((PILOT_DAYS - 1) * 2 + 1),
  });
  const [result] = await prisma.$queryRaw`
    WITH ordered AS (
      SELECT *, row_number() OVER (PARTITION BY "userId" ORDER BY sequence) AS expected,
        sum("healthDelta") OVER (PARTITION BY "userId" ORDER BY sequence) AS health
      FROM "ProgressEvent"
    ), ledger AS (
      SELECT "userId", max(sequence) AS last, sum("xpDelta") AS xp, sum("healthDelta") AS health,
        bool_and(expected = sequence AND health BETWEEN 0 AND 100) AS valid
      FROM ordered GROUP BY "userId"
    )
    SELECT count(*) FILTER (
      WHERE NOT coalesce(l.valid AND l.last + 1 = p."nextEventSequence"
        AND l.xp = p."totalXp" AND l.health = p.health, false)
    )::integer AS mismatches,
    (SELECT md5(string_agg(row_to_json(e)::text, ',' ORDER BY e."userId", e.sequence)) FROM "ProgressEvent" e) AS digest
    FROM "User" u LEFT JOIN "PlayerState" p ON p."userId" = u.id LEFT JOIN ledger l ON l."userId" = u.id
  `;
  assert.equal(
    result.mismatches,
    0,
    'Ordered ledger does not reconcile with PlayerState',
  );
  return { ...counts, ...result };
}
