// @vitest-environment jsdom
import { createElement } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { screenApi } from '../../../api/client.js';
import { sessionCache } from '../../../api/session-cache.js';
import SettingsPage from './page.jsx';

const requestId = '09d5a188-cc9f-47d4-8e1e-848c51b51e86';
const user = {
  id: requestId,
  email: 'settings@example.test',
  displayName: 'Original name',
  timezone: 'UTC',
};
const profile = {
  user: { ...user, goals: ['Read'] },
  totalXp: 0,
  health: 70,
  currentStreak: 0,
  bestStreak: 0,
  stateVersion: 0,
  level: 1,
  xpIntoLevel: 0,
  rank: { title: 'Initiate', minimumLevel: 1, ruleVersion: 1 },
  seals: [],
  pillarTotals: [],
};
const reply = (data) => Response.json({ data, requestId });
const failure = (status, code, message) =>
  Response.json({ error: { code, message }, requestId }, { status });
const nameInput = () => screen.getByRole('textbox', { name: 'Display name' });
const timezoneInput = () => screen.getByRole('textbox', { name: 'Timezone' });
const goalInput = () => screen.getByRole('textbox', { name: 'Goal 1' });
const submit = () => screen.getByRole('button', { name: 'Save settings' });
const edit = (input, value) => fireEvent.change(input, { target: { value } });
const route = (url) =>
  new URL(url, 'http://localhost').pathname.split('/').at(-1);
let fetchMock;
let patch;
let readProfile;

beforeEach(() => {
  patch = vi.fn(() => reply({ user: profile.user, pendingTimezone: null }));
  readProfile = vi.fn(() => reply(profile));
  fetchMock = vi.fn((url, options) => {
    switch (route(url)) {
      case 'session':
        return reply({
          user,
          csrfToken: 'csrf-proof',
          feedbackSessionId: 'settings-session',
        });
      case 'profile':
        return readProfile();
      case 'settings':
        return patch(options);
      default:
        throw new Error(`Unexpected request: ${url}`);
    }
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(screenApi, 'today').mockResolvedValue({ status: 'ready' });
});
afterEach(() => {
  cleanup();
  sessionCache.setIdentity(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openSettings() {
  render(createElement(SettingsPage));
  await screen.findByRole('textbox', { name: 'Display name' });
}

it('saves settings and renders the server response, not the form input', async () => {
  patch.mockImplementation(() =>
    reply({
      user: { ...user, displayName: 'Saved by server', goals: ['Server goal'] },
      pendingTimezone: null,
    }),
  );
  await openSettings();
  edit(nameInput(), '  Typed name  ');
  edit(goalInput(), 'Typed goal');
  fireEvent.click(submit());
  await screen.findByText('Settings saved.');
  expect(nameInput().value).toBe('Saved by server');
  expect(goalInput().value).toBe('Server goal');
  expect(timezoneInput().value).toBe('UTC');
  expect(readProfile).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls.map(([url]) => route(url))).toEqual([
    'session',
    'profile',
    'settings',
  ]);
  expect(patch).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'csrf-proof',
      },
    }),
  );
  expect(JSON.parse(patch.mock.calls[0][0].body)).toEqual({
    displayName: 'Typed name',
    goals: ['Typed goal'],
  });
});

it('rejects an invalid field with a field-level error and keeps the other input', async () => {
  patch.mockImplementationOnce(() =>
    failure(400, 'INVALID_INPUT', 'Invalid request input.'),
  );
  await openSettings();
  edit(nameInput(), 'Kept name');
  edit(timezoneInput(), 'Mars/Olympus');
  fireEvent.click(submit());
  expect(timezoneInput().getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById('settings-timezone-error').textContent).toBe(
    'Invalid IANA timezone',
  );
  expect(nameInput().value).toBe('Kept name');
  expect(goalInput().value).toBe('Read');
  expect(patch).not.toHaveBeenCalled();
  edit(timezoneInput(), 'UTC');
  fireEvent.click(submit());
  await screen.findByText('Invalid request input.');
  expect(nameInput().getAttribute('aria-describedby')).toBe(
    'settings-display-name-error',
  );
  expect(nameInput().value).toBe('Kept name');
  expect(goalInput().value).toBe('Read');
});

it('explains that a timezone change applies to future unopened days only', async () => {
  patch.mockImplementation(() =>
    reply({
      user: profile.user,
      pendingTimezone: {
        timezone: 'Asia/Kolkata',
        effectiveDate: '2026-12-17',
        effectiveAt: '2026-12-16T18:30:00.000Z',
      },
    }),
  );
  await openSettings();
  expect(
    screen.getByText(
      "Timezone changes apply to future unopened days only. Today's plan keeps its current timezone.",
    ),
  ).toBeTruthy();
  edit(timezoneInput(), 'Asia/Kolkata');
  expect(screen.queryByText(/Pending timezone/)).toBeNull();
  fireEvent.click(submit());
  await screen.findByText('Settings saved.');
  expect(JSON.parse(patch.mock.calls[0][0].body)).toEqual({
    timezone: 'Asia/Kolkata',
  });
  expect(timezoneInput().value).toBe('UTC');
  const effective = screen.getByText('2026-12-17');
  expect(effective.parentElement.textContent).toBe(
    'Pending timezone: Asia/Kolkata on 2026-12-17.',
  );
  expect(readProfile).toHaveBeenCalledTimes(1);
});

it('submits from the keyboard with Enter and disables submit while pending', async () => {
  const pending = Promise.withResolvers();
  patch.mockReturnValueOnce(pending.promise);
  await openSettings();
  const input = nameInput();
  input.focus();
  expect(document.activeElement).toBe(input);
  edit(input, 'Typed name');
  const button = submit();
  expect(button.type).toBe('submit');
  expect(button.form).toBe(input.form);
  // jsdom omits implicit Enter submission. Invoke its native form submit step.
  expect(fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })).toBe(true);
  act(() => input.form.requestSubmit(button));
  expect(screen.getByRole('button', { name: 'Saving…' }).disabled).toBe(true);
  fireEvent.submit(input.form);
  expect(patch).toHaveBeenCalledTimes(1);
  await act(async () =>
    pending.resolve(
      reply({
        user: { ...profile.user, displayName: 'Typed name' },
        pendingTimezone: null,
      }),
    ),
  );
  expect(screen.getByText('Settings saved.')).toBeTruthy();
});

it('shows the expired-session state on load and on save without a further settings request', async () => {
  const unauthorized = () =>
    failure(401, 'SESSION_INVALID', 'Invalid session.');
  readProfile.mockImplementationOnce(unauthorized);
  const first = render(createElement(SettingsPage));
  const expired = 'Your session expired. Log in to continue.';
  await screen.findByText(expired);
  fireEvent.focus(window);
  expect(readProfile).toHaveBeenCalledTimes(1);
  expect(patch).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Save settings' })).toBeNull();
  first.unmount();

  patch.mockImplementationOnce(unauthorized);
  await openSettings();
  edit(nameInput(), 'Attempted name');
  fireEvent.click(submit());
  await screen.findByText(expired);
  fireEvent.focus(window);
  expect(screen.queryByRole('textbox', { name: 'Display name' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  expect(fetchMock.mock.calls.map(([url]) => route(url))).toEqual([
    'session',
    'profile',
    'session',
    'profile',
    'settings',
  ]);
  expect(patch).toHaveBeenCalledTimes(1);
});

it('renders the same static text when reduced motion is requested', async () => {
  const matchMedia = vi.fn((query) => ({ media: query, matches: false }));
  vi.stubGlobal('matchMedia', matchMedia);
  const query = '(prefers-reduced-motion: reduce)';
  expect(window.matchMedia(query).matches).toBe(false);
  await openSettings();
  const normal = screen.getByRole('main').textContent;
  cleanup();
  matchMedia.mockImplementation((media) => ({
    media,
    matches: media === query,
  }));
  expect(window.matchMedia(query).matches).toBe(true);
  await openSettings();
  expect(screen.getByRole('main').textContent).toBe(normal);
  expect(nameInput().value).toBe('Original name');
});

it('shows the server timezone conflict beside the timezone and preserves the other edits', async () => {
  patch.mockImplementationOnce(() =>
    failure(
      409,
      'TIMEZONE_CHANGE_PENDING',
      'A timezone change is already pending.',
    ),
  );
  await openSettings();
  edit(nameInput(), 'Unsubmitted name');
  edit(timezoneInput(), 'Asia/Kolkata');
  fireEvent.click(submit());
  await screen.findByText('A timezone change is already pending.');
  expect(timezoneInput().getAttribute('aria-describedby')).toContain(
    'settings-timezone-error',
  );
  expect(nameInput().value).toBe('Unsubmitted name');
  expect(screen.queryByText('Settings saved.')).toBeNull();
});

it('keeps edits available to retry after a server failure', async () => {
  patch.mockImplementationOnce(() =>
    failure(503, 'UNAVAILABLE', 'Service unavailable.'),
  );
  await openSettings();
  edit(nameInput(), 'Retry name');
  fireEvent.click(submit());
  await screen.findByText('Could not save settings. Try again.');
  await waitFor(() => expect(submit().disabled).toBe(false));
  expect(nameInput().value).toBe('Retry name');
  fireEvent.click(submit());
  await screen.findByText('Settings saved.');
  expect(patch).toHaveBeenCalledTimes(2);
});

it('shows a field-level error beside the input for each API detail path', async () => {
  patch.mockImplementationOnce(() =>
    Response.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request input.',
          details: [
            { path: ['displayName'], code: 'TOO_SMALL' },
            { path: ['timezone'], code: 'INVALID_VALUE' },
            { path: ['goals', 0], code: 'TOO_SMALL' },
            { path: [], code: 'UNKNOWN_FIELD' },
          ],
        },
        requestId,
      },
      { status: 400 },
    ),
  );
  await openSettings();
  edit(nameInput(), 'Edited');
  fireEvent.click(submit());
  await screen.findByText('Invalid request input.');
  for (const [input, message] of [
    [nameInput(), 'Enter a display name of 1 to 80 characters.'],
    [timezoneInput(), 'Enter a valid IANA timezone.'],
    [goalInput(), 'Enter a goal of 1 to 80 characters.'],
  ]) {
    const error = screen.getByText(message);
    expect(input.getAttribute('aria-describedby').split(' ')).toContain(
      error.id,
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');
  }
  expect(screen.getByText('Invalid request input.').parentElement.tagName).toBe(
    'FORM',
  );
  expect(patch).toHaveBeenCalledTimes(1);
});
