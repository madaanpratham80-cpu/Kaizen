'use client';

import { useEffect, useRef, useState } from 'react';
import { questCategorySchema } from '@kaizen/contracts';
import { screenApi } from '../../../api/client.js';
import {
  readFailure,
  ScreenNotice,
  SessionScreen,
} from '../../../api/session-screen.jsx';
import { ApiError, errorMessage } from '../../../auth/client.js';
import { QuestForm } from './quest-form.jsx';

/** @typedef {import('../../../api/session-screen.jsx').ScreenSession} ScreenSession */
/** @typedef {import('../../../api/session-screen.jsx').SessionScope} SessionScope */
/** @typedef {import('./quest-form.jsx').Quest} Quest */
const displayXp = { EASY: 10, MEDIUM: 20, HARD: 35 };
const filterStyle = 'block w-full border border-current bg-white p-2';

/** @param {{session: ScreenSession, scope: SessionScope, revision: number}} props */
function QuestsContent({ session, scope, revision }) {
  const [category, setCategory] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [status, setStatus] = useState('');
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(null);
  const [failure, setFailure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [conflict, setConflict] = useState(false);
  const [saved, setSaved] = useState('');
  const busy = useRef(false);
  const moreBusy = useRef(false);
  const listLifetime = useRef(null);
  const lifetime = useRef(null);
  const filterKey = `${category}:${status}`;

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = AbortSignal.any([controller.signal, scope.signal]);
    return () => controller.abort();
  }, [scope.signal]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, scope.signal]);
    listLifetime.current = signal;
    moreBusy.current = false;
    const query = {
      category: category || undefined,
      archived: status ? status === 'archived' : undefined,
    };
    async function load() {
      setLoading(true);
      setFailure(null);
      try {
        const result = await screenApi.quests(query, signal);
        if (!signal.aborted) setPage({ ...result, filterKey });
      } catch (error) {
        if (!signal.aborted) setFailure(readFailure(error));
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [category, filterKey, reload, revision, scope.signal, status]);

  const current = page?.filterKey === filterKey ? page : null;

  async function loadMore() {
    const signal = listLifetime.current;
    if (!current?.nextCursor || !signal || signal.aborted || moreBusy.current)
      return;
    moreBusy.current = true;
    setLoading(true);
    setFailure(null);
    try {
      const result = await screenApi.quests(
        {
          after: current.nextCursor,
          category: category || undefined,
          archived: status ? status === 'archived' : undefined,
        },
        signal,
      );
      if (!signal.aborted) {
        const quests = [...current.quests, ...result.quests];
        setPage({ filterKey, quests, nextCursor: result.nextCursor });
      }
    } catch (error) {
      if (!signal.aborted) setFailure(readFailure(error));
    } finally {
      if (!signal.aborted) {
        moreBusy.current = false;
        setLoading(false);
      }
    }
  }

  /** @param {import('./quest-form.jsx').QuestCreate | import('./quest-form.jsx').QuestEdit} input */
  async function save(input) {
    const signal = lifetime.current;
    if (!signal || signal.aborted || busy.current || conflict) return;
    busy.current = true;
    setSaving(true);
    setSaved('');
    setSaveError(null);
    try {
      const options = { csrfToken: session.csrfToken, signal };
      const result =
        editor.quest && 'expectedVersion' in input
          ? await screenApi.editQuest(editor.quest.id, input, options)
          : await screenApi.createQuest(input, options);
      if (signal.aborted) return;
      setEditor(null);
      setSaved(`${result.title} saved.`);
      setReload((value) => value + 1);
    } catch (error) {
      if (signal.aborted) return;
      const state = readFailure(error);
      if (state !== 'error') setFailure(state);
      else if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.code === 'QUEST_VERSION_CONFLICT'
      )
        setConflict(true);
      else setSaveError(errorMessage(error));
    } finally {
      busy.current = false;
      if (!signal.aborted) setSaving(false);
    }
  }

  /** @param {Quest} [quest] */
  function openEditor(quest) {
    setConflict(false);
    setSaveError(null);
    setSaved('');
    setEditor({ quest });
  }

  const retry = () => setReload((value) => value + 1);
  if (failure === 'expired-session') return <ScreenNotice state={failure} />;
  const matching = (current?.quests ?? []).filter(
    ({ category: itemCategory, archivedAt, schedules }) =>
      (!category || itemCategory === category) &&
      (!status || Boolean(archivedAt) === (status === 'archived')) &&
      (!recurrence || schedules[0]?.recurrence === recurrence),
  );

  return (
    <div className="space-y-6">
      <div className="grid items-end gap-4 border-b pb-4 sm:grid-cols-4">
        <label>
          Category filter
          <select
            className={filterStyle}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {questCategorySchema.options.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Recurrence filter
          <select
            className={filterStyle}
            value={recurrence}
            onChange={(event) => setRecurrence(event.target.value)}
          >
            <option value="">All recurrences</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </label>
        <label>
          Status filter
          <select
            className={filterStyle}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <button
          className="auth-button"
          type="button"
          onClick={() => openEditor()}
          disabled={saving}
        >
          New quest
        </button>
      </div>
      {editor && (
        <section
          aria-labelledby="quest-editor"
          className="space-y-3 border bg-progression-paper p-progression"
        >
          <h2 id="quest-editor" className="text-xl font-semibold">
            {editor.quest ? `Edit ${editor.quest.title}` : 'New quest'}
          </h2>
          {saveError && <p role="alert">{saveError}</p>}
          {conflict ? (
            <div className="space-y-2">
              <p role="alert">
                This quest changed since you opened it. Reload quests to get the
                latest version.
              </p>
              <button
                className="auth-button"
                type="button"
                onClick={() => {
                  setEditor(null);
                  setConflict(false);
                  retry();
                }}
              >
                Reload quests
              </button>
            </div>
          ) : (
            <QuestForm
              key={editor.quest?.id ?? 'new'}
              quest={editor.quest}
              timezone={session.user.timezone}
              pending={saving}
              onSave={(input) => void save(input)}
              onCancel={() => setEditor(null)}
            />
          )}
        </section>
      )}
      {saved && <p role="status">{saved}</p>}
      {failure && <ScreenNotice state={failure} retry={retry} />}
      {(loading || (!current && !failure)) && <ScreenNotice state="loading" />}
      {matching.length > 0 && (
        <ul aria-label="Personal quests" className="grid gap-4 sm:grid-cols-2">
          {matching.map((quest) => {
            const schedule = quest.schedules[0];
            const archived = Boolean(quest.archivedAt);
            return (
              <li key={quest.id} className="space-y-2 border p-progression">
                <h2 className="text-xl font-semibold">{quest.title}</h2>
                <p>
                  {archived ? 'Archived' : 'Active'} · {quest.category} ·{' '}
                  {schedule?.recurrence === 'DAILY'
                    ? 'Daily'
                    : schedule?.recurrence === 'WEEKLY'
                      ? 'Weekly'
                      : 'No schedule'}
                </p>
                <p>
                  {schedule
                    ? `${schedule.difficulty.toLowerCase()} difficulty`
                    : 'Difficulty unavailable'}{' '}
                  ·{' '}
                  {schedule?.ruleVersion === 1
                    ? `${displayXp[schedule.difficulty]} XP`
                    : 'XP unavailable'}
                </p>
                {!archived && (
                  <button
                    className="underline"
                    type="button"
                    onClick={() => openEditor(quest)}
                    disabled={saving || loading}
                  >
                    Edit {quest.title}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!matching.length &&
        !loading &&
        !failure &&
        current &&
        (current.nextCursor ? (
          <p>No matching quests on the loaded pages.</p>
        ) : (
          <ScreenNotice state="empty" />
        ))}
      {current?.nextCursor && (
        <button
          type="button"
          className="auth-button"
          onClick={() => void loadMore()}
          disabled={loading || saving}
        >
          Load more quests
        </button>
      )}
    </div>
  );
}

/**
 * @param {{ className?: string }} props
 * @returns {import('react').ReactElement}
 */
export function QuestsScreen({ className = '' }) {
  return (
    <main className={`space-y-6 ${className}`.trim()}>
      <h1 className="font-(family-name:--font-quests-display) text-4xl font-bold tracking-tight">
        Quests
      </h1>
      <SessionScreen>
        {(session, scope, revision) => (
          <QuestsContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
