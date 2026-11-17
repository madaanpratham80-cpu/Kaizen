// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionCache } from '../../../api/session-cache.js';
import { TodayScreen } from './screen.jsx';

const gsap = vi.hoisted(() => ({ set: vi.fn(), timeline: vi.fn() }));
vi.mock('gsap', () => ({ gsap }));

const uuid = (last) => `09d5a188-cc9f-47d4-8e1e-848c51b51e${last}`;
const day = '2026-11-17';
const now = `${day}T12:00:00.000Z`;
const user = {
  id: uuid('86'),
  email: 'test@example.com',
  displayName: 'Test player',
  timezone: 'UTC',
};
const sessionId = 'test-player-session';
const occurrence = {
  id: uuid('87'),
  questId: uuid('88'),
  dayPlanId: uuid('89'),
  userId: user.id,
  planned: true,
  status: 'PENDING',
  completedAt: null,
  title: 'Read',
  category: 'Academic',
  pillar: 'Cognitive',
  difficulty: 'EASY',
  target: 1,
  rewardXp: 10,
  ruleVersion: 1,
};
const plan = {
  id: occurrence.dayPlanId,
  userId: user.id,
  localDate: `${day}T00:00:00.000Z`,
  timezoneSnapshot: 'UTC',
  startsAtUtc: `${day}T00:00:00.000Z`,
  deadlineUtc: '2026-11-18T00:00:00.000Z',
  status: 'OPEN',
  priorityId: occurrence.id,
  priorityLockedAt: null,
  plannedCount: 1,
  healthGainAccounted: 0,
  streakApplied: false,
  closedAt: null,
};
const state = {
  health: 65,
  totalXp: 20,
  currentStreak: 0,
  bestStreak: 0,
  stateVersion: 3,
};
const read = {
  ...state,
  status: 'ready',
  plan,
  occurrences: [occurrence],
  priority: occurrence,
  recoveryHint: null,
};
const receipt = {
  status: 'completed',
  occurrence: { id: occurrence.id, status: 'COMPLETED', completedAt: now },
  health: 70,
  totalXp: 30,
  currentStreak: 1,
  bestStreak: 1,
  stateVersion: 4,
  xpDelta: 10,
  healthDelta: 5,
  eventIds: [uuid('90')],
  seals: [],
};
const updated = {
  ...read,
  health: 70,
  totalXp: 30,
  currentStreak: 1,
  bestStreak: 1,
  stateVersion: 4,
  occurrences: [{ ...occurrence, ...receipt.occurrence }],
  priority: { ...occurrence, ...receipt.occurrence },
};
const reply = (data) => Response.json({ data, requestId: uuid('93') });

function mockApi(complete, refreshed = updated) {
  let reads = 0;
  const fetch = vi.fn(async (path, init) => {
    const url = new URL(path, 'http://localhost');
    switch (url.pathname) {
      case '/api/v1/auth/session':
        return reply({
          user,
          csrfToken: 'csrf-proof',
          feedbackSessionId: sessionId,
        });
      case '/api/v1/today':
        return reply(reads++ === 0 ? read : refreshed);
      case `/api/v1/occurrences/${occurrence.id}/complete`:
        return complete(init);
      case '/api/v1/habits':
        return reply({
          week: url.searchParams.get('week'),
          days: Array.from({ length: 7 }, () => ({
            date: day,
            id: null,
            status: null,
            timing: 'future',
            occurrences: [],
          })),
          scheduled: 0,
          completed: 0,
          compliance: null,
        });
      case '/api/v1/profile':
        return reply({
          user: { ...user, goals: [] },
          ...state,
          stateVersion: refreshed.stateVersion,
          level: 1,
          xpIntoLevel: 30,
          rank: { title: 'Initiate', minimumLevel: 1, ruleVersion: 1 },
          seals: [],
        });
      case '/api/v1/progress':
        return reply({
          window: { from: day, to: day },
          aggregates: [],
          heatmap: Array.from({ length: 365 }, () => ({
            localDate: day,
            status: null,
            completions: 0,
          })),
          ledger: [],
          nextCursor: null,
          seals: [],
          rank: { title: 'Initiate', minimumLevel: 1, ruleVersion: 1 },
          stateVersion: refreshed.stateVersion,
          pillarTotals: [],
        });
      default:
        throw new Error(`Unexpected request: ${url.pathname}`);
    }
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function motion(matches) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  motion(false);
  gsap.timeline.mockImplementation(() => {
    const timeline = { to: vi.fn(), kill: vi.fn() };
    timeline.to.mockReturnValue(timeline);
    return timeline;
  });
});
afterEach(() => {
  cleanup();
  sessionCache.setIdentity(null);
  vi.unstubAllGlobals();
});

describe('Today screen', () => {
  it('reuses the same operationId after a lost completion response', async () => {
    const first = Promise.withResolvers();
    const complete = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(reply(receipt));
    const fetch = mockApi(complete);
    render(createElement(TodayScreen));

    fireEvent.click(
      await screen.findByRole('button', { name: 'Complete Read' }),
    );
    expect(
      screen.getByRole('button', { name: 'Completing Read…' }).disabled,
    ).toBe(true);
    expect(screen.getByText('Level 1 · 20 XP')).toBeTruthy();
    expect(gsap.timeline).not.toHaveBeenCalled();
    first.reject(new TypeError('Network connection lost'));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Retry completion for Read' }),
    );

    await screen.findByText('Level 1 · 30 XP');
    const bodies = complete.mock.calls.map(([init]) => JSON.parse(init.body));
    expect(bodies).toEqual([{ operationId: expect.any(String) }, bodies[0]]);
    expect(gsap.timeline).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      const paths = fetch.mock.calls.map(
        ([path]) => new URL(path, 'http://localhost').pathname,
      );
      expect(paths.slice(-4)).toEqual([
        '/api/v1/today',
        '/api/v1/habits',
        '/api/v1/profile',
        '/api/v1/progress',
      ]);
      const scope = sessionCache.forSession(sessionId);
      expect(scope.get('profile').stateVersion).toBe(4);
      expect(scope.get('progress').stateVersion).toBe(4);
      expect(scope.get('habits:2026-11-16').scheduled).toBe(0);
    });
  });

  it('discards a completion response with a lower stateVersion', async () => {
    const stale = { ...receipt, stateVersion: 2, totalXp: 10, health: 35 };
    const fetch = mockApi(vi.fn().mockResolvedValue(reply(stale)), {
      ...updated,
      ...state,
      stateVersion: 2,
    });
    render(createElement(TodayScreen));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Complete Read' }),
    );

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/progress'),
        expect.any(Object),
      ),
    );
    await screen.findByRole('button', { name: 'Complete Read' });
    expect(screen.getByText('Level 1 · 20 XP')).toBeTruthy();
    expect(
      screen
        .getByRole('meter', { name: 'Health' })
        .getAttribute('aria-valuenow'),
    ).toBe('65');
    expect(screen.queryByText(/XP earned/)).toBeNull();
    expect(gsap.timeline).not.toHaveBeenCalled();
  });

  it('updates committed XP and health immediately with reduced motion', async () => {
    motion(true);
    mockApi(vi.fn().mockResolvedValue(reply(receipt)));
    render(createElement(TodayScreen));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Complete Read' }),
    );

    await screen.findByText('Level 1 · 30 XP');
    expect(screen.getByText('Healthy')).toBeTruthy();
    expect(
      screen
        .getByRole('meter', { name: 'Health' })
        .getAttribute('aria-valuenow'),
    ).toBe('70');
    expect(window.matchMedia).toHaveBeenCalledWith(
      '(prefers-reduced-motion: reduce)',
    );
    expect(gsap.timeline).not.toHaveBeenCalled();
  });
});
