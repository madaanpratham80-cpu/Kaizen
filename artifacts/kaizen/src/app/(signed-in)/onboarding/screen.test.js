// @vitest-environment jsdom
import { createElement } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { screenApi } from '../../../api/client.js';
import { sessionCache } from '../../../api/session-cache.js';
import OnboardingPage from './page.jsx';

const requestId = '09d5a188-cc9f-47d4-8e1e-848c51b51e86';
const user = {
  id: '8369eb1a-0540-4bd7-aa93-581287f84169',
  email: 'onboarding@example.test',
  displayName: 'Original name',
  timezone: 'UTC',
};
const profile = {
  user: { ...user, goals: ['Original goal'] },
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
const saved = {
  user: { ...user, displayName: 'Server name', goals: ['Server goal'] },
  pendingTimezone: null,
};
const quest = {
  id: 'd6e6dfd2-67f3-46e8-bcfc-9c611d50f2aa',
  userId: user.id,
  title: 'Server quest',
  category: 'Academic',
  pillar: 'Cognitive',
  archivedAt: null,
  archiveEffectiveDate: null,
  version: 1,
};
const reply = (data, status = 200) =>
  Response.json({ data, requestId }, { status });
const failure = (status, code, message) =>
  Response.json({ error: { code, message }, requestId }, { status });
const edit = (input, value) => fireEvent.change(input, { target: { value } });
const textbox = (name) => screen.getByRole('textbox', { name });
const route = (url) => new URL(url, 'http://localhost').pathname;
const submit = () =>
  screen.getByRole('button', { name: 'Save settings and create quest' });

let fetchMock;
let patchSettings;
let createQuest;
let readProfile;

beforeEach(() => {
  patchSettings = vi.fn(() => reply(saved));
  createQuest = vi.fn(() => reply(quest, 201));
  readProfile = vi.fn(() => reply(profile));
  fetchMock = vi.fn((url, options) => {
    switch (route(url).split('/').at(-1)) {
      case 'session':
        return reply({
          user,
          csrfToken: 'csrf-proof',
          feedbackSessionId: 'onboarding-session',
        });
      case 'profile':
        return readProfile();
      case 'settings':
        return patchSettings(options);
      case 'quests':
        return createQuest(options);
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

async function fillOnboarding() {
  await screen.findByRole('textbox', { name: 'Display name' });
  edit(textbox('Display name'), 'Entered name');
  edit(textbox('Goal 1'), 'Entered goal');
  edit(textbox('Quest title'), 'Entered quest');
  edit(screen.getByLabelText('Start date'), '2030-02-01');
}

it('saves settings before creating the starter quest', async () => {
  const settingsPending = Promise.withResolvers();
  const questPending = Promise.withResolvers();
  patchSettings.mockReturnValueOnce(settingsPending.promise);
  createQuest.mockReturnValueOnce(questPending.promise);
  render(createElement(OnboardingPage));
  expect(screen.getByText('Loading…')).toBeTruthy();
  await fillOnboarding();

  const title = textbox('Quest title');
  const button = submit();
  title.focus();
  expect(document.activeElement).toBe(title);
  expect(button.type).toBe('submit');
  expect(button.form).toBe(title.form);
  // jsdom omits the browser's implicit Enter submit step.
  expect(fireEvent.keyDown(title, { key: 'Enter', code: 'Enter' })).toBe(true);
  act(() => title.form.requestSubmit(button));

  expect(
    screen.getByRole('button', { name: 'Saving settings…' }).disabled,
  ).toBe(true);
  fireEvent.submit(title.form);
  expect(patchSettings).toHaveBeenCalledTimes(1);
  expect(createQuest).not.toHaveBeenCalled();
  expect(JSON.parse(patchSettings.mock.calls[0][0].body)).toEqual({
    displayName: 'Entered name',
    timezone: 'UTC',
    goals: ['Entered goal'],
  });
  expect(patchSettings.mock.calls[0][0]).toMatchObject({
    method: 'PATCH',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': 'csrf-proof',
    },
  });

  await act(async () => settingsPending.resolve(reply(saved)));
  const summary = within(
    screen.getByRole('region', { name: 'Saved settings' }),
  );
  expect(summary.getByText('Server name')).toBeTruthy();
  expect(summary.getByText('Server goal')).toBeTruthy();
  expect(summary.queryByText('Entered name')).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Creating starter quest…' }).disabled,
  ).toBe(true);
  expect(createQuest).toHaveBeenCalledTimes(1);
  expect(createQuest.mock.calls[0][0]).toMatchObject({
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': 'csrf-proof',
    },
  });
  expect(JSON.parse(createQuest.mock.calls[0][0].body)).toEqual({
    title: 'Entered quest',
    clientId: expect.any(String),
    category: 'Academic',
    effectiveFrom: '2030-02-01',
    recurrence: { kind: 'DAILY' },
    difficulty: 'EASY',
    target: 1,
  });

  await act(async () => questPending.resolve(reply(quest, 201)));
  expect(screen.getByText('Starter quest created: Server quest.')).toBeTruthy();
});

it('retries only the starter quest after a partial failure', async () => {
  createQuest.mockImplementationOnce(() =>
    failure(503, 'UNAVAILABLE', 'Try later.'),
  );
  render(createElement(OnboardingPage));
  await fillOnboarding();
  fireEvent.click(submit());
  const retry = await screen.findByRole('button', {
    name: 'Retry starter quest',
  });
  expect(
    screen.getByText(
      'Settings are saved. You can retry creating the starter quest here.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('Server goal')).toBeTruthy();
  expect(screen.getByText('Server name')).toBeTruthy();
  expect(screen.queryByRole('textbox', { name: 'Display name' })).toBeNull();
  expect(textbox('Quest title').value).toBe('Entered quest');
  expect(patchSettings).toHaveBeenCalledTimes(1);
  expect(createQuest).toHaveBeenCalledTimes(1);

  fireEvent.click(retry);
  await screen.findByText('Starter quest created: Server quest.');
  expect(patchSettings).toHaveBeenCalledTimes(1);
  expect(createQuest).toHaveBeenCalledTimes(2);
  expect(createQuest.mock.calls[1][0].body).toBe(
    createQuest.mock.calls[0][0].body,
  );
});

it('reuses the same clientId on the starter quest retry', async () => {
  const generated = vi.spyOn(crypto, 'randomUUID');
  createQuest.mockRejectedValueOnce(new TypeError('Lost response'));
  render(createElement(OnboardingPage));
  await fillOnboarding();
  fireEvent.click(submit());
  const retry = await screen.findByRole('button', {
    name: 'Retry starter quest',
  });
  const first = JSON.parse(createQuest.mock.calls[0][0].body).clientId;
  expect(first).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(generated).toHaveBeenCalledTimes(1);
  fireEvent.click(retry);
  await screen.findByText('Starter quest created: Server quest.');
  expect(JSON.parse(createQuest.mock.calls[1][0].body).clientId).toBe(first);
  expect(generated).toHaveBeenCalledTimes(1);
  expect(patchSettings).toHaveBeenCalledTimes(1);
});

it('starts a new clientId for a new onboarding attempt', async () => {
  const firstView = render(createElement(OnboardingPage));
  await fillOnboarding();
  fireEvent.click(submit());
  await screen.findByText('Starter quest created: Server quest.');
  const first = JSON.parse(createQuest.mock.calls[0][0].body).clientId;
  firstView.unmount();
  render(createElement(OnboardingPage));
  await fillOnboarding();
  fireEvent.click(submit());
  await screen.findByText('Starter quest created: Server quest.');
  const second = JSON.parse(createQuest.mock.calls[1][0].body).clientId;
  expect(second).not.toBe(first);
});

it('shows the expired-session state on either step without a further request', async () => {
  for (const step of [patchSettings, createQuest]) {
    patchSettings.mockClear();
    createQuest.mockClear();
    fetchMock.mockClear();
    step.mockImplementationOnce(() =>
      failure(401, 'SESSION_INVALID', 'Invalid session.'),
    );
    const view = render(createElement(OnboardingPage));
    await fillOnboarding();
    fireEvent.click(submit());
    await screen.findByText('Your session expired. Log in to continue.');
    expect(screen.queryByRole('button')).toBeNull();
    expect(patchSettings).toHaveBeenCalledTimes(1);
    expect(createQuest).toHaveBeenCalledTimes(step === patchSettings ? 0 : 1);
    const count = fetchMock.mock.calls.length;
    await act(async () => {
      fireEvent.focus(window);
      fireEvent(window, new Event('online'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(count);
    view.unmount();
  }
});

it('explains that a timezone change applies to future unopened days only', async () => {
  patchSettings.mockImplementation(() =>
    reply({
      user: saved.user,
      pendingTimezone: {
        timezone: 'Asia/Kolkata',
        effectiveDate: '2030-01-17',
        effectiveAt: '2030-01-16T18:30:00.000Z',
      },
    }),
  );
  render(createElement(OnboardingPage));
  await fillOnboarding();
  expect(
    screen.getByText(
      "Timezone changes apply to future unopened days only. Today's plan keeps its current timezone.",
    ),
  ).toBeTruthy();
  edit(textbox('Timezone'), 'Asia/Kolkata');
  fireEvent.click(submit());
  await screen.findByText('Starter quest created: Server quest.');
  expect(JSON.parse(patchSettings.mock.calls[0][0].body).timezone).toBe(
    'Asia/Kolkata',
  );
  const summary = within(
    screen.getByRole('region', { name: 'Saved settings' }),
  );
  expect(summary.getByText('UTC')).toBeTruthy();
  expect(summary.getByText('2030-01-17').parentElement.textContent).toBe(
    'Pending timezone: Asia/Kolkata on 2030-01-17.',
  );
});

it('renders the same static text when reduced motion is requested', async () => {
  const query = '(prefers-reduced-motion: reduce)';
  const matchMedia = vi.fn((media) => ({ media, matches: false }));
  vi.stubGlobal('matchMedia', matchMedia);
  expect(window.matchMedia(query).matches).toBe(false);
  const normal = render(createElement(OnboardingPage));
  await screen.findByRole('textbox', { name: 'Display name' });
  const text = screen.getByRole('main').textContent;
  normal.unmount();

  matchMedia.mockImplementation((media) => ({
    media,
    matches: media === query,
  }));
  expect(window.matchMedia(query).matches).toBe(true);
  render(createElement(OnboardingPage));
  await screen.findByRole('textbox', { name: 'Display name' });
  expect(screen.getByRole('main').textContent).toBe(text);
  expect(screen.getAllByRole('heading')).toHaveLength(1);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
    'Onboarding',
  );
});

it('maps a goals.0 detail to the goals input and shows an empty-path detail at form level', async () => {
  patchSettings.mockImplementation(() =>
    Response.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request input.',
          details: [
            { path: ['goals', 0], code: 'TOO_SMALL' },
            { path: ['displayName'], code: 'TOO_SMALL' },
            { path: ['timezone'], code: 'INVALID_VALUE' },
            { path: [], code: 'UNKNOWN_FIELD' },
          ],
        },
        requestId,
      },
      { status: 400 },
    ),
  );
  render(createElement(OnboardingPage));
  await fillOnboarding();
  fireEvent.click(submit());
  await screen.findByText('Review the settings before continuing.');
  const goal = textbox('Goal 1');
  const goalError = document.getElementById(
    goal.getAttribute('aria-describedby'),
  );
  expect(goal.name).toBe('goals.0');
  expect(goal.getAttribute('aria-invalid')).toBe('true');
  expect(goalError.textContent).toBe('Enter a goal of 1 to 80 characters.');
  expect(goalError.parentElement).toBe(goal.closest('label').parentElement);
  expect(textbox('Display name').getAttribute('aria-describedby')).toBe(
    'onboarding-error-displayName',
  );
  expect(textbox('Timezone').getAttribute('aria-describedby')).toContain(
    'onboarding-error-timezone',
  );
  expect(
    screen.getByText('Review the settings before continuing.').closest('ul')
      .parentElement,
  ).toBe(goal.form);
  expect(textbox('Display name').value).toBe('Entered name');
  expect(createQuest).not.toHaveBeenCalled();
});
