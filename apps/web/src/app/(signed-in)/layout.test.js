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
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { sessionCache } from '../../api/session-cache.js';
import { auth } from '../../auth/client.js';
import SignedInLayout from './layout.jsx';

const navigation = vi.hoisted(() => ({ pathname: '/today', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
}));

const reply = (data, status = 200) =>
  Response.json({ data, requestId: 'test' }, { status });
const session = {
  user: {
    id: '09d5a188-cc9f-47d4-8e1e-848c51b51e86',
    email: 'shell@example.test',
    displayName: 'Shell',
    timezone: 'UTC',
  },
  csrfToken: 'csrf-proof',
  feedbackSessionId: 'shell-session',
};
let fetchMock;
beforeEach(() => {
  navigation.pathname = '/today';
  navigation.replace.mockReset();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  sessionCache.setIdentity(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const show = () =>
  render(createElement(SignedInLayout, null, 'Private screen'));
const signOutButton = () => screen.getByRole('button', { name: 'Sign out' });

async function readyToSignOut() {
  const button = signOutButton();
  await waitFor(() => expect(button.disabled).toBe(false));
  return button;
}

it('preserves the verified session response shape', async () => {
  fetchMock.mockResolvedValueOnce(reply(session));
  expect(await auth.session()).toStrictEqual(session);
});

it('lists all seven signed-in routes in order', async () => {
  fetchMock.mockResolvedValueOnce(reply(session));
  show();
  const nav = screen.getByRole('navigation', { name: 'Kaizen' });
  expect(
    within(nav)
      .getAllByRole('link')
      .map((link) => [link.textContent, link.getAttribute('href')]),
  ).toEqual([
    ['Today', '/today'],
    ['Quests', '/quests'],
    ['Habits', '/habits'],
    ['Progress', '/progress'],
    ['Profile', '/profile'],
    ['Settings', '/settings'],
    ['Onboarding', '/onboarding'],
  ]);
  await readyToSignOut();
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/v1/auth/session',
  ]);
});

it('marks the current route with aria-current', async () => {
  fetchMock.mockResolvedValueOnce(reply(session));
  navigation.pathname = '/settings';
  show();
  const links = within(screen.getByRole('navigation')).getAllByRole('link');
  expect(
    links
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => link.textContent),
  ).toEqual(['Settings']);
  await readyToSignOut();
});

it('signs out once, clears the session cache, and navigates to login', async () => {
  const mountSession = Promise.withResolvers();
  const logout = Promise.withResolvers();
  fetchMock
    .mockReturnValueOnce(mountSession.promise)
    .mockReturnValueOnce(logout.promise);
  show();
  const button = signOutButton();
  expect(button.disabled).toBe(true);
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/v1/auth/session',
  ]);
  await act(async () => mountSession.resolve(reply(session)));
  expect(button.disabled).toBe(false);
  const clear = vi.spyOn(sessionCache, 'clear');
  const scope = sessionCache.forSession('shell-session');
  scope.set('private', 'account-a');
  fireEvent.click(button);
  fireEvent.click(button);
  expect(button.disabled).toBe(true);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/auth/session');
  expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/logout');
  expect(fetchMock.mock.calls[1][1].headers['X-CSRF-Token']).toBe('csrf-proof');
  expect(clear).not.toHaveBeenCalled();
  expect(navigation.replace).not.toHaveBeenCalled();
  await act(async () => logout.resolve(reply({ success: true })));
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/v1/auth/session',
    '/api/v1/auth/logout',
  ]);
  expect(clear).toHaveBeenCalledTimes(1);
  expect(scope.signal.aborted).toBe(true);
  expect(scope.get('private')).toBeUndefined();
  expect(navigation.replace).toHaveBeenCalledExactlyOnceWith('/login');
  expect(clear.mock.invocationCallOrder[0]).toBeLessThan(
    navigation.replace.mock.invocationCallOrder[0],
  );
});

it('keeps the user on the page and shows an error when sign-out fails', async () => {
  fetchMock.mockResolvedValueOnce(reply(session));
  fetchMock.mockResolvedValueOnce(
    Response.json(
      {
        error: { code: 'CSRF_INVALID', message: 'Stale session' },
        requestId: 'test',
      },
      { status: 403 },
    ),
  );
  show();
  const button = await readyToSignOut();
  const clear = vi.spyOn(sessionCache, 'clear');
  const scope = sessionCache.forSession('shell-session');
  scope.set('private', 'account-a');
  fireEvent.click(button);
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Your session changed. Reload the page before signing out.',
  );
  expect(clear).not.toHaveBeenCalled();
  expect(scope.get('private')).toBe('account-a');
  expect(navigation.replace).not.toHaveBeenCalled();
});

it('shows an error without sending logout when the CSRF token is missing', async () => {
  fetchMock.mockResolvedValueOnce(
    reply({
      user: session.user,
      feedbackSessionId: session.feedbackSessionId,
    }),
  );
  sessionCache.setIdentity(session.feedbackSessionId);
  const clear = vi.spyOn(sessionCache, 'clear');
  show();
  const button = signOutButton();
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Could not verify your session for sign-out. Reload the page to try again.',
  );
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/v1/auth/session',
  ]);
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(clear).not.toHaveBeenCalled();
});

it('keeps the current session when the stored logout proof belongs to a different identity', async () => {
  fetchMock.mockResolvedValueOnce(reply(session));
  show();
  const button = await readyToSignOut();
  sessionCache.setIdentity('replacement-session');
  const replacement = sessionCache.forSession('replacement-session');
  replacement.set('private', 'account-b');
  fireEvent.click(button);
  expect(screen.getByRole('alert').textContent).toBe(
    'Your session changed. Reload the page before signing out.',
  );
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/v1/auth/session',
  ]);
  expect(navigation.replace).not.toHaveBeenCalled();
  expect(replacement.get('private')).toBe('account-b');
});

it('rejects stored logout proof after the cache is cleared without changing identity', async () => {
  fetchMock.mockResolvedValueOnce(reply(session));
  show();
  const button = await readyToSignOut();
  sessionCache.clear();
  expect(sessionCache.forSession(session.feedbackSessionId)).not.toBeNull();
  fireEvent.click(button);
  expect(screen.getByRole('alert').textContent).toBe(
    'Your session changed. Reload the page before signing out.',
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(navigation.replace).not.toHaveBeenCalled();
});

it('keeps the mount session read when the shell re-renders for navigation', async () => {
  fetchMock.mockResolvedValueOnce(reply(session));
  const { rerender } = show();
  await readyToSignOut();
  navigation.pathname = '/profile';
  rerender(createElement(SignedInLayout, null, 'Profile screen'));
  expect(
    screen.getByRole('link', { name: 'Profile' }).getAttribute('aria-current'),
  ).toBe('page');
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/v1/auth/session',
  ]);
});

it('sign-out button is reachable and activates with keyboard', async () => {
  fetchMock.mockResolvedValueOnce(reply(session));
  fetchMock.mockResolvedValueOnce(reply({ success: true }));
  show();
  await readyToSignOut();
  const nav = screen.getByRole('navigation');
  const controls = within(nav)
    .getAllByRole('link')
    .concat(within(nav).getAllByRole('button'));
  expect(controls.map((control) => control.textContent)).toEqual([
    'Today',
    'Quests',
    'Habits',
    'Progress',
    'Profile',
    'Settings',
    'Onboarding',
    'Sign out',
  ]);
  const button = controls.at(-1);
  expect(button.tabIndex).toBe(0);
  button.focus();
  expect(document.activeElement).toBe(button);
  fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
  // Verify focus and handler wiring here. Native Enter activation requires the 3.5 browser run.
  fireEvent.click(button);
  await act(async () => {});
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(navigation.replace).toHaveBeenCalledWith('/login');
});
