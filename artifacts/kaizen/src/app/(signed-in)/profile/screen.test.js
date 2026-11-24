// @vitest-environment jsdom
import { createElement } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screenApi } from '../../../api/client.js';
import { sessionCache } from '../../../api/session-cache.js';
import ProfilePage from './page.jsx';

const requestId = '09d5a188-cc9f-47d4-8e1e-848c51b51e86';
const user = {
  id: requestId,
  email: 'profile@example.com',
  displayName: 'Profile tester',
  timezone: 'UTC',
};
const initialProfile = {
  user: { ...user, goals: ['Read daily', 'Build strength'] },
  health: 70,
  totalXp: 45,
  currentStreak: 2,
  bestStreak: 4,
  stateVersion: 4,
  level: 17,
  xpIntoLevel: 3,
  rank: { title: 'Server rank', minimumLevel: 1, ruleVersion: 1 },
  seals: [
    {
      achievementCode: 'iron-will',
      ruleVersion: 1,
      unlockedAt: '2026-11-18T12:00:00.000Z',
      qualifyingOccurrenceId: null,
      qualifyingDayId: null,
      bonusXp: 25,
    },
  ],
  pillarTotals: [
    { pillar: 'Cognitive', xp: 13 },
    { pillar: 'Physical', xp: 7 },
  ],
};
let profile;
let fetchMock;
let profileSpy;

beforeEach(() => {
  profile = structuredClone(initialProfile);
  fetchMock = vi.fn(async (url) => {
    const path = new URL(url, 'http://localhost').pathname;
    let data;
    if (path.endsWith('/auth/session'))
      data = { user, csrfToken: 'csrf', feedbackSessionId: 'profile-session' };
    else if (path.endsWith('/profile')) data = profile;
    else throw new Error(`Unexpected request: ${url}`);
    return Response.json({ data, requestId });
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(screenApi, 'today').mockResolvedValue({ status: 'ready' });
  profileSpy = vi.spyOn(screenApi, 'profile');
  vi.spyOn(screenApi, 'progress').mockRejectedValue(
    new Error('Profile must not request Progress.'),
  );
});
afterEach(() => {
  cleanup();
  sessionCache.setIdentity(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Profile screen', () => {
  it('renders server-owned profile values without client-side recalculation', async () => {
    render(createElement(ProfilePage));
    await screen.findByText('Profile tester');
    for (const [label, value] of [
      ['Display name', 'Profile tester'],
      ['Level', '17'],
      ['Rank title', 'Server rank'],
      ['Total XP', '45 XP'],
    ])
      expect(screen.getByText(label).nextElementSibling.textContent).toBe(
        value,
      );
    const levelLabel = screen.getByText('Level');
    expect(
      [levelLabel.textContent, levelLabel.nextElementSibling.textContent].join(
        ' ',
      ),
    ).toBe('Level 17');
    const pillars = within(
      screen.getByRole('region', { name: 'Pillar totals' }),
    );
    expect(pillars.getByText('Cognitive: 13 XP')).toBeTruthy();
    expect(pillars.getByText('Physical: 7 XP')).toBeTruthy();
    expect(screen.getByText('Read daily')).toBeTruthy();
    expect(screen.getByText('Build strength')).toBeTruthy();
    expect(screen.getByText(/iron-will · Bonus XP: 25 XP/)).toBeTruthy();
    expect(screen.getByText('2026-11-18T12:00:00.000Z')).toBeTruthy();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Profile',
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screenApi.progress).not.toHaveBeenCalled();
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).toMatch(/\/(auth\/session|profile)$/);
      expect(options).toMatchObject({
        credentials: 'include',
        cache: 'no-store',
      });
    }
  });

  it('shows labelled empty states for goals and pillar XP', async () => {
    profile.user.goals = [];
    profile.seals = [];
    profile.pillarTotals = [];
    render(createElement(ProfilePage));
    await screen.findByText('No goals selected.');
    for (const [name, text] of [
      ['Selected goals', 'No goals selected.'],
      ['Pillar totals', 'No pillar XP yet.'],
      ['Achievement archive', 'No achievements earned yet.'],
    ]) {
      const section = within(screen.getByRole('region', { name }));
      expect(section.getByText(text)).toBeTruthy();
      expect(section.getByRole('status').textContent).toBe(
        'Nothing to show yet.',
      );
    }
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('labels explicitly returned zero pillar totals as no pillar XP yet', async () => {
    profile.pillarTotals = [{ pillar: 'Cognitive', xp: 0 }];
    render(createElement(ProfilePage));
    await screen.findByText('No pillar XP yet.');
  });

  it('shows the expired-session state without requesting profile data', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: 'SESSION_INVALID', message: 'Invalid session.' } },
        { status: 401 },
      ),
    );
    render(createElement(ProfilePage));
    await screen.findByText('Your session expired. Log in to continue.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(profileSpy).not.toHaveBeenCalled();
    expect(screenApi.today).not.toHaveBeenCalled();
    expect(screenApi.progress).not.toHaveBeenCalled();
    expect(screen.queryByText('Profile tester')).toBeNull();
  });

  it('renders the same static text when reduced motion is requested', async () => {
    let reduced = false;
    const matchMedia = vi.fn((query) => ({
      matches: reduced && query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMedia);
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(
      false,
    );
    const normal = render(createElement(ProfilePage));
    await screen.findByText('Profile tester');
    const text = screen.getByRole('main').textContent;
    normal.unmount();
    sessionCache.clear();
    reduced = true;
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(
      true,
    );
    render(createElement(ProfilePage));
    await screen.findByText('Profile tester');
    expect(screen.getByRole('main').textContent).toBe(text);
  });

  it('shows loading until the validated profile response has arrived', async () => {
    const held = Promise.withResolvers();
    profileSpy.mockReturnValueOnce(held.promise);
    render(createElement(ProfilePage));
    await waitFor(() => expect(profileSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Loading…')).toBeTruthy();
    expect(screen.queryByText('Profile tester')).toBeNull();
    await act(async () => held.resolve(profile));
    await screen.findByText('Profile tester');
    expect(screen.queryByText('Loading…')).toBeNull();
  });

  it('reads profile once and never requests progress', async () => {
    render(createElement(ProfilePage));
    await screen.findByText('Profile tester');
    expect(profileSpy).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal));
    expect(screenApi.progress).not.toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.map(
        ([url]) => new URL(url, 'http://localhost').pathname,
      ),
    ).toEqual(['/api/v1/auth/session', '/api/v1/profile']);
    expect(screen.getByText('Cognitive: 13 XP')).toBeTruthy();
    expect(screen.getByText('Physical: 7 XP')).toBeTruthy();
  });

  it('shows catch-up through the shared state and waits for the bounded sync', async () => {
    screenApi.today.mockResolvedValue({ status: 'catching-up' });
    const held = Promise.withResolvers();
    const syncSpy = vi
      .spyOn(screenApi, 'syncCalendar')
      .mockReturnValue(held.promise);
    render(createElement(ProfilePage));
    await screen.findByText('Catching up on your calendar…');
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(profileSpy).not.toHaveBeenCalled();
    expect(screenApi.progress).not.toHaveBeenCalled();
    await act(async () =>
      held.resolve({ status: 'catching-up', retryAfterSeconds: 1 }),
    );
    await screen.findByText('Profile tester');
    expect(screen.getByText('Catching up on your calendar…')).toBeTruthy();
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(profileSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('shows the error state and reloads after a failed read', async () => {
    profileSpy.mockRejectedValueOnce(new Error('Connection failed'));
    render(createElement(ProfilePage));
    await screen.findByText('Could not load this screen. Try again.');
    expect(screen.queryByText('Profile tester')).toBeNull();
    expect(screen.getAllByRole('button')).toEqual([
      screen.getByRole('button', { name: 'Try again' }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Profile tester');
    expect(profileSpy).toHaveBeenCalledTimes(2);
  });

  it('shows the offline state without partial profile values', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    profileSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(createElement(ProfilePage));
    await screen.findByText('You’re offline. Reconnect to try again.');
    expect(screen.queryByText('Profile tester')).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it.each(['level', 'pillarTotals'])(
    'rejects malformed profile %s instead of rendering partial values',
    async (field) => {
      if (field === 'level') delete profile.level;
      else profile.pillarTotals[0].xp = -1;
      render(createElement(ProfilePage));
      await screen.findByText('Could not load this screen. Try again.');
      expect(screen.queryByText('Profile tester')).toBeNull();
      expect(screen.queryByText('Cognitive: 13 XP')).toBeNull();
    },
  );
});
