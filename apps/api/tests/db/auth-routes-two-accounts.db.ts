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

function assertCookie(response: {
  headers: Record<string, string | string[] | undefined>;
}) {
  const cookies = response.headers['set-cookie'];
  if (!Array.isArray(cookies)) throw new Error('Expected Set-Cookie');
  expect(cookies).toHaveLength(1);
  expect(cookies[0]).toMatch(/^__Host-kaizen_session=/);
  for (const flag of ['Path=/', 'Secure', 'HttpOnly', 'SameSite=Lax']) {
    expect(cookies[0].split('; ')).toContain(flag);
  }
  expect(cookies[0]).not.toMatch(/(?:^|; )Domain=/i);
  return cookies[0].split(';')[0];
}

it('registers via HTTP and issues a cookie without returning credentials in JSON', async () => {
  const email = `route-${randomUUID()}@example.com`;
  try {
    const res = await client
      .post(`${base}/register`)
      .set('Origin', origin)
      .send({
        email,
        password: 'registration test password',
        displayName: 'Student',
        timezone: 'UTC',
      })
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
        },
      },
      requestId: res.headers['x-request-id'],
    });
  } finally {
    await prisma.$transaction([
      prisma.session.deleteMany({
        where: { user: { normalizedEmail: email } },
      }),
      prisma.user.deleteMany({ where: { normalizedEmail: email } }),
    ]);
  }
});

it('auth-routes-two-accounts keeps sessions and CSRF proofs scoped to their owners', async () => {
  const first = await register();
  const second = await register();
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
  });
  expect(secondSession.body.data.user).toEqual(second.user);
  expect(secondSession.body.data.csrfToken).not.toBe(
    firstSession.body.data.csrfToken,
  );

  const logout = () =>
    client
      .post(`${base}/logout`)
      .set('Origin', origin)
      .set('Cookie', firstCookie);
  const missing = await logout().expect(403);
  expect(missing.body.error.code).toBe('CSRF_INVALID');
  await logout()
    .set('X-CSRF-Token', secondSession.body.data.csrfToken)
    .expect(403);
  const revoked = await logout()
    .set('X-CSRF-Token', firstSession.body.data.csrfToken)
    .expect(200);
  expect(assertCookie(revoked)).toBe('__Host-kaizen_session=');
  await client.get(`${base}/session`).set('Cookie', firstCookie).expect(401);
  await client.get(`${base}/session`).set('Cookie', secondCookie).expect(200);
  expect(await prisma.session.count({ where: { userId: first.user.id } })).toBe(
    1,
  );
  expect(
    await prisma.session.count({ where: { userId: second.user.id } }),
  ).toBe(1);
});
