// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionCache } from '../../../api/session-cache.js';
import QuestsPage from './page.jsx';
import { QuestsScreen } from './screen.jsx';

const uuid = (last) => `09d5a188-cc9f-47d4-8e1e-848c51b51e${last}`;
const user = {
  id: uuid('86'),
  email: 'test@example.com',
  displayName: 'Test player',
  timezone: 'UTC',
};
const date = '2026-12-01T00:00:00.000Z';
function quest(id, title, category, recurrence, archived = false) {
  const fields = {
    userId: user.id,
    title,
    category,
    pillar: category === 'Physical' ? 'Physical' : 'Cognitive',
  };
  return {
    id: uuid(id),
    ...fields,
    archivedAt: archived ? date : null,
    archiveEffectiveDate: archived ? date : null,
    version: 2,
    schedules: [
      {
        ...fields,
        id: uuid(id),
        questId: uuid(id),
        effectiveFrom: date,
        effectiveTo: null,
        recurrence,
        weekdays: recurrence === 'WEEKLY' ? [1, 3] : [],
        difficulty: 'EASY',
        target: 1,
        ruleVersion: 1,
      },
    ],
  };
}
const catalog = [
  quest('87', 'Read', 'Academic', 'DAILY'),
  quest('88', 'Walk', 'Physical', 'DAILY'),
  quest('89', 'Study', 'Academic', 'WEEKLY', true),
  quest('90', 'Lift', 'Physical', 'WEEKLY'),
];
const reply = (data, status = 200) =>
  Response.json({ data, requestId: uuid('91') }, { status });
function mockApi({ list = () => catalog, save } = {}) {
  const fetch = vi.fn(async (path, init) => {
    const { pathname, searchParams } = new URL(path, 'http://localhost');
    if (pathname === '/api/v1/auth/session')
      return reply({
        user,
        csrfToken: 'csrf-proof',
        feedbackSessionId: 'quest-session',
      });
    if (init?.method) return save(pathname, init);
    if (pathname !== '/api/v1/quests')
      throw new Error(`Unexpected request: ${pathname}`);
    const category = searchParams.get('category');
    const archived = searchParams.get('archived');
    return reply({
      quests: list().filter(
        (item) =>
          (!category || item.category === category) &&
          (archived === null ||
            Boolean(item.archivedAt) === (archived === 'true')),
      ),
      nextCursor: null,
    });
  });
  vi.stubGlobal('fetch', fetch);
}

afterEach(() => {
  cleanup();
  sessionCache.setIdentity(null);
  vi.unstubAllGlobals();
});

describe('Quests screen', () => {
  it('registers the self-hosted bold serif for Quests display text', async () => {
    mockApi();
    render(createElement(QuestsPage));

    expect(
      screen.getByRole('main').classList.contains('quests-display-font'),
    ).toBe(true);
    const title = screen.getByRole('heading', { level: 1, name: 'Quests' });
    const cardTitle = await screen.findByRole('heading', {
      level: 2,
      name: 'Read',
    });
    expect(title.classList.contains('font-bold')).toBe(true);
    expect(title.classList.contains('font-black')).toBe(false);
    const displayClass = 'font-(family-name:--font-quests-display)';
    expect(title.classList.contains(displayClass)).toBe(true);
    expect(cardTitle.classList.contains(displayClass)).toBe(true);
    expect(
      screen
        .getByText('Visible quests')
        .nextElementSibling.classList.contains(displayClass),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Edit Read' })
        .classList.contains(displayClass),
    ).toBe(false);
  });

  it('filters quests by category, recurrence and status independently', async () => {
    mockApi();
    render(createElement(QuestsScreen));
    await screen.findByText('Read');
    const category = screen.getByLabelText('Category filter');
    const recurrence = screen.getByLabelText('Recurrence filter');
    const status = screen.getByLabelText('Status filter');
    const titles = () =>
      [
        ...screen
          .getByRole('list', { name: 'Personal quests' })
          .querySelectorAll('li'),
      ].map(
        (item) =>
          within(item).getByText(/^(Read|Walk|Study|Lift)$/).textContent,
      );

    fireEvent.change(category, { target: { value: 'Academic' } });
    await waitFor(() => expect(titles()).toEqual(['Read', 'Study']));
    fireEvent.change(recurrence, { target: { value: 'WEEKLY' } });
    expect(titles()).toEqual(['Study']);
    fireEvent.change(category, { target: { value: '' } });
    await waitFor(() => expect(titles()).toEqual(['Study', 'Lift']));
    fireEvent.change(status, { target: { value: 'active' } });
    await waitFor(() => expect(titles()).toEqual(['Lift']));
    fireEvent.change(recurrence, { target: { value: '' } });
    expect(titles()).toEqual(['Read', 'Walk', 'Lift']);
  });

  it('sends expectedVersion and reloads the latest quest after a version conflict', async () => {
    let latest = catalog[0];
    const save = vi.fn().mockImplementationOnce(() => {
      latest = { ...latest, version: 3, title: 'Read a chapter' };
      return Response.json(
        {
          error: { code: 'QUEST_VERSION_CONFLICT', message: 'Quest changed.' },
        },
        { status: 409 },
      );
    });
    mockApi({ list: () => [latest], save });
    render(createElement(QuestsScreen));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Read' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const button = await screen.findByRole('button', { name: 'Reload quests' });
    expect(save.mock.calls[0][0]).toBe(`/api/v1/quests/${latest.id}`);
    expect(JSON.parse(save.mock.calls[0][1].body)).toMatchObject({
      expectedVersion: 2,
    });
    expect(screen.getByRole('alert').textContent).toContain(
      'This quest changed',
    );
    fireEvent.click(button);
    await screen.findByRole('button', { name: 'Edit Read a chapter' });
  });

  it('creates a weekly quest through the existing endpoint', async () => {
    const { schedules, ...created } = {
      ...catalog[0],
      title: 'New study quest',
    };
    let list = [];
    const save = vi.fn(() => {
      list = [{ ...created, schedules }];
      return reply(created, 201);
    });
    mockApi({ list: () => list, save });
    render(createElement(QuestsScreen));
    fireEvent.click(await screen.findByRole('button', { name: 'New quest' }));
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: created.title },
    });
    fireEvent.change(screen.getByLabelText('Quest recurrence'), {
      target: { value: 'WEEKLY' },
    });
    fireEvent.click(screen.getByLabelText('Monday'));
    fireEvent.click(screen.getByRole('button', { name: 'Create quest' }));

    await screen.findByText('New study quest saved.');
    expect(save.mock.calls[0][0]).toBe('/api/v1/quests');
    expect(JSON.parse(save.mock.calls[0][1].body)).toMatchObject({
      title: created.title,
      recurrence: { kind: 'WEEKLY', weekdays: [1] },
    });
  });
});
