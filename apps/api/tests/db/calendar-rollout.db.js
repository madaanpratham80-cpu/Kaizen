import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { useAuthDatabase } from './auth-fixture.js';

useAuthDatabase();

const migration = (name) =>
  readFileSync(
    new URL(`../../prisma/migrations/${name}/migration.sql`, import.meta.url),
    'utf8',
  );

it('backfills Slice 2 accounts and preserves existing player state through the Slice 3 upgrade', () => {
  const schema = `calendar_rollout_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete('schema');
  const psql = (input) => {
    const result = spawnSync(
      'psql',
      ['-XqAt', '-v', 'ON_ERROR_STOP=1', url.href],
      {
        input,
        encoding: 'utf8',
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error(result.stderr.replaceAll(url.href, '[database URL]'));
    return result.stdout.trim();
  };
  const account = (id, email) => `
    INSERT INTO "User" (id, "normalizedEmail", "displayName", "passwordHash", timezone)
    VALUES ('${id}', '${email}', 'Rollout fixture', 'fixture', 'UTC');
    INSERT INTO "Session" (id, "tokenHash", "userId", "expiresAt")
    VALUES ('${randomUUID()}', '${id.replaceAll('-', '')}', '${id}', now());
  `;
  try {
    const before = randomUUID();
    const between = randomUUID();
    expect(
      psql(`
      CREATE SCHEMA ${schema};
      SET search_path TO ${schema}, public;
      ${migration('20261113000000_auth_foundation')}
      ${account(before, 'before@example.com')}
      ${migration('20261116000000_quest_calendar')}
      UPDATE "PlayerState" SET health = 55 WHERE "userId" = '${before}';
      ${account(between, 'between@example.com')}
      SELECT count(*) FROM "PlayerState";
      ${migration('20261116000100_calendar_transitions')}
      SELECT "normalizedEmail", health, "stateVersion", "nextEventSequence"
      FROM "User" JOIN "PlayerState" ON "User".id = "PlayerState"."userId"
      ORDER BY "normalizedEmail";
      SELECT count(*) FROM "Session";
      UPDATE "PlayerState" SET "stateVersion" = 17, "nextEventSequence" = 42, "totalXp" = 230
      WHERE "userId" = '${before}';
      ${migration('20261116000200_completion_ledger')}
      SELECT "stateVersion", "nextEventSequence", "totalXp", health
      FROM "PlayerState" WHERE "userId" = '${before}';
    `).split('\n'),
    ).toEqual([
      '1',
      'before@example.com|55|0|1',
      'between@example.com|70|0|1',
      '2',
      '17|42|230|55',
    ]);
  } finally {
    psql(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
  }
});
