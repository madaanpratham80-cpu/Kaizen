import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { SESSION_COOKIE } from '../../src/http/boundary.js';
import { createSession } from '../../src/services/sessions.js';
import { operation, useCompletionDatabase } from './completion-fixture.js';

const { prisma, owner, plan, occurrence } = useCompletionDatabase();
const origin = 'http://localhost:3000';
const api = request(
  createApp({
    database: prisma,
    appOrigin: origin,
    csrfSecret: 'completion-route-test',
  }),
);
const path = (id) => `/api/v1/occurrences/${id}/complete`;

async function account() {
  const actor = await owner();
  const sessionToken = await createSession(prisma, actor.userId);
  const cookie = `${SESSION_COOKIE}=${sessionToken}`;
  const { body } = await api
    .get('/api/v1/auth/session')
    .set('Cookie', cookie)
    .expect(200);
  const post = (url) =>
    api
      .post(url)
      .set('Origin', origin)
      .set('Cookie', cookie)
      .set('X-CSRF-Token', body.data.csrfToken);
  return {
    ...actor,
    cookie,
    complete: (target, payload) => post(path(target)).send(payload),
    sync: () => post('/api/v1/calendar/sync'),
  };
}

describe('completion-route-ownership', () => {
  it('enforces session, Origin, CSRF and strict request validation before any award', async () => {
    const actor = await account();
    const target = await occurrence(await plan(actor));
    const payload = operation();
    await api
      .post(path(target.id))
      .set('Origin', origin)
      .send(payload)
      .expect(401)
      .expect(({ body }) => expect(body.error.code).toBe('SESSION_INVALID'));
    await api
      .post(path(target.id))
      .set('Cookie', actor.cookie)
      .send(payload)
      .expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('ORIGIN_NOT_ALLOWED'));
    await api
      .post(path(target.id))
      .set('Origin', origin)
      .set('Cookie', actor.cookie)
      .send(payload)
      .expect(403)
      .expect(({ body }) => expect(body.error.code).toBe('CSRF_INVALID'));
    for (const [id, body] of [
      [target.id, {}],
      ['not-a-uuid', payload],
      [target.id, { operationId: 'invalid' }],
      [target.id, { ...payload, rewardXp: 999, userId: actor.userId }],
    ]) {
      const invalid = await actor.complete(id, body).expect(400);
      expect(invalid.body.error.code).toBe('INVALID_INPUT');
    }
    expect(
      await prisma.progressEvent.count({ where: { userId: actor.userId } }),
    ).toBe(0);
    expect(
      await prisma.completionReceipt.count({ where: { userId: actor.userId } }),
    ).toBe(0);
  });

  it('hides foreign occurrences and returns only committed progression with idempotent replay', async () => {
    const alice = await account();
    const bob = await account();
    const day = await plan(alice, { plannedCount: 2 });
    const target = await occurrence(day);
    const other = await occurrence(day, { priority: false });
    const bobTarget = await occurrence(await plan(bob));
    const payload = operation();
    await prisma.playerState.update({
      where: { userId: alice.userId },
      data: { currentStreak: 6, bestStreak: 6 },
    });
    const aliceBefore = await prisma.playerState.findUnique({
      where: { userId: alice.userId },
    });
    const foreign = await bob.complete(target.id, payload).expect(404);
    const missing = await bob.complete(randomUUID(), payload).expect(404);
    expect(foreign.body.error).toEqual(missing.body.error);
    expect(
      await prisma.questOccurrence.findUnique({ where: { id: target.id } }),
    ).toEqual(target);
    expect(
      await prisma.playerState.findUnique({ where: { userId: alice.userId } }),
    ).toEqual(aliceBefore);
    const owners = { userId: { in: [alice.userId, bob.userId] } };
    expect(await prisma.progressEvent.count({ where: owners })).toBe(0);
    expect(await prisma.completionReceipt.count({ where: owners })).toBe(0);

    const response = await alice
      .complete(target.id, payload)
      .expect(200)
      .expect('Cache-Control', 'private, no-store');
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
    expect(response.body.data).toMatchObject({
      status: 'completed',
      occurrence: {
        id: target.id,
        status: 'COMPLETED',
        completedAt: expect.any(String),
      },
      xpDelta: 35,
      healthDelta: 2,
      totalXp: 35,
      stateVersion: 1,
      seals: [{ code: 'seven-day-warrior', ruleVersion: 1, bonusXp: 25 }],
    });
    expect(response.body.data.eventIds).toHaveLength(2);
    expect(
      (await alice.complete(target.id, payload).expect(200)).body.data,
    ).toEqual(response.body.data);
    const conflict = await alice.complete(other.id, payload).expect(409);
    expect(conflict.body.error.code).toBe('OPERATION_CONFLICT');
    expect(
      await prisma.questOccurrence.findUnique({ where: { id: other.id } }),
    ).toEqual(other);
    const independent = await bob.complete(bobTarget.id, payload).expect(200);
    expect(independent.body.data).toMatchObject({
      xpDelta: 10,
      stateVersion: 1,
    });
    expect(await prisma.completionReceipt.count({ where: owners })).toBe(2);
    expect(await prisma.progressEvent.count({ where: owners })).toBe(3);
  });

  it('returns a retry interval while catch-up is pending without consuming the operation ID', async () => {
    const actor = await account();
    await plan(actor, {
      offset: -1,
      status: 'EMPTY',
      plannedCount: 0,
    });
    const target = await occurrence(await plan(actor));
    const payload = operation();
    const pending = await actor
      .complete(target.id, payload)
      .expect(202)
      .expect('Retry-After', '1');
    expect(pending.body.data).toEqual({
      status: 'catching-up',
      retryAfterSeconds: 1,
    });
    const where = { userId: actor.userId };
    expect(await prisma.completionReceipt.count({ where })).toBe(0);
    expect(await prisma.progressEvent.count({ where })).toBe(0);
    await actor.sync().expect(200);
    const retry = await actor.complete(target.id, payload).expect(200);
    expect(retry.body.data).toMatchObject({
      status: 'completed',
      stateVersion: 2,
    });
  });
});
