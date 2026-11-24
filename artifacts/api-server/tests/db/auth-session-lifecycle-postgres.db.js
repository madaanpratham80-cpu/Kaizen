import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { loginAccount } from '../../src/services/login.js';
import { lookupSession, revokeSession } from '../../src/services/sessions.js';
import { useAuthDatabase } from './auth-fixture.js';
const { prisma, register } = useAuthDatabase();
const invalid = {
  ok: false,
  status: 401,
  code: 'SESSION_INVALID',
  message: 'Invalid session.',
};
describe('auth-session-lifecycle-postgres', () => {
  it('resolves both registration and login tokens to the public user', async () => {
    const account = await register();
    const login = await loginAccount(prisma, {
      email: account.user.email,
      password: account.password,
    });
    if (!login.ok) throw new Error('Expected successful login');
    for (const token of [account.sessionToken, login.sessionToken]) {
      expect(await lookupSession(prisma, token)).toEqual({
        ok: true,
        user: account.user,
      });
    }
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: account.user.id },
      include: { sessions: true },
    });
    const stored = JSON.stringify(user);
    const digests = user.sessions.map((session) => session.tokenHash);
    for (const token of [account.sessionToken, login.sessionToken]) {
      const bytes = Buffer.from(token, 'base64url');
      expect(bytes).toHaveLength(32);
      expect(digests).toContain(
        createHash('sha256').update(bytes).digest('hex'),
      );
      expect(stored).not.toContain(token);
    }
  });
  it('expires a login session at the seven-day server-clock boundary', async () => {
    const account = await register();
    const start = Date.UTC(2026, 0, 1);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(start);
    const login = await loginAccount(prisma, {
      email: account.user.email,
      password: account.password,
    });
    if (!login.ok) throw new Error('Expected successful login');
    const expiry = Date.UTC(2026, 0, 8);
    clock.mockReturnValue(expiry - 1);
    expect(await lookupSession(prisma, login.sessionToken)).toEqual({
      ok: true,
      user: account.user,
    });
    clock.mockReturnValue(expiry);
    expect(await lookupSession(prisma, login.sessionToken)).toEqual(invalid);
    clock.mockReturnValue(expiry + 1);
    expect(await lookupSession(prisma, login.sessionToken)).toEqual(invalid);
  });
  it('isolates two users and revokes only the presented session owned by the caller', async () => {
    const first = await register();
    const second = await register();
    const login = await loginAccount(prisma, {
      email: first.user.email,
      password: first.password,
    });
    if (!login.ok) throw new Error('Expected successful login');
    expect(await lookupSession(prisma, first.sessionToken)).toEqual({
      ok: true,
      user: first.user,
    });
    expect(
      await revokeSession(prisma, first.user.id, second.sessionToken),
    ).toEqual({
      ok: true,
      code: 'SESSION_REVOKED',
    });
    expect(await lookupSession(prisma, second.sessionToken)).toEqual({
      ok: true,
      user: second.user,
    });
    expect(
      await revokeSession(prisma, first.user.id, first.sessionToken),
    ).toEqual({
      ok: true,
      code: 'SESSION_REVOKED',
    });
    expect(await lookupSession(prisma, first.sessionToken)).toEqual(invalid);
    expect(await lookupSession(prisma, login.sessionToken)).toEqual({
      ok: true,
      user: first.user,
    });
    expect(await lookupSession(prisma, second.sessionToken)).toEqual({
      ok: true,
      user: second.user,
    });
    expect(
      await prisma.session.count({ where: { userId: first.user.id } }),
    ).toBe(1);
  });
});
