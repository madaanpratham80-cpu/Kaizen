'use client';

import { Link } from 'wouter';
import { useCallback, useEffect, useRef, useState } from 'react';
import { screenApi } from '../../../api/client.js';
import {
  readFailure,
  ScreenNotice,
  SessionScreen,
} from '../../../api/session-screen.jsx';
import { ApiError } from '../../../auth/client.js';
import { CharacterFeedback } from '../../../progression/character-feedback.jsx';

/** @typedef {Awaited<ReturnType<typeof screenApi.today>>} Snapshot */
/** @typedef {import('../../../api/session-screen.jsx').ScreenSession} ScreenSession */
/** @typedef {import('../../../api/session-screen.jsx').SessionScope} SessionScope */

const REFRESH_TIMEOUT_MS = 15000;
const portraits = {
  male: '/today-portrait-male.png',
  female: '/today-portrait-female.png',
};

/** @param {string} localDate UTC serialization of the plan's local date. */
function weekOf(localDate) {
  const date = new Date(localDate);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

/** @param {{completed?: number, planned?: number}} props */
function LedgerHeader({ completed, planned }) {
  return (
    <header className="border-b-2 border-outline-variant bg-primary-container px-space-lg py-space-lg text-on-primary-container sm:px-margin-desktop sm:py-space-xl">
      <p className="font-label-mono-md text-label-mono-md uppercase">
        Operational roster
      </p>
      <h1 className="mt-space-md font-display-lg text-display-lg-mobile uppercase xl:text-display-lg">
        Today’s Ledger
      </h1>
      {planned !== undefined && (
        <div className="mt-space-md">
          <p className="font-label-mono-md text-label-mono-md uppercase">
            Interval progress
          </p>
          <p className="font-display-lg text-display-lg-mobile tabular-nums xl:text-display-lg">
            {completed}/{planned}{' '}
            <span className="font-label-mono-md text-label-mono-md uppercase">
              done
            </span>
          </p>
        </div>
      )}
    </header>
  );
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
      <>
        <LedgerHeader />
        <div className="p-space-md sm:p-space-lg">
          <ScreenNotice
            state={failure ?? 'loading'}
            retry={failure ? retry : undefined}
          />
        </div>
      </>
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
  const completedPlanned = completed.filter(({ planned }) => planned).length;
  const planned = snapshot.plan?.plannedCount ?? 0;

  return (
    <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {(failure || waiting) && (
        <div className="space-y-space-sm border-b border-outline-variant p-space-md md:col-span-2">
          {failure && <ScreenNotice state={failure} retry={retry} />}
          {waiting && (
            <ScreenNotice
              state="catching-up"
              retry={syncing ? undefined : retry}
            />
          )}
        </div>
      )}
      <div className="grid content-start border-b border-outline-variant md:border-r-2 md:border-b-0">
        <CharacterFeedback
          sessionId={session.feedbackSessionId}
          snapshot={snapshot}
          completion={completion}
          poster
          portraitSrc={portraits[session.user.gender]}
        />
        <div className="grid grid-cols-2 divide-x divide-outline-variant border-y border-outline-variant bg-surface-container-low">
          <p className="p-space-md font-label-mono-md text-label-mono-md text-outline uppercase">
            Streak{' '}
            <strong className="mt-space-xs block font-headline-lg text-headline-lg text-primary-container">
              {snapshot.currentStreak}d
            </strong>
          </p>
          <p className="p-space-md font-label-mono-md text-label-mono-md text-outline uppercase">
            Best streak{' '}
            <strong className="mt-space-xs block font-headline-lg text-headline-lg text-tertiary">
              {snapshot.bestStreak}d
            </strong>
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col">
        <LedgerHeader completed={completedPlanned} planned={planned} />
        <div className="flex flex-wrap items-baseline gap-space-md border-b-2 border-outline-variant bg-secondary-fixed px-space-lg py-space-md text-on-secondary-fixed">
          <p className="font-label-mono-lg text-label-mono-lg uppercase">
            Cadence summary
          </p>
          <p className="font-label-mono-md text-label-mono-md uppercase">
            {completedPlanned} of {planned} done today
          </p>
        </div>
        <section
          aria-labelledby="today-priority"
          className="border-b border-outline-variant bg-surface-container-low p-space-md sm:p-space-lg"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-space-sm">
            <p
              id="today-priority"
              className="font-label-mono-sm text-label-mono-sm text-primary uppercase"
            >
              Daily priority
            </p>
            {snapshot.priority && (
              <p className="font-label-mono-sm text-label-mono-sm text-secondary uppercase">
                {snapshot.priority.status === 'COMPLETED'
                  ? 'Completed'
                  : 'Pending'}
                {snapshot.plan?.priorityLockedAt ? ' · Locked' : ''}
              </p>
            )}
          </div>
          <p className="mt-space-sm font-headline-lg text-headline-lg break-words uppercase">
            {snapshot.priority?.title ?? 'No priority scheduled.'}
          </p>
        </section>
        {snapshot.recoveryHint && (
          <p className="border-b border-l-4 border-outline-variant border-l-tertiary bg-surface-container-high px-space-md py-space-sm text-secondary sm:px-space-lg">
            {snapshot.recoveryHint.code === 'SMALL_COMMITMENT'
              ? 'Start with one easy quest today.'
              : 'Try a smaller commitment on your next scheduled day.'}
          </p>
        )}
        <section aria-labelledby="today-remaining">
          <p
            id="today-remaining"
            className="border-b border-outline-variant bg-surface-container-lowest px-space-md py-space-sm font-label-mono-lg text-label-mono-lg text-secondary uppercase sm:px-space-lg"
          >
            Remaining quests
          </p>
          {attemptError && (
            <p
              role="alert"
              className="px-space-md py-space-sm text-error sm:px-space-lg"
            >
              {attemptError.message}
            </p>
          )}
          {receipt?.status === 'completed' && (
            <p
              role="status"
              className="border-b border-outline-variant px-space-md py-space-sm font-label-mono-sm text-label-mono-sm text-tertiary sm:px-space-lg"
            >
              Quest completed · {receipt.xpDelta} XP earned
            </p>
          )}
          {remaining.length ? (
            <ul className="divide-y divide-outline-variant">
              {remaining.map((item) => (
                <li
                  key={item.id}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-space-md bg-surface px-space-md py-space-lg sm:px-space-lg"
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="font-label-mono-sm text-label-mono-sm text-secondary uppercase">
                      Pending · {item.difficulty} · {item.rewardXp} XP
                    </p>
                    <p className="mt-space-xs font-headline-sm text-headline-sm break-words">
                      {item.title}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="max-w-full border border-primary-container bg-primary-container px-space-md py-space-sm font-label-mono-md text-label-mono-md break-words text-on-primary-container uppercase hover:bg-on-surface hover:text-surface focus-visible:!outline-primary focus-visible:!outline-offset-2 disabled:opacity-60"
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
              <p className="px-space-md py-space-lg sm:px-space-lg">
                All quests for today are complete.
              </p>
            ) : (
              <div className="space-y-space-sm px-space-md py-space-lg sm:px-space-lg">
                <ScreenNotice state="empty" />
                <Link
                  href="/quests"
                  className="text-primary underline focus-visible:!outline-primary"
                >
                  Browse quests
                </Link>
              </div>
            ))
          )}
          {completed.length > 0 && (
            <p className="border-t border-outline-variant bg-surface-container-lowest px-space-md py-space-sm text-tertiary sm:px-space-lg">
              Completed: {completed.map(({ title }) => title).join(', ')}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

/** @returns {import('react').ReactElement} */
export function TodayScreen() {
  return (
    <main className="min-h-dvh border-b border-outline-variant bg-surface font-body-md text-body-md text-on-surface">
      <SessionScreen>
        {(session, scope, revision) => (
          <TodayContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
