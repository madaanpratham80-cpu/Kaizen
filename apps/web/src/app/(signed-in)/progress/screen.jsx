'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { screenApi } from '../../../api/client.js';
import {
  readFailure,
  ScreenNotice,
  SessionScreen,
} from '../../../api/session-screen.jsx';
import { useCalendarRead } from '../../../api/use-calendar-read.js';
import { ApiError } from '../../../auth/client.js';
import { SealBadge } from '../../../progression/components.jsx';

const PAGE_SIZE = 25;
const SEAL_TITLES = {
  'seven-day-warrior': 'Seven-Day Warrior',
  'iron-will': 'Iron Will',
  'hundred-gates': 'Hundred Gates',
};

/** @param {{cells: Awaited<ReturnType<typeof screenApi.progress>>['heatmap']}} props */
function Heatmap({ cells }) {
  return (
    <ul
      aria-label="365-day activity heatmap"
      className="grid gap-1 sm:grid-cols-7 lg:grid-cols-14"
    >
      {cells.map(({ localDate, status, completions }) => (
        <li
          key={localDate}
          className={`border p-2 text-xs ${completions ? 'bg-progression-ink text-progression-paper' : 'bg-progression-paper'}`}
        >
          <time dateTime={localDate}>{localDate}</time>
          <br />
          {status ?? 'No plan'} · {completions}{' '}
          {completions === 1 ? 'completion' : 'completions'}
        </li>
      ))}
    </ul>
  );
}

/** @param {{session: import('../../../api/session-screen.jsx').ScreenSession, scope: import('../../../api/session-screen.jsx').SessionScope, revision: number}} props */
function ProgressContent({ session, scope, revision }) {
  const read = useCallback(async (signal) => {
    const [progress, totals] = await Promise.all([
      screenApi.progress({ limit: PAGE_SIZE }, signal),
      screenApi.profile(signal),
    ]);
    if (progress.stateVersion !== totals.stateVersion)
      throw new ApiError(
        409,
        'Progress changed while loading. Refresh for a consistent snapshot.',
        'STATE_VERSION_MISMATCH',
      );
    return { ...progress, totals };
  }, []);
  const { data, state, retry } = useCalendarRead(
    session,
    scope,
    revision,
    'progress:overview',
    read,
  );
  const [pagination, setPagination] = useState(null);
  const [pending, setPending] = useState(null);
  const [pageError, setPageError] = useState(null);
  const activeRequest = useRef(null);
  const activeSource = useRef(null);
  const pageSignal = useRef(null);
  useLayoutEffect(() => {
    const controller = new AbortController();
    activeSource.current = data;
    pageSignal.current = AbortSignal.any([controller.signal, scope.signal]);
    return () => {
      controller.abort();
      activeSource.current = null;
    };
  }, [data, scope.signal]);
  const page = pagination?.source === data ? pagination : data;
  const loadingMore = pending?.source === data && !pending.signal.aborted;
  const paginationFailure = pageError?.source === data ? pageError.state : null;

  async function loadMore() {
    const signal = pageSignal.current;
    if (
      !signal ||
      signal.aborted ||
      !page?.nextCursor ||
      (activeRequest.current?.source === data &&
        !activeRequest.current.signal.aborted)
    )
      return;
    const request = { source: data, signal };
    activeRequest.current = request;
    setPending(request);
    setPageError(null);
    try {
      const result = await screenApi.progress(
        { cursor: page.nextCursor, limit: PAGE_SIZE },
        signal,
      );
      if (signal.aborted || activeSource.current !== request.source) return;
      const existing = new Set(page.ledger.map(({ id }) => id));
      setPagination((previous) => {
        if (signal.aborted || activeSource.current !== request.source)
          return previous;
        return {
          source: request.source,
          ledger: [
            ...page.ledger,
            ...result.ledger.filter(({ id }) => !existing.has(id)),
          ],
          nextCursor: result.nextCursor,
        };
      });
    } catch (error) {
      if (!signal.aborted && activeSource.current === request.source)
        setPageError({ source: request.source, state: readFailure(error) });
    } finally {
      if (activeRequest.current === request) activeRequest.current = null;
      if (!signal.aborted)
        setPending((previous) => (previous === request ? null : previous));
    }
  }

  if (state === 'expired-session' || paginationFailure === 'expired-session')
    return <ScreenNotice state="expired-session" />;
  return (
    <div className="space-y-8">
      {state && (
        <ScreenNotice
          state={state}
          retry={state === 'loading' ? undefined : retry}
        />
      )}
      {data && (
        <>
          <section
            aria-labelledby="progress-totals"
            className="space-y-2 border p-progression"
          >
            <h2 id="progress-totals" className="text-2xl font-semibold">
              Lifetime progress
            </h2>
            <p>
              {data.totals.totalXp} XP · Level {data.totals.level} ·{' '}
              {data.rank.title}
            </p>
            <p>
              Current streak {data.totals.currentStreak} · Best streak{' '}
              {data.totals.bestStreak}
            </p>
          </section>
          <section aria-labelledby="progress-activity" className="space-y-3">
            <h2 id="progress-activity" className="text-2xl font-semibold">
              Activity over the last year
            </h2>
            <Heatmap cells={data.heatmap} />
          </section>
          <section aria-labelledby="progress-pillars" className="space-y-3">
            <h2 id="progress-pillars" className="text-2xl font-semibold">
              Pillar growth
            </h2>
            {data.pillarTotals.length ? (
              <ul>
                {data.pillarTotals.map(({ pillar, xp }) => (
                  <li key={pillar}>
                    {pillar} · {xp} XP
                  </li>
                ))}
              </ul>
            ) : (
              <ScreenNotice state="empty" />
            )}
          </section>
          <section aria-labelledby="progress-seals" className="space-y-3">
            <h2 id="progress-seals" className="text-2xl font-semibold">
              Seals
            </h2>
            {data.seals.length ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {data.seals.map((seal) => (
                  <SealBadge
                    key={seal.achievementCode}
                    earned
                    title={
                      SEAL_TITLES[seal.achievementCode] ?? seal.achievementCode
                    }
                    bonusXp={seal.bonusXp}
                  />
                ))}
              </div>
            ) : (
              <ScreenNotice state="empty" />
            )}
          </section>
          <section aria-labelledby="progress-ledger" className="space-y-3">
            <h2 id="progress-ledger" className="text-2xl font-semibold">
              Ledger
            </h2>
            <p>
              {data.window.from} through {data.window.to}
            </p>
            {paginationFailure && <ScreenNotice state={paginationFailure} />}
            {page.ledger.length ? (
              <ol aria-label="Progress ledger" className="space-y-2">
                {page.ledger.map((event) => (
                  <li key={event.id} className="border p-3">
                    <p>
                      <time dateTime={event.localDate}>{event.localDate}</time>{' '}
                      · {event.title ?? event.sealCode ?? event.kind}
                    </p>
                    <p>
                      {event.xpDelta >= 0 ? '+' : ''}
                      {event.xpDelta} XP · {event.healthDelta >= 0 ? '+' : ''}
                      {event.healthDelta} health · Event {event.sequence}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <ScreenNotice state="empty" />
            )}
            {page.nextCursor && (
              <button
                className="auth-button"
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? 'Loading entries…' : 'Load more entries'}
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** @returns {import('react').ReactElement} */
export function ProgressScreen() {
  return (
    <main className="space-y-6">
      <h1 className="text-4xl font-bold">Progress</h1>
      <SessionScreen>
        {(session, scope, revision) => (
          <ProgressContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
