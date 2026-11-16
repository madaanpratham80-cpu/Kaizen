import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { registerAccount } from '../../src/services/registration.js';
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('auth-register-postgres: DATABASE_URL is required');
}
const database = new URL(databaseUrl);
const databaseName = decodeURIComponent(database.pathname.slice(1));
if (
  !['postgresql:', 'postgres:'].includes(database.protocol) ||
  !databaseName.includes('test')
) {
  throw new Error(
    'auth-register-postgres: expected a PostgreSQL database name containing test',
  );
}
const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
const emails = new Set();
const conflict = {
  ok: false,
  status: 409,
  code: 'REGISTRATION_CONFLICT',
  message: 'Unable to complete registration.',
};
function registration(password = 'a long test password') {
  const email = `registration-${randomUUID()}@example.com`;
  emails.add(email);
  return { email, password, displayName: 'Test student', timezone: 'UTC' };
}
beforeAll(async () => {
  const [connection] = await prisma.$queryRaw`
    SELECT current_database() AS name
  `;
  if (connection?.name !== databaseName) {
    throw new Error(
      'auth-register-postgres: connected to an unexpected database',
    );
  }
});
beforeEach(() => {
  vi.stubEnv('AUTH_BCRYPT_COST', '12');
});
afterEach(async () => {
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
describe('auth-register-postgres', () => {
  it('creates one normalized user and one session with only the digest', async () => {
    const input = registration();
    const result = await registerAccount(prisma, {
      ...input,
      email: `  ${input.email.toUpperCase()}  `,
    });
    const users = await prisma.user.findMany({
      where: { normalizedEmail: input.email },
      include: { sessions: true },
    });
    expect(users).toHaveLength(1);
    const [user] = users;
    expect(user.sessions).toHaveLength(1);
    expect(bcrypt.getRounds(user.passwordHash)).toBe(12);
    if (!result.ok) throw new Error('Expected successful registration');
    expect(result.user).toEqual({
      id: user.id,
      email: input.email,
      displayName: input.displayName,
      timezone: input.timezone,
    });
    const tokenBytes = Buffer.from(result.sessionToken, 'base64url');
    expect(tokenBytes).toHaveLength(32);
    expect(user.sessions[0].tokenHash).toBe(
      createHash('sha256').update(tokenBytes).digest('hex'),
    );
  });
  it('returns a generic 409 for duplicate normalized email', async () => {
    const input = registration();
    expect((await registerAccount(prisma, input)).ok).toBe(true);
    expect(
      await registerAccount(prisma, {
        ...input,
        email: ` ${input.email.toUpperCase()} `,
      }),
    ).toEqual(conflict);
    expect(
      await prisma.session.count({
        where: { user: { normalizedEmail: input.email } },
      }),
    ).toBe(1);
  });
  it('creates exactly one user and session for concurrent requests', async () => {
    const input = registration();
    const results = await Promise.all([
      registerAccount(prisma, input),
      registerAccount(prisma, { ...input, email: input.email.toUpperCase() }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([conflict]);
    expect(
      await prisma.user.count({ where: { normalizedEmail: input.email } }),
    ).toBe(1);
    expect(
      await prisma.session.count({
        where: { user: { normalizedEmail: input.email } },
      }),
    ).toBe(1);
  });
  it('auth-password-byte-boundary accepts 72 UTF-8 bytes and rejects 73', async () => {
    const input = registration('€'.repeat(24));
    const oversized = registration(`${input.password}a`);
    expect(Buffer.byteLength(input.password, 'utf8')).toBe(72);
    expect(Buffer.byteLength(oversized.password, 'utf8')).toBe(73);
    expect((await registerAccount(prisma, input)).ok).toBe(true);
    expect(await registerAccount(prisma, oversized)).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(
      await prisma.user.count({ where: { normalizedEmail: oversized.email } }),
    ).toBe(0);
  });
  it('verifies the stored hash against the original spaced password only', async () => {
    const input = registration('  exact submitted password  ');
    expect((await registerAccount(prisma, input)).ok).toBe(true);
    const { passwordHash } = await prisma.user.findUniqueOrThrow({
      where: { normalizedEmail: input.email },
      select: { passwordHash: true },
    });
    const verify = vi.spyOn(bcrypt, 'compare');
    try {
      expect(await verify(input.password, passwordHash)).toBe(true);
      expect(verify).toHaveBeenNthCalledWith(1, input.password, passwordHash);
      expect(await verify(input.password.trim(), passwordHash)).toBe(false);
    } finally {
      verify.mockRestore();
    }
  });
  it('rejects a short password without creating an account', async () => {
    const input = registration('too-short');
    expect(await registerAccount(prisma, input)).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(
      await prisma.user.count({ where: { normalizedEmail: input.email } }),
    ).toBe(0);
  });
});
