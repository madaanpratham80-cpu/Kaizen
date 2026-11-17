'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { screenApi } from '../../../api/client.js';
import {
  readFailure,
  ScreenNotice,
  SessionScreen,
} from '../../../api/session-screen.jsx';
import { ApiError } from '../../../auth/client.js';
import { CharacterFeedback } from '../../../progression/character-feedback.jsx';
import { QuestCard, StreakBadge } from '../../../progression/components.jsx';

/** @typedef {Awaited<ReturnType<typeof screenApi.today>>} Snapshot */
/** @typedef {import('../../../api/session-screen.jsx').ScreenSession} ScreenSession */
/** @typedef {import('../../../api/session-screen.jsx').SessionScope} SessionScope */

const STREAK_MILESTONE = 7;
const REFRESH_TIMEOUT_MS = 15000;

/** @param {string} localDate UTC serialization of the plan's local date. */
function weekOf(localDate) {
  const date = new Date(localDate);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

/** @param {{session: ScreenSession, scope: SessionScope, revision: number}} props */
function TodayContent({ session, scope, revision }) {
  const [snapshot, setSnapshot] = useState(
    () => /** @type {Snapshot | undefined} */ (scope.get('today')),
  );
  const latest = useRef(snapshot);
  const [failure, setFailure] = useState(null);
  const [reload, setReload] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(null);
  const [attemptError, setAttemptError] = useState(null);
  const [completion, setCompletion] = useState(null);
  const busy = useRef(false);
  const lifetime = useRef(null);

  const accept = useCallback(
    (incoming) => {
      if (
        scope.signal.aborted ||
        incoming.stateVersion < (latest.current?.stateVersion ?? 0)
      )
        return;
      latest.current = incoming;
      scope.set('today', incoming);
      setSnapshot(incoming);
    },
    [scope],
  );

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = AbortSignal.any([controller.signal, scope.signal]);
    return () => controller.abort();
  }, [scope.signal]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, scope.signal]);
    async function load() {
      setFailure(null);
      try {
        const incoming = await screenApi.today(signal);
        if (signal.aborted) return;
        accept(incoming);
        if (incoming.status === 'catching-up') {
          setSyncing(true);
          try {
            await screenApi.syncCalendar(session.csrfToken, { signal });
            const synced = await screenApi.today(signal);
            if (!signal.aborted) accept(synced);
          } finally {
            if (!signal.aborted) setSyncing(false);
          }
        } else {
          setSyncing(false);
        }
      } catch (error) {
        if (!signal.aborted) setFailure(readFailure(error));
      }
    }
    void load();
    return () => controller.abort();
  }, [accept, reload, revision, scope.signal, session.csrfToken]);

  /** @param {string} localDate @param {AbortSignal} signal */
  async function refreshProgression(localDate, signal) {
    const bounded = AbortSignal.any([
      signal,
      AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    ]);
    const week = weekOf(localDate);
    const tasks = [
      screenApi.today(bounded).then((value) => {
        if (!bounded.aborted) accept(value);
      }),
      screenApi.habits(week, bounded).then((value) => {
        if (!bounded.aborted) scope.set(`habits:${week}`, value);
      }),
      screenApi.profile(bounded).then((value) => {
        if (
          !bounded.aborted &&
          value.stateVersion >= (latest.current?.stateVersion ?? 0)
        )
          scope.set('profile', value);
      }),
      screenApi.progress({}, bounded).then((value) => {
        if (
          !bounded.aborted &&
          value.stateVersion >= (latest.current?.stateVersion ?? 0)
        )
          scope.set('progress', value);
      }),
    ];
    await Promise.allSettled(tasks);
  }

  /** @param {string} occurrenceId */
  async function complete(occurrenceId) {
    const signal = lifetime.current;
    const date = latest.current?.plan?.localDate;
    if (!date || !signal || signal.aborted || busy.current) return;
    const key = `completion:${occurrenceId}`;
    const operationId =
      /** @type {string | undefined} */ (scope.get(key)) ?? crypto.randomUUID();
    scope.set(key, operationId);
    busy.current = true;
    setPending(occurrenceId);
    setAttemptError(null);
    try {
      const result = await screenApi.complete(occurrenceId, operationId, {
        csrfToken: session.csrfToken,
        signal,
      });
      if (signal.aborted) return;
      if (result.status === 'catching-up') {
        setReload((value) => value + 1);
        setAttemptError({
          occurrenceId,
          message:
            'Your calendar is catching up. Retry this completion when it is ready.',
        });
        return;
      }
      if (result.occurrence.id !== occurrenceId)
        throw new Error('Unexpected completion occurrence');
      scope.set(key, undefined);
      const current = latest.current;
      if (result.stateVersion >= current.stateVersion) {
        const update = (item) =>
          item?.id === occurrenceId ? { ...item, ...result.occurrence } : item;
        accept({
          ...current,
          health: result.health,
          totalXp: result.totalXp,
          currentStreak: result.currentStreak,
          bestStreak: result.bestStreak,
          stateVersion: result.stateVersion,
          occurrences: current.occurrences.map(update),
          priority: update(current.priority),
        });
        setCompletion({ sessionId: session.feedbackSessionId, result });
      }
      await refreshProgression(date, signal);
    } catch (error) {
      if (signal.aborted) return;
      if (readFailure(error) === 'expired-session') {
        setFailure('expired-session');
        return;
      }
      setAttemptError({
        occurrenceId,
        message:
          error instanceof ApiError
            ? error.message
            : 'The completion response was lost. Retry this completion to check its result.',
      });
    } finally {
      busy.current = false;
      if (!signal.aborted) setPending(null);
    }
  }

  const retry = () => setReload((value) => value + 1);
  if (failure === 'expired-session' || !snapshot) {
    return (
      <ScreenNotice
        state={failure ?? 'loading'}
        retry={failure ? retry : undefined}
      />
    );
  }
  const waiting = syncing || snapshot.status === 'catching-up';
  const remaining = snapshot.occurrences.filter(
    ({ status }) => status === 'PENDING',
  );
  const completed = snapshot.occurrences.filter(
    ({ status }) => status === 'COMPLETED',
  );
  const receipt = completion?.result;

  return (
    <div className="space-y-8">
      {failure && <ScreenNotice state={failure} retry={retry} />}
      {waiting && (
        <ScreenNotice state="catching-up" retry={syncing ? undefined : retry} />
      )}
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <CharacterFeedback
          sessionId={session.feedbackSessionId}
          snapshot={snapshot}
          completion={completion}
        />
        <div className="space-y-4">
          <StreakBadge
            days={snapshot.currentStreak}
            milestoneDays={STREAK_MILESTONE}
          />
          <section
            aria-labelledby="today-priority"
            className="space-y-2 border p-progression"
          >
            <h2 id="today-priority" className="text-xl font-semibold">
              Daily priority
            </h2>
            <p>{snapshot.priority?.title ?? 'No priority scheduled.'}</p>
            {snapshot.priority && (
              <p>
                {snapshot.priority.status === 'COMPLETED'
                  ? 'Completed'
                  : 'Pending'}
                {snapshot.plan?.priorityLockedAt ? ' · Locked' : ''}
              </p>
            )}
          </section>
        </div>
      </div>
      {snapshot.recoveryHint && (
        <p className="border-l-4 border-health-tired pl-3">
          {snapshot.recoveryHint.code === 'SMALL_COMMITMENT'
            ? 'Start with one easy quest today.'
            : 'Try a smaller commitment on your next scheduled day.'}
        </p>
      )}
      <section aria-labelledby="today-remaining" className="space-y-4">
        <h2 id="today-remaining" className="text-2xl font-semibold">
          Remaining quests
        </h2>
        {attemptError && <p role="alert">{attemptError.message}</p>}
        {receipt?.status === 'completed' && (
          <p role="status">Quest completed · {receipt.xpDelta} XP earned</p>
        )}
        {remaining.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {remaining.map((item) => (
              <li key={item.id} className="space-y-2">
                <QuestCard {...item} completedCount={0} />
                <button
                  type="button"
                  className="auth-button"
                  disabled={waiting || pending !== null}
                  onClick={() => void complete(item.id)}
                >
                  {pending === item.id
                    ? `Completing ${item.title}…`
                    : `${attemptError?.occurrenceId === item.id ? 'Retry completion for' : 'Complete'} ${item.title}`}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !waiting &&
          (completed.length ? (
            <p>All quests for today are complete.</p>
          ) : (
            <div className="space-y-2">
              <ScreenNotice state="empty" />
              <Link href="/quests" className="underline">
                Browse quests
              </Link>
            </div>
          ))
        )}
        {completed.length > 0 && (
          <p>Completed: {completed.map(({ title }) => title).join(', ')}</p>
        )}
      </section>
    </div>
  );
}

/** @returns {import('react').ReactElement} */
export function TodayScreen() {
  return (
    <main className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Today</h1>
      <SessionScreen>
        {(session, scope, revision) => (
          <TodayContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
