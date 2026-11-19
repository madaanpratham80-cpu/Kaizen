// @vitest-environment jsdom
import { createElement } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screenApi } from '../../../api/client.js';
import { sessionCache } from '../../../api/session-cache.js';
import { ProgressScreen } from './screen.jsx';

const user = {
  id: '09d5a188-cc9f-47d4-8e1e-848c51b51e86',
  email: 'progress@example.com',
  displayName: 'Progress tester',
  timezone: 'UTC',
};
const cells = Array.from({ length: 365 }, (_, index) => {
  const date = new Date('2025-11-19T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + index);
  return {
    localDate: date.toISOString().slice(0, 10),
    status: index === 0 ? 'REST' : 'ACTIVE',
    completions: index === 0 ? 0 : 1,
  };
});
const entry = (sequence) => ({
  id: `event-${sequence}`,
  sequence,
  localDate: '2026-11-18',
  title: `Read ${sequence}`,
  kind: 'COMPLETION',
  xpDelta: 10,
  healthDelta: 1,
});
const progress = {
  stateVersion: 4,
  window: { from: '2025-11-19', to: '2026-11-18' },
  rank: { title: 'Initiate' },
  heatmap: cells,
  ledger: [entry(2)],
  nextCursor: 'page-two',
  pillarTotals: [{ pillar: 'Cognitive', xp: 20 }],
  seals: [{ achievementCode: 'iron-will', bonusXp: 25 }],
};
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        data: {
          user,
          csrfToken: 'csrf',
          feedbackSessionId: 'progress-session',
        },
        requestId: 'test',
      }),
    ),
  );
  vi.spyOn(screenApi, 'today').mockResolvedValue({ status: 'ready' });
  vi.spyOn(screenApi, 'progress').mockResolvedValue(progress);
  vi.spyOn(screenApi, 'profile').mockResolvedValue({
    stateVersion: 4,
    totalXp: 45,
    level: 1,
    currentStreak: 3,
    bestStreak: 5,
  });
});
afterEach(() => {
  cleanup();
  sessionCache.setIdentity(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Progress screen', () => {
  it('loads ledger pages with the returned cursor and preserves the bounded first page', async () => {
    const second = Promise.withResolvers();
    screenApi.progress
      .mockResolvedValueOnce(progress)
      .mockReturnValueOnce(second.promise);
    render(createElement(ProgressScreen));
    await screen.findByText('45 XP · Level 1 · Initiate');
    expect(screen.getByText('Cognitive · 20 XP')).toBeTruthy();
    expect(screen.getByText('Iron Will')).toBeTruthy();
    expect(
      within(
        screen.getByRole('list', { name: '365-day activity heatmap' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(365);
    expect(screenApi.progress).toHaveBeenCalledExactlyOnceWith(
      { limit: 25 },
      expect.any(AbortSignal),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Load more entries' }));
    expect(
      screen.getByRole('button', { name: 'Loading entries…' }).disabled,
    ).toBe(true);
    second.resolve({ ...progress, ledger: [entry(1)], nextCursor: null });
    await screen.findByText(/Read 1/);
    expect(screenApi.progress).toHaveBeenLastCalledWith(
      { cursor: 'page-two', limit: 25 },
      expect.any(AbortSignal),
    );
    expect(
      within(
        screen.getByRole('list', { name: 'Progress ledger' }),
      ).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: 'Load more entries' }),
    ).toBeNull();
  });
  it('renders 365 static heatmap labels and completion values', async () => {
    render(createElement(ProgressScreen));
    await screen.findByText('45 XP · Level 1 · Initiate');
    const items = within(
      screen.getByRole('list', { name: '365-day activity heatmap' }),
    ).getAllByRole('listitem');
    expect(items[0].textContent).toContain('REST · 0 completions');
    expect(items[1].textContent).toContain('ACTIVE · 1 completion');
    expect(items).toHaveLength(365);
  });
  it('rejects lifetime totals from a different state version and reloads both endpoints on retry', async () => {
    screenApi.profile.mockResolvedValue({ stateVersion: 3, totalXp: 30 });
    render(createElement(ProgressScreen));
    await screen.findByText(
      'Progress changed while loading. Reload to show a consistent snapshot.',
    );
    expect(screen.queryByText(/30 XP/)).toBeNull();
    screenApi.profile.mockResolvedValue({
      stateVersion: 4,
      totalXp: 45,
      level: 1,
      currentStreak: 3,
      bestStreak: 5,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('45 XP · Level 1 · Initiate');
    expect(screenApi.profile).toHaveBeenCalledTimes(2);
    expect(screenApi.progress).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByText(
        'Progress changed while loading. Reload to show a consistent snapshot.',
      ),
    ).toBeNull();
  });
  it('aborts and discards a slow ledger page when refresh replaces its source snapshot', async () => {
    const slow = Promise.withResolvers();
    const newer = {
      ...progress,
      stateVersion: 5,
      ledger: [entry(9)],
      nextCursor: 'newer-page',
    };
    screenApi.progress
      .mockResolvedValueOnce(progress)
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce(newer);
    render(createElement(ProgressScreen));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Load more entries' }),
    );
    const oldSignal = screenApi.progress.mock.calls[1][1];
    screenApi.profile.mockResolvedValue({
      stateVersion: 5,
      totalXp: 55,
      level: 1,
      currentStreak: 4,
      bestStreak: 5,
    });
    fireEvent(window, new Event('focus'));
    await screen.findByText('55 XP · Level 1 · Initiate');
    expect(oldSignal.aborted).toBe(true);
    expect(screen.getByText(/Read 9/)).toBeTruthy();
    expect(screenApi.progress).toHaveBeenCalledTimes(3);
    await act(async () =>
      slow.resolve({ ...progress, ledger: [entry(1)], nextCursor: null }),
    );
    const ledger = within(
      screen.getByRole('list', { name: 'Progress ledger' }),
    );
    expect(ledger.getAllByRole('listitem')).toHaveLength(1);
    expect(ledger.queryByText(/Read 1/)).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Load more entries' }).disabled,
    ).toBe(false);
  });
  it('keeps a failed page retry on the same cursor', async () => {
    screenApi.progress
      .mockResolvedValueOnce(progress)
      .mockRejectedValueOnce(new Error('Network lost'))
      .mockResolvedValueOnce({
        ...progress,
        ledger: [entry(1)],
        nextCursor: null,
      });
    render(createElement(ProgressScreen));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Load more entries' }),
    );
    await screen.findByText('Could not load this screen. Try again.');
    fireEvent.click(screen.getByRole('button', { name: 'Load more entries' }));
    await waitFor(() => expect(screenApi.progress).toHaveBeenCalledTimes(3));
    expect(screenApi.progress.mock.calls[1][0]).toEqual(
      screenApi.progress.mock.calls[2][0],
    );
  });
});
