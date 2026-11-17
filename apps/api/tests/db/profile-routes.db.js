import { PrismaClient } from '@prisma/client';
import { Temporal } from '@js-temporal/polyfill';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { dateColumn, dayBounds } from '../../src/domain/calendar.js';
import { SESSION_COOKIE } from '../../src/http/boundary.js';
import { createSession } from '../../src/services/sessions.js';
import {
  holdPlayer,
  useCompletionDatabase,
  waitForBlocked,
} from './completion-fixture.js';

const { prisma, owner, plan, occurrence } = useCompletionDatabase();
const origin = 'http://localhost:3000';
const password = '  exact submitted password  ';
const options = {
  database: prisma,
  appOrigin: origin,
  csrfSecret: 'slice-4-db-test',
};
const api = request(createApp(options));
const today = () => Temporal.Now.plainDateISO('UTC');

async function account(client = api) {
  const actor = await owner();
  const cookie = `${SESSION_COOKIE}=${await createSession(prisma, actor.userId)}`;
  const { body } = await client
    .get('/api/v1/auth/session')
    .set('Cookie', cookie)
    .expect(200);
  return {
    ...actor,
    cookie,
    get: (path) => client.get(`/api/v1${path}`).set('Cookie', cookie),
    send: (method, path, payload) => {
      const call = client[method](`/api/v1${path}`)
        .set('Cookie', cookie)
        .set('Origin', origin)
        .set('X-CSRF-Token', body.data.csrfToken);
      return payload ? call.send(payload) : call;
    },
  };
}

function noStore(response) {
  expect(response.headers['cache-control']).toBe('private, no-store');
  expect(response.body.requestId).toBe(response.headers['x-request-id']);
}

describe('habits-week-routes', () => {
  it('returns seven dates with historical snapshots and excludes future dates from compliance', async () => {
    const alice = await account();
    const bob = await account();
    const week = today().subtract({ days: 2 });
    for (const { userId } of [alice, bob]) {
      await prisma.user.update({
        where: { id: userId },
        data: { createdAt: dateColumn(week) },
      });
    }
    const saved = await plan(alice, { offset: -1, status: 'ACTIVE' });
    const item = await occurrence(saved);
    const foreign = await plan(bob, { offset: -1, status: 'ACTIVE' });
    await occurrence(foreign);
    await prisma.questOccurrence.update({
      where: { id: item.id },
      data: {
        status: 'COMPLETED',
        completedAt: saved.startsAtUtc,
        title: 'Original snapshot',
      },
    });
    await prisma.quest.update({
      where: { id: item.questId },
      data: { title: 'Current catalog title' },
    });
    await prisma.scheduleVersion.create({
      data: {
        userId: alice.userId,
        questId: item.questId,
        effectiveFrom: dateColumn(week),
        recurrence: 'DAILY',
        title: 'Historical rule',
        category: 'Academic',
        pillar: 'Cognitive',
        difficulty: 'EASY',
        target: 1,
        ruleVersion: 1,
      },
    });
    await alice.get('/habits?week=2026-02-30').expect(400);
    await alice.get(`/habits?week=${week}&userId=${bob.userId}`).expect(400);
    const response = await alice.get(`/habits?week=${week}`).expect(200);
    noStore(response);
    const { days, scheduled, completed, compliance } = response.body.data;
    expect(days.map(({ date }) => date)).toEqual(
      Array.from({ length: 7 }, (_, days) => week.add({ days }).toString()),
    );
    expect(days[0].occurrences).toEqual([
      expect.objectContaining({ title: 'Historical rule', status: 'MISSED' }),
    ]);
    expect(days[1].occurrences).toEqual([
      expect.objectContaining({
        id: item.id,
        title: 'Original snapshot',
        status: 'COMPLETED',
      }),
    ]);
    expect(days[3]).toMatchObject({
      timing: 'future',
      occurrences: [{ status: 'SCHEDULED' }],
    });
    expect({ scheduled, completed, compliance }).toEqual({
      scheduled: 2,
      completed: 1,
      compliance: 0.5,
    });
    expect(
      await prisma.dayPlan.count({ where: { userId: alice.userId } }),
    ).toBe(1);
    const empty = await alice
      .get(`/habits?week=${today().add({ days: 7 })}`)
      .expect(200);
    expect(empty.body.data.compliance).toBeNull();
    expect(
      (await bob.get(`/habits?week=${week}`).expect(200)).body.data.days[1]
        .occurrences[0].id,
    ).not.toBe(item.id);
  });
});

describe('progress-routes', () => {
  it('bounds dates and pages, keeps tied sequence pages stable, and counts only snapshot pillar XP', async () => {
    const alice = await account();
    const bob = await account();
    const empty = await bob.get('/progress').expect(200);
    expect(empty.body.data).toMatchObject({
      aggregates: [],
      ledger: [],
      nextCursor: null,
      seals: [],
      pillarTotals: [],
    });
    expect(empty.body.data.heatmap).toHaveLength(365);
    for (const query of [
      'limit=101',
      'limit=2&limit=3',
      'from=2020-01-01',
      'from=2020-01-01&to=2022-01-01',
      'cursor=abc',
    ]) {
      await alice.get(`/progress?${query}`).expect(400);
    }
    const timezone = 'America/New_York';
    const localToday = Temporal.Now.plainDateISO(timezone);
    const heatmapStart = localToday.subtract({ days: 364 });
    // Pick a March DST Sunday inside the 365-date window.
    const month = Temporal.PlainDate.from({
      year: localToday.year,
      month: 3,
      day: 8,
    });
    let spring = month.add({ days: (7 - month.dayOfWeek) % 7 });
    if (Temporal.PlainDate.compare(spring, localToday) > 0) {
      const prior = month.subtract({ years: 1 });
      spring = prior.add({ days: (7 - prior.dayOfWeek) % 7 });
    }
    const localDate = dateColumn(spring);
    const bounds = dayBounds(spring, timezone);
    expect((bounds.deadlineUtc - bounds.startsAtUtc) / 3_600_000).toBe(23);
    await prisma.user.update({
      where: { id: alice.userId },
      data: { timezone },
    });
    const saved = await prisma.dayPlan.create({
      data: {
        userId: alice.userId,
        localDate,
        timezoneSnapshot: timezone,
        status: 'ACTIVE',
        ...bounds,
      },
    });
    const target = await occurrence(saved);
    await prisma.questOccurrence.update({
      where: { id: target.id },
      data: { status: 'COMPLETED', completedAt: bounds.startsAtUtc },
    });
    await prisma.quest.update({
      where: { id: target.questId },
      data: { pillar: 'Physical', title: 'Edited title' },
    });
    const event = {
      userId: alice.userId,
      dayId: saved.id,
      occurrenceId: target.id,
      xpDelta: 10,
      healthDelta: 0,
      ruleVersion: 1,
      kind: 'COMPLETION',
      recordedAt: bounds.startsAtUtc,
    };
    await prisma.progressEvent.createMany({
      data: [
        { ...event, sequence: 1, awardKey: 'test:completion' },
        {
          ...event,
          sequence: 2,
          awardKey: 'test:seal',
          xpDelta: 25,
          kind: 'SEAL',
          sealCode: 'iron-will',
        },
      ],
    });
    await prisma.userAchievement.create({
      data: {
        userId: alice.userId,
        achievementCode: 'iron-will',
        ruleVersion: 1,
        bonusXp: 25,
        qualifyingOccurrenceId: target.id,
      },
    });
    await prisma.playerState.update({
      where: { userId: alice.userId },
      data: { totalXp: 401, nextEventSequence: 3, stateVersion: 2 },
    });
    const through = `from=${spring}&to=${spring}&limit=1`;
    const page = await alice.get(`/progress?${through}`).expect(200);
    noStore(page);
    const output = page.body.data;
    expect(output.aggregates).toEqual([
      {
        localDate: spring.toString(),
        completions: 1,
        xpDelta: 35,
        healthDelta: 0,
      },
    ]);
    expect(output.heatmap).toHaveLength(365);
    expect(output.heatmap[0].localDate).toBe(heatmapStart.toString());
    expect(output.heatmap.at(-1).localDate).toBe(localToday.toString());
    if (Temporal.PlainDate.compare(spring, heatmapStart) >= 0) {
      expect(output.heatmap).toContainEqual({
        localDate: spring.toString(),
        status: 'ACTIVE',
        completions: 1,
      });
    }
    expect(output.rank).toMatchObject({
      title: 'Practitioner',
      ruleVersion: 1,
    });
    expect(output.pillarTotals).toEqual([{ pillar: 'Cognitive', xp: 10 }]);
    expect(output.seals).toEqual([
      expect.objectContaining({ achievementCode: 'iron-will', bonusXp: 25 }),
    ]);
    expect(output.ledger[0]).toMatchObject({ sequence: 2, title: 'Read' });
    expect(output.nextCursor).toEqual(expect.any(String));
    await bob.get(`/progress?cursor=${output.nextCursor}`).expect(400);
    await prisma.progressEvent.create({
      data: {
        ...event,
        sequence: 3,
        awardKey: 'test:later',
        occurrenceId: null,
        xpDelta: 0,
        kind: 'DAY_CLOSE',
      },
    });
    await prisma.playerState.update({
      where: { userId: alice.userId },
      data: { nextEventSequence: 4 },
    });
    const next = await alice
      .get(`/progress?limit=1&cursor=${output.nextCursor}`)
      .expect(200);
    expect(next.body.data.ledger.map(({ sequence }) => sequence)).toEqual([1]);
    expect(next.body.data.nextCursor).toBeNull();
    expect((await bob.get('/progress').expect(200)).body.data.ledger).toEqual(
      [],
    );
  });
});

describe('profile-settings-routes', () => {
  it('returns safe committed fields and preserves historical dates when settings change', async () => {
    const alice = await account();
    const bob = await account();
    await alice.get(`/profile?userId=${bob.userId}`).expect(400);
    const synced = await alice.send('post', '/calendar/sync').expect(200);
    const dayId = synced.body.data.plan.id;
    const baseline = await prisma.dayPlan.findUnique({ where: { id: dayId } });
    await alice
      .send('patch', '/settings', { timezone: 'Mars/Olympus' })
      .expect(400);
    await alice
      .send('patch', '/settings', {
        userId: bob.userId,
        displayName: 'Foreign',
      })
      .expect(400);
    const updated = await alice
      .send('patch', '/settings', {
        timezone: 'Asia/Kolkata',
        displayName: ' Alice ',
        goals: ['Read every day'],
      })
      .expect(200);
    noStore(updated);
    expect(updated.body.data).toMatchObject({
      user: {
        id: alice.userId,
        displayName: 'Alice',
        timezone: 'UTC',
        goals: ['Read every day'],
      },
      pendingTimezone: {
        timezone: 'Asia/Kolkata',
        effectiveDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      },
    });
    expect(
      new Date(updated.body.data.pendingTimezone.effectiveAt).getTime(),
    ).toBeGreaterThanOrEqual(baseline.deadlineUtc.getTime());
    await alice
      .send('patch', '/settings', {
        timezone: 'America/New_York',
        displayName: 'Should roll back',
      })
      .expect(409);
    const profile = await alice.get('/profile').expect(200);
    noStore(profile);
    expect(profile.body.data).toMatchObject({
      user: { displayName: 'Alice' },
      totalXp: 0,
      health: 70,
      level: 1,
      stateVersion: 0,
    });
    expect(Object.keys(profile.body.data.user).sort()).toEqual([
      'displayName',
      'email',
      'goals',
      'id',
      'timezone',
    ]);
    expect(await prisma.dayPlan.findUnique({ where: { id: dayId } })).toEqual(
      baseline,
    );
    expect(
      (await bob.get('/profile').expect(200)).body.data.user,
    ).toMatchObject({ id: bob.userId, displayName: 'Test student', goals: [] });
  });
});

describe('account-deletion-postgres', () => {
  it('requires the exact password and protected session, revokes cookies and leaves the second account and seal definitions intact', async () => {
    const alice = await account();
    const bob = await account();
    const saved = await plan(alice);
    await occurrence(saved);
    const sealCount = await prisma.achievement.count();
    await api
      .delete('/api/v1/account')
      .set('Cookie', alice.cookie)
      .send({ password })
      .expect(403);
    await api
      .delete('/api/v1/account')
      .set('Origin', origin)
      .set('Cookie', alice.cookie)
      .send({ password })
      .expect(403);
    await alice
      .send('delete', '/account', { password, userId: bob.userId })
      .expect(400);
    await alice
      .send('delete', '/account', { password: password.trim() })
      .expect(401);
    const response = await alice
      .send('delete', '/account', { password })
      .expect(200);
    noStore(response);
    expect(response.body.data).toEqual({ deleted: true });
    expect(response.headers['set-cookie'][0]).toMatch(
      /__Host-kaizen_session=;.*Path=\/.*HttpOnly.*Secure.*SameSite=Lax/,
    );
    await alice.get('/profile').expect(401);
    await bob.get('/profile').expect(200);
    expect(
      await prisma.dayPlan.count({ where: { userId: alice.userId } }),
    ).toBe(0);
    expect(
      await prisma.session.count({ where: { userId: alice.userId } }),
    ).toBe(0);
    expect(await prisma.achievement.count()).toBe(sealCount);
  });

  it('rolls back sessions and owned records if deletion fails after revoking sessions', async () => {
    const actor = await account();
    await prisma.user.update({
      where: { id: actor.userId },
      data: { displayName: 'Deletion rollback test' },
    });
    const saved = await plan(actor);
    await occurrence(saved);
    const where = { userId: actor.userId };
    const sessions = await prisma.session.count({ where });
    await prisma.$executeRaw`
      CREATE FUNCTION reject_test_account_delete() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF OLD."displayName" = 'Deletion rollback test' THEN
          IF EXISTS (SELECT 1 FROM "Session" WHERE "userId" = OLD.id) THEN
            RAISE EXCEPTION 'test deletion reached User before revoking sessions';
          END IF;
          RAISE EXCEPTION 'test failure after revoking sessions';
        END IF;
        RETURN OLD;
      END;
      $$
    `;
    try {
      await prisma.$executeRaw`
        CREATE TRIGGER reject_test_account_delete BEFORE DELETE ON "User"
        FOR EACH ROW EXECUTE FUNCTION reject_test_account_delete()
      `;
      await actor.send('delete', '/account', { password }).expect(500);
      expect(await prisma.session.count({ where })).toBe(sessions);
      expect(await prisma.dayPlan.count({ where })).toBe(1);
      await actor.get('/profile').expect(200);
    } finally {
      await prisma.$executeRaw`DROP TRIGGER IF EXISTS reject_test_account_delete ON "User"`;
      await prisma.$executeRaw`DROP FUNCTION reject_test_account_delete()`;
    }
  });

  it('serializes simultaneous session issuance behind deletion on the owner lock', async () => {
    const actor = await account();
    const other = new PrismaClient();
    const lock = await holdPlayer(actor);
    const pattern = '%PlayerState%FOR UPDATE%';
    const deleting = actor
      .send('delete', '/account', { password })
      .then((value) => value);
    let results = Promise.allSettled([deleting]);
    try {
      await waitForBlocked(prisma, lock.pid, pattern);
      results = Promise.allSettled([
        deleting,
        createSession(other, actor.userId),
      ]);
      await waitForBlocked(prisma, lock.pid, pattern, 2);
    } finally {
      await lock.release();
      await results;
      await other.$disconnect();
    }
    const [deletion, issuance] = await results;
    expect(deletion).toMatchObject({
      status: 'fulfilled',
      value: { status: 200 },
    });
    expect(issuance).toEqual({ status: 'fulfilled', value: null });
    expect(
      await prisma.session.count({ where: { userId: actor.userId } }),
    ).toBe(0);
  });

  it('limits repeated password confirmation by the authenticated account and IP', async () => {
    const limited = request(
      createApp({ ...options, rateLimits: { loginAccount: 1, loginIp: 3 } }),
    );
    const actor = await account(limited);
    await actor
      .send('delete', '/account', { password: 'Incorrect password' })
      .expect(401);
    const blocked = await actor
      .send('delete', '/account', { password })
      .expect(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    await actor.get('/profile').expect(200);
  });
});
