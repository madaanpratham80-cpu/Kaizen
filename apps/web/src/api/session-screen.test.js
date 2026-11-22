// @vitest-environment jsdom
import { createElement, useState } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { auth } from '../auth/client.js';
import { sessionCache } from './session-cache.js';
import { ScreenNotice, SessionScreen } from './session-screen.jsx';

afterEach(() => {
  cleanup();
  sessionCache.setIdentity(null);
  vi.restoreAllMocks();
});

it('does not recheck the session on focus after the expired state is rendered', async () => {
  const session = vi.spyOn(auth, 'session').mockResolvedValue(null);
  render(
    createElement(SessionScreen, null, () =>
      createElement('p', null, 'Private content'),
    ),
  );
  await screen.findByText('Your session expired. Log in to continue.');
  expect(session).toHaveBeenCalledTimes(1);
  await act(async () => {
    fireEvent.focus(window);
    fireEvent.focus(window);
  });
  expect(session).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Private content')).toBeNull();
});

it('continues to recheck a valid session on focus', async () => {
  const value = {
    user: {
      id: 'user',
      email: 'user@example.test',
      displayName: 'User',
      timezone: 'UTC',
    },
    csrfToken: 'csrf',
    feedbackSessionId: 'focus-session',
  };
  sessionCache.setIdentity(value.feedbackSessionId);
  const session = vi.spyOn(auth, 'session').mockResolvedValue(value);
  render(
    createElement(SessionScreen, null, () =>
      createElement('p', null, 'Private content'),
    ),
  );
  await screen.findByText('Private content');
  fireEvent.focus(window);
  await waitFor(() => expect(session).toHaveBeenCalledTimes(2));
});

it('does not recheck on focus after a child renders an expired-session notice', async () => {
  const value = {
    user: {
      id: 'user',
      email: 'user@example.test',
      displayName: 'User',
      timezone: 'UTC',
    },
    csrfToken: 'csrf',
    feedbackSessionId: 'child-expired-session',
  };
  sessionCache.setIdentity(value.feedbackSessionId);
  const session = vi.spyOn(auth, 'session').mockResolvedValue(value);
  function Child() {
    const [expired, setExpired] = useState(false);
    return expired
      ? createElement(ScreenNotice, { state: 'expired-session' })
      : createElement('button', { onClick: () => setExpired(true) }, 'Expire');
  }
  render(createElement(SessionScreen, null, () => createElement(Child)));
  fireEvent.click(await screen.findByRole('button', { name: 'Expire' }));
  await screen.findByText('Your session expired. Log in to continue.');
  await act(async () => fireEvent.focus(window));
  expect(session).toHaveBeenCalledTimes(1);
});

it('ignores a session check that resolves after a child reports expiry', async () => {
  const value = {
    user: {
      id: 'user',
      email: 'user@example.test',
      displayName: 'User',
      timezone: 'UTC',
    },
    csrfToken: 'csrf',
    feedbackSessionId: 'pending-expired-session',
  };
  sessionCache.setIdentity(value.feedbackSessionId);
  let resolveCheck;
  const pending = new Promise((resolve) => {
    resolveCheck = resolve;
  });
  const session = vi
    .spyOn(auth, 'session')
    .mockResolvedValueOnce(value)
    .mockReturnValueOnce(pending);
  function Child() {
    const [expired, setExpired] = useState(false);
    return expired
      ? createElement(ScreenNotice, { state: 'expired-session' })
      : createElement('button', { onClick: () => setExpired(true) }, 'Expire');
  }
  render(createElement(SessionScreen, null, () => createElement(Child)));
  const button = await screen.findByRole('button', { name: 'Expire' });
  fireEvent.focus(window);
  expect(session).toHaveBeenCalledTimes(2);
  fireEvent.click(button);
  await screen.findByText('Your session expired. Log in to continue.');
  await act(async () => resolveCheck(value));
  fireEvent.focus(window);
  expect(session).toHaveBeenCalledTimes(2);
  expect(
    screen.getByText('Your session expired. Log in to continue.'),
  ).toBeTruthy();
});
