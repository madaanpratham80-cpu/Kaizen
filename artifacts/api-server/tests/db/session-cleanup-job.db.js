import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { expect, it } from 'vitest';
import { cleanupExpiredSessions } from '../../src/services/session-cleanup.js';
import { useAuthDatabase } from './auth-fixture.js';

const { prisma } = useAuthDatabase();

it('session-cleanup-job removes expired sessions across batches and preserves active sessions', async () => {
  // Keep the maintenance-wide deletes away from other integration suites.
  const schema = `session_cleanup_${randomUUID().replaceAll('-', '')}`;
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('schema', schema);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const isolated = new PrismaClient({ datasourceUrl: url.href });
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE "${schema}"."Session" (LIKE public."Session" INCLUDING ALL)`,
    );
    const cutoff = new Date('2026-11-17T10:00:00Z');
    const userId = randomUUID();
    const sessions = Array.from({ length: 502 }, (_, index) => ({
      id: randomUUID(),
      userId,
      tokenHash: index.toString(16).padStart(64, '0'),
      expiresAt: new Date(
        cutoff.getTime() + (index === 501 ? 1 : index === 500 ? 0 : -1),
      ),
    }));
    await isolated.session.createMany({ data: sessions });
    await expect(
      cleanupExpiredSessions(isolated, async () => cutoff),
    ).resolves.toEqual({ deleted: 501, batches: 2 });
    expect(await isolated.session.findMany({ select: { id: true } })).toEqual([
      { id: sessions.at(-1).id },
    ]);
    await expect(
      cleanupExpiredSessions(isolated, async () => cutoff),
    ).resolves.toEqual({ deleted: 0, batches: 1 });
  } finally {
    await isolated.$disconnect();
    await prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
  }
});
