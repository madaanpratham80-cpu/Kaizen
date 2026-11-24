// @vitest-environment jsdom
import { createElement } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screenApi } from '../../../api/client.js';
import { sessionCache } from '../../../api/session-cache.js';
import { HabitsScreen } from './screen.jsx';

const user = {
  id: '09d5a188-cc9f-47d4-8e1e-848c51b51e86',
  email: 'habits@example.com',
  displayName: 'Habit tester',
  timezone: 'UTC',
};
const questId = '09d5a188-cc9f-47d4-8e1e-848c51b51e87';
const grid = {
  week: '2026-11-16',
  habits: [
    {
      questId,
      title: 'Reading',
      streak: { current: 3, best: 6 },
      completionRate: 0.5,
      cells: [
        'Completed',
        'Missed',
        'Rest',
        'Not scheduled',
        'Not scheduled',
        'Not scheduled',
        'Not scheduled',
      ].map((label, index) => ({ date: `2026-11-${16 + index}`, label })),
    },
  ],
  days: ['COMPLETED', 'PENDING', null, null, null, null, null].map(
    (status, index) => ({
      date: `2026-11-${16 + index}`,
      id: null,
      status: index === 2 ? 'REST' : 'OPEN',
      timing: index < 3 ? 'elapsed' : 'future',
      occurrences: status
        ? [{ questId, title: 'Reading', status, target: 1, id: null }]
        : [],
    }),
  ),
  scheduled: 2,
  completed: 1,
  compliance: 0.5,
};
let fetchMock;
let habitsSpy;
beforeEach(() => {
  fetchMock = vi.fn(async () =>
    Response.json({
      data: { user, csrfToken: 'csrf', feedbackSessionId: 'habit-session' },
      requestId: 'test',
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(screenApi, 'today').mockResolvedValue({ status: 'ready' });
  habitsSpy = vi.spyOn(screenApi, 'habits').mockResolvedValue(grid);
});
afterEach(() => {
  cleanup();
  sessionCache.setIdentity(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Habits screen', () => {
  it('renders historical completed, missed and rest labels with streaks and weekly rates', async () => {
    render(createElement(HabitsScreen));
    await screen.findByRole('table');
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Missed')).toBeTruthy();
    expect(screen.getByText('Rest')).toBeTruthy();
    expect(screen.getByText('Current 3 · Best 6')).toBeTruthy();
    expect(screen.getByText('Completion rate: 50%')).toBeTruthy();
  });
  it('requests the selected week and renders unavailable compliance', async () => {
    screenApi.habits.mockResolvedValue({
      ...grid,
      scheduled: 0,
      completed: 0,
      compliance: null,
      habits: grid.habits.map((habit) => ({ ...habit, completionRate: null })),
      days: grid.days.map((day) => ({ ...day, occurrences: [] })),
    });
    render(createElement(HabitsScreen));
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Week starting'), {
      target: { value: '2026-09-07' },
    });
    await waitFor(() =>
      expect(screenApi.habits).toHaveBeenCalledWith(
        '2026-09-07',
        expect.any(AbortSignal),
      ),
    );
    expect(screen.getByText('Completion rate: unavailable')).toBeTruthy();
  });
  it('keeps catch-up explicit after the bounded sync and supports retry', async () => {
    screenApi.today.mockResolvedValue({ status: 'catching-up' });
    const heldSync = Promise.withResolvers();
    const syncSpy = vi
      .spyOn(screenApi, 'syncCalendar')
      .mockReturnValue(heldSync.promise);
    render(createElement(HabitsScreen));
    await waitFor(() => expect(syncSpy).toHaveBeenCalledTimes(1));
    expect(habitsSpy).not.toHaveBeenCalled();
    heldSync.resolve({
      status: 'catching-up',
      retryAfterSeconds: 1,
    });
    await screen.findByRole('table');
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(habitsSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Catching up on your calendar…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
  it('renders an expired session without requesting habit data', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: 'SESSION_INVALID', message: 'Invalid session.' } },
        { status: 401 },
      ),
    );
    render(createElement(HabitsScreen));
    await screen.findByText('Your session expired. Log in to continue.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(habitsSpy).not.toHaveBeenCalled();
  });
  it('renders the API cell labels and rate without recalculating from grid occurrences', async () => {
    habitsSpy.mockResolvedValue({
      ...grid,
      days: grid.days.map((day) => ({
        ...day,
        occurrences: day.occurrences.map((item) => ({
          ...item,
          status: 'COMPLETED',
        })),
      })),
      habits: grid.habits.map((habit) => ({ ...habit, completionRate: 0.25 })),
    });
    render(createElement(HabitsScreen));
    await screen.findByRole('table');
    expect(screen.getByText('Completion rate: 25%')).toBeTruthy();
    expect(screen.getByText('Missed')).toBeTruthy();
    expect(screen.getByText('Current 3 · Best 6')).toBeTruthy();
  });
});
