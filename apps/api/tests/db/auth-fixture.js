import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { registerAccount } from '../../src/services/registration.js';
export function useAuthDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Auth DB tests require DATABASE_URL');
  const url = new URL(databaseUrl);
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (
    !['postgresql:', 'postgres:'].includes(url.protocol) ||
    !databaseName.includes('test')
  ) {
    throw new Error(
      'Auth DB tests require a PostgreSQL database name containing test',
    );
  }
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const emails = new Set();
  beforeAll(async () => {
    const [connection] = await prisma.$queryRaw`
      SELECT current_database() AS name
    `;
    if (connection?.name !== databaseName) {
      throw new Error('Auth DB tests connected to an unexpected database');
    }
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    if (emails.size === 0) return;
    const normalizedEmail = { in: [...emails] };
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { user: { normalizedEmail } } }),
      prisma.user.deleteMany({ where: { normalizedEmail } }),
    ]);
    emails.clear();
  });
  afterAll(() => prisma.$disconnect());
  async function register(password = '  exact submitted password  ') {
    vi.stubEnv('AUTH_BCRYPT_COST', '12');
    const email = `auth-${randomUUID()}@example.com`;
    emails.add(email);
    const result = await registerAccount(prisma, {
      email,
      password,
      displayName: 'Test student',
      timezone: 'UTC',
    });
    if (!result.ok) throw new Error('Expected successful fixture registration');
    return { ...result, password };
  }
  return { prisma, register };
}
