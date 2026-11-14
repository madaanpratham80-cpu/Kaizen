import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { describe, expect, it, vi } from 'vitest';
import { loginAccount } from '../../src/services/login.js';
import { useAuthDatabase } from './auth-fixture.js';

const { prisma, register } = useAuthDatabase();

describe('auth-login-credentials', () => {
  it('normalizes email and creates a new session for correct credentials', async () => {
    const account = await register();
    const result = await loginAccount(prisma, {
      email: `  ${account.user.email.toUpperCase()}  `,
      password: account.password,
    });
    if (!result.ok) throw new Error('Expected successful login');
    expect(result).toEqual({
      ok: true,
      user: account.user,
      sessionToken: expect.any(String),
    });
    expect(result.sessionToken).not.toBe(account.sessionToken);
    const digest = createHash('sha256')
      .update(Buffer.from(result.sessionToken, 'base64url'))
      .digest('hex');
    const sessions = await prisma.session.findMany({
      where: { userId: account.user.id },
    });
    expect(sessions).toHaveLength(2);
    expect(sessions.some((session) => session.tokenHash === digest)).toBe(true);
  });

  it('uses bcrypt for unknown emails and returns the same failure as a wrong password', async () => {
    const account = await register();
    const { passwordHash } = await prisma.user.findUniqueOrThrow({
      where: { id: account.user.id },
      select: { passwordHash: true },
    });
    const compare = vi.spyOn(bcrypt, 'compare');
    const password = 'wrong password';
    const wrong = await loginAccount(prisma, {
      email: account.user.email,
      password,
    });
    const unknown = await loginAccount(prisma, {
      email: `unknown-${randomUUID()}@example.com`,
      password,
    });

    expect(unknown).toEqual(wrong);
    expect(wrong).toEqual({
      ok: false,
      status: 401,
      code: 'LOGIN_FAILED',
      message: 'Invalid email or password.',
    });
    expect(compare).toHaveBeenCalledTimes(2);
    expect(compare).toHaveBeenNthCalledWith(1, password, passwordHash);
    const dummyHash = compare.mock.calls[1][1];
    expect(dummyHash).not.toBe(passwordHash);
    expect(bcrypt.getRounds(dummyHash as string)).toBe(12);
    expect(
      await prisma.session.count({ where: { userId: account.user.id } }),
    ).toBe(1);
  });

  it('passes password spaces unchanged to bcrypt and rejects the trimmed version', async () => {
    const account = await register();
    const compare = vi.spyOn(bcrypt, 'compare');
    const email = account.user.email;
    expect(
      (await loginAccount(prisma, { email, password: account.password })).ok,
    ).toBe(true);
    expect(compare).toHaveBeenNthCalledWith(
      1,
      account.password,
      expect.any(String),
    );
    expect(
      await loginAccount(prisma, { email, password: account.password.trim() }),
    ).toMatchObject({
      ok: false,
      code: 'LOGIN_FAILED',
    });
  });

  it('rejects a password over 72 UTF-8 bytes', async () => {
    const account = await register('€'.repeat(24));
    expect(
      await loginAccount(prisma, {
        email: account.user.email,
        password: `${account.password}a`,
      }),
    ).toMatchObject({ ok: false, code: 'LOGIN_FAILED' });
  });
});
