import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { Temporal } from '@js-temporal/polyfill';
import { createApp } from '../../src/app.js';
import { syncCalendar } from '../../src/services/calendar.js';
import { SESSION_COOKIE } from '../../src/http/boundary.js';
import { useAuthDatabase } from './auth-fixture.js';

const { prisma, register } = useAuthDatabase();
const origin = 'http://localhost:3000';
const api = request(
  createApp({
    database: prisma,
    nodeEnv: 'test',
    appOrigin: origin,
    csrfSecret: 'calendar-route-test',
  }),
);
const owners = [];
const day = (offset = 0) =>
  Temporal.Now.plainDateISO('UTC').add({ days: offset }).toString();
const instant = (date) => new Date(`${date}T00:00:00Z`);
const fields = {
  title: 'Read a chapter',
  category: 'Academic',
  difficulty: 'EASY',
  target: 1,
};
const newQuest = () => ({
  ...fields,
  effectiveFrom: day(2),
  recurrence: { kind: 'DAILY' },
});
const newQuick = () => ({ ...fields, id: randomUUID() });

afterEach(async () => {
  const where = { userId: { in: owners } };
  await prisma.$transaction([
    prisma.progressEvent.deleteMany({ where }),
    prisma.dayPlan.updateMany({ where, data: { priorityId: null } }),
    prisma.questOccurrence.deleteMany({ where }),
    prisma.dayPlan.deleteMany({ where }),
    prisma.scheduleVersion.deleteMany({ where }),
    prisma.quest.deleteMany({ where }),
  ]);
  owners.length = 0;
});

async function account(age = 0) {
  const { user, sessionToken } = await register();
  owners.push(user.id);
  if (age) {
    await prisma.user.update({
      where: { id: user.id },
      data: { createdAt: instant(day(-age)) },
    });
  }
  const cookie = `${SESSION_COOKIE}=${sessionToken}`;
  const { body } = await api
    .get('/api/v1/auth/session')
    .set('Cookie', cookie)
    .expect(200);
  const { csrfToken } = body.data;
  return {
    userId: user.id,
    cookie,
    send(method, path) {
      const call = api[method](`/api/v1${path}`).set('Cookie', cookie);
      return method === 'get'
        ? call
        : call.set('Origin', origin).set('X-CSRF-Token', csrfToken);
    },
  };
}

async function scheduled({ userId }, title) {
  return prisma.quest.create({
    data: {
      title,
      category: fields.category,
      pillar: 'Cognitive',
      userId,
      schedules: {
        create: {
          ...fields,
          title,
          pillar: 'Cognitive',
          recurrence: 'DAILY',
          ruleVersion: 1,
          effectiveFrom: instant(day(-1)),
        },
      },
    },
  });
}

describe('calendar-routes', () => {
  it('returns 202 with a bounded backlog, then 200, and Today only reads committed data', async () => {
    const owner = await account(32);
    await scheduled(owner, 'Read');
    const where = { userId: owner.userId };
    const blank = await owner.send('get', '/today').expect(200);
    expect(blank.body.data).toMatchObject({
      plan: null,
      priority: null,
      status: 'catching-up',
    });
    expect(await prisma.dayPlan.count({ where })).toBe(0);
    await owner
      .send('post', '/calendar/sync')
      .expect(202)
      .expect('Retry-After', '1');
    expect(await prisma.dayPlan.count({ where })).toBe(30);
    const sync = await owner.send('post', '/calendar/sync').expect(200);
    expect(sync.body.data.plan.localDate).toBe(instant(day()).toISOString());
    const plans = await prisma.dayPlan.findMany({
      where,
      orderBy: { localDate: 'asc' },
    });
    expect(plans).toHaveLength(33);
    expect(plans.at(-2)).toMatchObject({
      status: 'MISSED',
      closedAt: expect.any(Date),
    });
    const today = await owner
      .send('get', '/today')
      .expect(200)
      .expect('Cache-Control', 'private, no-store');
    expect(today.body.data).toMatchObject({
      plan: { id: sync.body.data.plan.id, plannedCount: 1 },
      priority: { title: 'Read' },
      health: 65,
      totalXp: 0,
      currentStreak: 0,
      bestStreak: 0,
      stateVersion: 32,
      recoveryHint: {
        code: 'SMALL_COMMITMENT',
        occurrenceId: today.body.data.priority.id,
      },
    });
    expect(await prisma.dayPlan.count({ where })).toBe(33);
    expect(today.body.requestId).toBe(today.headers['x-request-id']);
  });

  it('keeps a pre-opened Today in catch-up until earlier plans finish closing', async () => {
    const owner = await account(32);
    const where = { userId: owner.userId };
    await syncCalendar(prisma, owner);
    expect(await syncCalendar(prisma, owner)).toMatchObject({
      status: 'ready',
    });
    const before = await owner.send('get', '/today').expect(200);
    expect(before.body.data).toMatchObject({
      status: 'catching-up',
      plan: { id: expect.any(String) },
    });
    await owner
      .send('post', '/calendar/sync')
      .expect(202)
      .expect('Retry-After', '1');
    expect(await prisma.progressEvent.count({ where })).toBe(30);
    await owner.send('post', '/calendar/sync').expect(200);
    const events = await prisma.progressEvent.findMany({
      where,
      orderBy: { sequence: 'asc' },
      select: { kind: true, day: { select: { localDate: true } } },
    });
    expect(events).toHaveLength(32);
    expect(
      events.map(({ kind, day: closedDay }) => [kind, closedDay.localDate]),
    ).toEqual(
      Array.from({ length: 32 }, (_, index) => [
        'DAY_CLOSE',
        instant(day(index - 32)),
      ]),
    );
    const ready = await owner.send('get', '/today').expect(200);
    expect(ready.body.data).toMatchObject({
      status: 'ready',
      plan: { id: before.body.data.plan.id },
      health: 70,
      stateVersion: 32,
    });
  });
});

describe('quest-routes', () => {
  it('creates, pages, filters, edits and archives with strict inputs and version checks', async () => {
    const owner = await account();
    for (const query of [
      'limit=0',
      'limit=1&limit=2',
      'archived=maybe',
      'after=bad',
      'userId=other',
    ]) {
      await owner.send('get', `/quests?${query}`).expect(400);
    }
    await owner
      .send('post', '/quests')
      .send({ ...newQuest(), userId: owner.userId })
      .expect(400);
    const created = await owner
      .send('post', '/quests')
      .send(newQuest())
      .expect(201);
    const patch = `/quests/${created.body.data.id}`;
    await owner.send('patch', '/quests/bad').send(newQuest()).expect(400);
    const edit = {
      ...newQuest(),
      title: 'Read more',
      expectedVersion: 1,
      effectiveFrom: day(3),
    };
    await owner.send('patch', patch).send(edit).expect(200);
    const stale = await owner.send('patch', patch).send(edit).expect(409);
    expect(stale.body.error.code).toBe('QUEST_VERSION_CONFLICT');
    const archived = await owner
      .send('patch', patch)
      .send({ archive: true, expectedVersion: 2, effectiveFrom: day(4) })
      .expect(200);
    expect(archived.body.data.archiveEffectiveDate).toBe(
      instant(day(4)).toISOString(),
    );
    await owner
      .send('post', '/quests')
      .send({ ...newQuest(), category: 'Physical' })
      .expect(201);
    const filtered = await owner
      .send('get', '/quests?category=Academic&archived=true')
      .expect(200);
    expect(filtered.body.data.quests.map(({ title }) => title)).toEqual([
      'Read more',
    ]);
    const page = await owner.send('get', '/quests?limit=1').expect(200);
    const next = await owner
      .send('get', `/quests?limit=1&after=${page.body.data.nextCursor}`)
      .expect(200);
    expect(next.body.data.quests[0].id).not.toBe(page.body.data.quests[0].id);
    expect(next.body.data.nextCursor).toBeNull();
  });
});

describe('quick-quest-routes', () => {
  it('deduplicates concurrent creates and replays on a later day without awarding progression', async () => {
    const owner = await account();
    const where = { userId: owner.userId };
    const initial = await prisma.playerState.findUnique({ where });
    const quick = newQuick();
    await owner.send('post', '/quick-quests').send(quick).expect(409);
    await owner
      .send('post', '/quick-quests')
      .send({ ...quick, rewardXp: 900 })
      .expect(400);
    const synced = await owner.send('post', '/calendar/sync').expect(200);
    const firstDay = synced.body.data.plan;
    const [a, b] = await Promise.all([
      owner.send('post', '/quick-quests').send(quick),
      owner.send('post', '/quick-quests').send(quick),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.data).toEqual(b.body.data);
    expect(a.body.data).toMatchObject({
      id: quick.id,
      planned: false,
      status: 'PENDING',
      rewardXp: 10,
      dayPlanId: firstDay.id,
    });
    await owner
      .send('post', '/quick-quests')
      .send({ ...quick, title: 'Changed' })
      .expect(409);
    expect(await prisma.playerState.findUnique({ where })).toEqual(initial);
    await prisma.dayPlan.update({
      where: { id: firstDay.id },
      data: {
        localDate: instant(day(-1)),
        startsAtUtc: instant(day(-1)),
        deadlineUtc: instant(day()),
      },
    });
    const nextDay = await owner.send('post', '/calendar/sync').expect(200);
    expect(nextDay.body.data.plan.id).not.toBe(firstDay.id);
    const afterClose = await prisma.playerState.findUnique({ where });
    expect(afterClose).toMatchObject({
      totalXp: initial.totalXp,
      health: initial.health,
      currentStreak: initial.currentStreak,
      stateVersion: initial.stateVersion + 1,
    });
    const replay = await owner
      .send('post', '/quick-quests')
      .send(quick)
      .expect(200);
    expect(replay.body.data).toEqual(a.body.data);
    expect(await prisma.questOccurrence.count({ where })).toBe(1);
    expect(await prisma.playerState.findUnique({ where })).toEqual(afterClose);
    expect(
      await prisma.dayPlan.findUnique({ where: { id: firstDay.id } }),
    ).toMatchObject({ plannedCount: 0, priorityId: null, status: 'EMPTY' });
    const catalog = await owner.send('get', '/quests').expect(200);
    expect(catalog.body.data.quests).toEqual([]);
  });
  it('bounds new Quick Quests without blocking an existing ID or exposing it as an editable catalog entry', async () => {
    const owner = await account();
    await owner.send('post', '/calendar/sync?userId=other').expect(400);
    await owner.send('post', '/calendar/sync').expect(200);
    const first = newQuick();
    const { body } = await owner
      .send('post', '/quick-quests')
      .send(first)
      .expect(201);
    for (let count = 1; count < 20; count += 1) {
      await owner.send('post', '/quick-quests').send(newQuick()).expect(201);
    }
    const blocked = await owner
      .send('post', '/quick-quests')
      .send(newQuick())
      .expect(409);
    expect(blocked.body.error.code).toBe('QUICK_QUEST_LIMIT');
    await owner.send('post', '/quick-quests').send(first).expect(200);
    await owner
      .send('patch', `/quests/${body.data.questId}`)
      .send({ archive: true, expectedVersion: 1, effectiveFrom: day(2) })
      .expect(404);
  });
});

describe('priority-routes', () => {
  it('accepts a planned occurrence on its own day and rejects expired, locked, unplanned or wrong-day choices', async () => {
    const owner = await account(1);
    await scheduled(owner, 'Read');
    await scheduled(owner, 'Write');
    await owner.send('post', '/calendar/sync').expect(200);
    const [prior, current] = await prisma.dayPlan.findMany({
      where: { userId: owner.userId },
      include: { occurrences: true },
      orderBy: { localDate: 'asc' },
    });
    const patch = `/day-plans/${current.id}/priority`;
    const choice = current.occurrences.find(
      ({ id }) => id !== current.priorityId,
    );
    const updated = await owner
      .send('patch', patch)
      .send({ occurrenceId: choice.id })
      .expect(200);
    expect(updated.body.data.priorityId).toBe(choice.id);
    await owner
      .send('patch', patch)
      .send({ occurrenceId: prior.priorityId })
      .expect(404);
    await owner
      .send('patch', `/day-plans/${prior.id}/priority`)
      .send({ occurrenceId: prior.priorityId })
      .expect(409);
    const quick = await owner
      .send('post', '/quick-quests')
      .send(newQuick())
      .expect(201);
    await owner
      .send('patch', patch)
      .send({ occurrenceId: quick.body.data.id })
      .expect(409);
    await prisma.dayPlan.update({
      where: { id: current.id },
      data: { priorityLockedAt: new Date() },
    });
    await owner
      .send('patch', patch)
      .send({ occurrenceId: current.priorityId })
      .expect(409);
    expect(
      await prisma.dayPlan.findUnique({ where: { id: current.id } }),
    ).toMatchObject({ priorityId: choice.id });
  });
});

it('slice-2-routes-two-accounts isolates all routes and retains authentication, Origin and CSRF checks', async () => {
  const alice = await account();
  const bob = await account();
  await scheduled(alice, 'Alice historical');
  await scheduled(bob, 'Bob historical');
  const first = await alice
    .send('post', '/quests')
    .send(newQuest())
    .expect(201);
  const aliceQuest = first.body.data;
  const aliceSync = await alice.send('post', '/calendar/sync').expect(200);
  expect(await prisma.dayPlan.count({ where: { userId: bob.userId } })).toBe(0);
  const bobSync = await bob.send('post', '/calendar/sync').expect(200);
  expect(bobSync.body.data.plan.id).not.toBe(aliceSync.body.data.plan.id);
  const alicePlan = aliceSync.body.data.plan;
  const bobPlan = bobSync.body.data.plan;
  const bobToday = await bob.send('get', '/today').expect(200);
  expect(bobToday.body.data.occurrences.map(({ title }) => title)).toEqual([
    'Bob historical',
  ]);
  const bobList = await bob.send('get', '/quests').expect(200);
  expect(bobList.body.data.quests.map(({ title }) => title)).toEqual([
    'Bob historical',
  ]);
  const bobCreate = await bob
    .send('post', '/quests')
    .send({ ...newQuest(), title: 'Bob new' })
    .expect(201);
  expect(bobCreate.body.data.userId).toBe(bob.userId);
  const patch = `/quests/${aliceQuest.id}`;
  await bob
    .send('patch', patch)
    .send({ ...newQuest(), effectiveFrom: day(3), expectedVersion: 1 })
    .expect(404);
  await bob
    .send('patch', patch)
    .send({ archive: true, expectedVersion: 1, effectiveFrom: day(3) })
    .expect(404);
  await bob
    .send('patch', `/day-plans/${alicePlan.id}/priority`)
    .send({ occurrenceId: alicePlan.priorityId })
    .expect(404);
  await bob
    .send('patch', `/day-plans/${bobPlan.id}/priority`)
    .send({ occurrenceId: alicePlan.priorityId })
    .expect(404);
  const quick = newQuick();
  const [aliceQuick, bobQuick] = await Promise.all([
    alice.send('post', '/quick-quests').send(quick),
    bob.send('post', '/quick-quests').send(quick),
  ]);
  expect([aliceQuick.status, bobQuick.status].sort()).toEqual([201, 409]);
  expect(
    (aliceQuick.status === 409 ? aliceQuick : bobQuick).body.error.code,
  ).toBe('QUICK_QUEST_CONFLICT');
  expect(await prisma.questOccurrence.count({ where: { id: quick.id } })).toBe(
    1,
  );
  expect(
    await prisma.quest.count({
      where: {
        schedules: { none: {} },
        userId: { in: [alice.userId, bob.userId] },
      },
    }),
  ).toBe(1);
  expect(
    await prisma.quest.findUnique({ where: { id: aliceQuest.id } }),
  ).toMatchObject({ version: 1, archiveEffectiveDate: null });
  expect(
    await prisma.dayPlan.findUnique({ where: { id: alicePlan.id } }),
  ).toEqual(expect.objectContaining({ priorityId: alicePlan.priorityId }));
  for (const [method, path] of [
    ['get', '/today'],
    ['get', '/quests'],
    ['post', '/calendar/sync'],
    ['post', '/quests'],
    ['patch', patch],
    ['post', '/quick-quests'],
    ['patch', `/day-plans/${alicePlan.id}/priority`],
  ]) {
    await api[method](`/api/v1${path}`).set('Origin', origin).expect(401);
    if (method === 'get') continue;
    const csrf = await api[method](`/api/v1${path}`)
      .set('Cookie', alice.cookie)
      .set('Origin', origin)
      .expect(403);
    expect(csrf.body.error.code).toBe('CSRF_INVALID');
    const wrongOrigin = await api[method](`/api/v1${path}`)
      .set('Cookie', alice.cookie)
      .set('Origin', 'https://other.example')
      .expect(403);
    expect(wrongOrigin.body.error.code).toBe('ORIGIN_NOT_ALLOWED');
  }
});
