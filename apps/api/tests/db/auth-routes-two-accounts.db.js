import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { useAuthDatabase } from './auth-fixture.js';
const { prisma, register } = useAuthDatabase();
const origin = 'https://kaizen.example';
const client = request(
  createApp({
    nodeEnv: 'production',
    appOrigin: origin,
    csrfSecret: 'fixture-secret',
    database: prisma,
  }),
);
const base = '/api/v1/auth';
function assertCookie(response, issued = true) {
  const cookies = response.headers['set-cookie'];
  if (!Array.isArray(cookies)) throw new Error('Expected Set-Cookie');
  expect(cookies).toHaveLength(1);
  expect(cookies[0]).toMatch(/^__Host-kaizen_session=/);
  for (const flag of ['Path=/', 'Secure', 'HttpOnly', 'SameSite=Lax']) {
    expect(cookies[0].split('; ')).toContain(flag);
  }
  expect(cookies[0]).not.toMatch(/(?:^|; )Domain=/i);
  if (issued) expect(cookies[0].split('; ')).toContain('Max-Age=604800');
  return cookies[0].split(';')[0];
}
it('registers via HTTP and issues a cookie without returning credentials in JSON', async () => {
  const email = `route-${randomUUID()}@example.com`;
  const input = {
    email,
    password: 'registration test password',
    displayName: 'Student',
    timezone: 'UTC',
  };
  try {
    await client
      .post(`${base}/register`)
      .set('Origin', origin)
      .send(input)
      .expect(400);
    expect(await prisma.user.count({ where: { normalizedEmail: email } })).toBe(
      0,
    );

    const res = await client
      .post(`${base}/register`)
      .set('Origin', origin)
      .send({ ...input, gender: 'female' })
      .expect(201)
      .expect('Cache-Control', 'private, no-store');
    assertCookie(res);
    expect(res.body).toEqual({
      data: {
        user: {
          id: expect.any(String),
          email,
          displayName: 'Student',
          timezone: 'UTC',
          gender: 'female',
        },
      },
      requestId: res.headers['x-request-id'],
    });
  } finally {
    await prisma.$transaction([
      prisma.session.deleteMany({
        where: { user: { normalizedEmail: email } },
      }),
      prisma.playerState.deleteMany({
        where: { user: { normalizedEmail: email } },
      }),
      prisma.user.deleteMany({ where: { normalizedEmail: email } }),
    ]);
  }
});
it('auth-routes-two-accounts keeps sessions and CSRF proofs scoped to their owners', async () => {
  const first = await register(undefined, 'male');
  const second = await register(undefined, 'female');
  const firstLogin = await client
    .post(`${base}/login`)
    .set('Origin', origin)
    .send({ email: first.user.email, password: first.password })
    .expect(200);
  const firstCookie = assertCookie(firstLogin);
  expect(firstLogin.body.data).toEqual({ user: first.user });
  const secondCookie = `__Host-kaizen_session=${second.sessionToken}`;
  const firstSession = await client
    .get(`${base}/session?userId=${second.user.id}`)
    .set('Cookie', firstCookie)
    .expect(200)
    .expect('Cache-Control', 'private, no-store');
  const secondSession = await client
    .get(`${base}/session`)
    .set('Cookie', secondCookie)
    .expect(200);
  expect(firstSession.body.data).toEqual({
    user: first.user,
    csrfToken: expect.any(String),
    feedbackSessionId: expect.any(String),
  });
  expect(secondSession.body.data.user).toEqual(second.user);
  expect(firstSession.body.data.user.gender).toBe('male');
  expect(secondSession.body.data.user.gender).toBe('female');
  expect(firstSession.body.data.feedbackSessionId).not.toBe(
    firstSession.body.data.csrfToken,
  );
  expect(secondSession.body.data.feedbackSessionId).not.toBe(
    firstSession.body.data.feedbackSessionId,
  );
  const refreshed = await client
    .get(`${base}/session`)
    .set('Cookie', firstCookie)
    .expect(200);
  expect(refreshed.body.data.feedbackSessionId).toBe(
    firstSession.body.data.feedbackSessionId,
  );
  expect(secondSession.body.data.csrfToken).not.toBe(
    firstSession.body.data.csrfToken,
  );
  const logout = () =>
    client
      .post(`${base}/logout`)
      .set('Origin', origin)
      .set('Cookie', firstCookie);
  const missing = await logout()
    .expect(403)
    .expect('Cache-Control', 'private, no-store');
  expect(missing.body.error.code).toBe('CSRF_INVALID');
  await logout()
    .set('X-CSRF-Token', firstSession.body.data.feedbackSessionId)
    .expect(403);
  await logout()
    .set('X-CSRF-Token', secondSession.body.data.csrfToken)
    .expect(403);
  const revoked = await logout()
    .set('X-CSRF-Token', firstSession.body.data.csrfToken)
    .expect(200);
  expect(assertCookie(revoked, false)).toBe('__Host-kaizen_session=');
  await client.get(`${base}/session`).set('Cookie', firstCookie).expect(401);
  await client.get(`${base}/session`).set('Cookie', secondCookie).expect(200);
  expect(await prisma.session.count({ where: { userId: first.user.id } })).toBe(
    1,
  );
  expect(
    await prisma.session.count({ where: { userId: second.user.id } }),
  ).toBe(1);
});
it('returns 401 for expired, malformed, and duplicate session cookies', async () => {
  const account = await register();
  const cookie = `__Host-kaizen_session=${account.sessionToken}`;
  for (const invalid of [
    '__Host-kaizen_session=malformed',
    `${cookie}; ${cookie}`,
  ]) {
    const response = await client
      .get(`${base}/session`)
      .set('Cookie', invalid)
      .expect(401);
    expect(response.body.error.code).toBe('SESSION_INVALID');
  }
  await prisma.session.updateMany({
    where: { userId: account.user.id },
    data: { expiresAt: new Date(0) },
  });
  const expired = await client
    .get(`${base}/session`)
    .set('Cookie', cookie)
    .expect(401);
  expect(expired.body.error.code).toBe('SESSION_INVALID');
});
it('fails closed before creating accounts or sessions without the CSRF secret', async () => {
  const account = await register();
  const unavailable = request(
    createApp({
      nodeEnv: 'production',
      appOrigin: origin,
      csrfSecret: '',
      database: prisma,
    }),
  );
  const email = `route-${randomUUID()}@example.com`;
  for (const [path, body] of [
    [
      'register',
      {
        email,
        password: account.password,
        displayName: 'Student',
        timezone: 'UTC',
      },
    ],
    ['login', { email: account.user.email, password: account.password }],
  ]) {
    const response = await unavailable
      .post(`${base}/${path}`)
      .set('Origin', origin)
      .send(body)
      .expect(503)
      .expect('Cache-Control', 'private, no-store');
    expect(response.body.error.code).toBe('AUTH_UNAVAILABLE');
    expect(response.headers['set-cookie']).toBeUndefined();
  }
  expect(await prisma.user.count({ where: { normalizedEmail: email } })).toBe(
    0,
  );
  expect(
    await prisma.session.count({ where: { userId: account.user.id } }),
  ).toBe(1);
});
