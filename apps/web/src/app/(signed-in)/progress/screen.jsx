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
const panelHeading =
  'border-b border-surface-bright bg-surface-container px-space-md py-space-sm font-headline-sm text-headline-sm uppercase sm:px-space-lg';
const panelContents = 'space-y-space-md p-space-md sm:p-space-lg';
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
      tabIndex={0}
      className="grid max-h-72 grid-cols-3 gap-px overflow-y-auto border border-surface-bright bg-surface-bright font-label-mono-sm text-label-mono-sm focus-visible:outline-primary! sm:grid-cols-7 lg:grid-cols-10"
    >
      {cells.map(({ localDate, status, completions }) => (
        <li
          key={localDate}
          className={`min-w-0 p-space-sm [overflow-wrap:anywhere] ${completions ? 'bg-tertiary text-on-tertiary' : 'bg-surface-container-low text-secondary'}`}
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
    return (
      <div className={panelContents}>
        <ScreenNotice state="expired-session" />
      </div>
    );
  return (
    <div>
      {state && (
        <div className="border-b border-surface-bright p-space-md sm:p-space-lg">
          <ScreenNotice
            state={state}
            retry={state === 'loading' ? undefined : retry}
          />
        </div>
      )}
      {data && (
        <>
          <section
            aria-labelledby="progress-totals"
            className="border-b border-surface-bright bg-surface-container-low"
          >
            <h2 id="progress-totals" className={panelHeading}>
              Lifetime progress
            </h2>
            <div className="grid gap-px bg-surface-bright lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <p className="bg-surface-container-low p-space-md font-display-lg text-headline-lg font-bold tabular-nums [overflow-wrap:anywhere] sm:p-space-lg">
                {data.totals.totalXp} XP · Level {data.totals.level} ·{' '}
                {data.rank.title}
              </p>
              <p className="bg-secondary-fixed p-space-md font-headline-md text-headline-md text-on-secondary-fixed tabular-nums sm:p-space-lg">
                Current streak {data.totals.currentStreak} · Best streak{' '}
                {data.totals.bestStreak}
              </p>
            </div>
          </section>
          <section
            aria-labelledby="progress-activity"
            className="border-b border-surface-bright"
          >
            <h2 id="progress-activity" className={panelHeading}>
              Activity over the last year
            </h2>
            <div className={panelContents}>
              <Heatmap cells={data.heatmap} />
            </div>
          </section>
          <div className="grid gap-px bg-surface-bright lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="grid content-start gap-px bg-surface-bright">
              <section
                aria-labelledby="progress-pillars"
                className="bg-surface-container-lowest"
              >
                <h2 id="progress-pillars" className={panelHeading}>
                  Pillar growth
                </h2>
                <div className={panelContents}>
                  {data.pillarTotals.length ? (
                    <ul className="divide-y divide-surface-bright border border-surface-bright bg-surface-container-low">
                      {data.pillarTotals.map(({ pillar, xp }) => (
                        <li
                          key={pillar}
                          className="px-space-md py-space-sm font-label-mono-md text-label-mono-md text-tertiary"
                        >
                          {pillar} · {xp} XP
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ScreenNotice state="empty" />
                  )}
                </div>
              </section>
              <section
                aria-labelledby="progress-seals"
                className="bg-surface-container-lowest"
              >
                <h2 id="progress-seals" className={panelHeading}>
                  Seals
                </h2>
                <div className={panelContents}>
                  {data.seals.length ? (
                    <div className="grid gap-space-sm sm:grid-cols-2">
                      {data.seals.map((seal) => (
                        <SealBadge
                          key={seal.achievementCode}
                          earned
                          title={
                            SEAL_TITLES[seal.achievementCode] ??
                            seal.achievementCode
                          }
                          bonusXp={seal.bonusXp}
                        />
                      ))}
                    </div>
                  ) : (
                    <ScreenNotice state="empty" />
                  )}
                </div>
              </section>
            </div>
            <section
              aria-labelledby="progress-ledger"
              className="min-w-0 bg-surface-container-lowest"
            >
              <h2 id="progress-ledger" className={panelHeading}>
                Ledger
              </h2>
              <div className={panelContents}>
                <p className="font-label-mono-md text-label-mono-md text-secondary">
                  {data.window.from} through {data.window.to}
                </p>
                {paginationFailure && (
                  <ScreenNotice state={paginationFailure} />
                )}
                {page.ledger.length ? (
                  <ol
                    aria-label="Progress ledger"
                    className="divide-y divide-surface-bright border border-surface-bright bg-surface-container-low"
                  >
                    {page.ledger.map((event) => (
                      <li
                        key={event.id}
                        className="space-y-space-xs p-space-md [overflow-wrap:anywhere]"
                      >
                        <p className="font-headline-sm text-headline-sm">
                          <time dateTime={event.localDate}>
                            {event.localDate}
                          </time>{' '}
                          · {event.title ?? event.sealCode ?? event.kind}
                        </p>
                        <p className="font-label-mono-sm text-label-mono-sm text-tertiary">
                          {event.xpDelta >= 0 ? '+' : ''}
                          {event.xpDelta} XP ·{' '}
                          {event.healthDelta >= 0 ? '+' : ''}
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
                    className="max-w-full border border-primary-container bg-primary-container px-space-md py-space-sm font-label-mono-md text-label-mono-md text-on-primary-container uppercase hover:bg-on-surface hover:text-surface focus-visible:outline-primary! disabled:opacity-60"
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                  >
                    {loadingMore ? 'Loading entries…' : 'Load more entries'}
                  </button>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

/** @returns {import('react').ReactElement} */
export function ProgressScreen() {
  return (
    <main className="min-w-0 border border-surface-bright bg-surface font-body-md text-body-md text-on-surface">
      <header className="border-b border-surface-bright bg-surface-container-lowest px-space-md py-space-lg sm:p-space-lg">
        <p className="mb-space-sm inline-block bg-primary-container px-space-sm py-space-xs font-label-mono-sm text-label-mono-sm text-on-primary-container uppercase">
          Activity archive
        </p>
        <h1 className="font-display-xl text-display-xl-mobile font-bold uppercase sm:text-display-xl">
          Progress
        </h1>
      </header>
      <SessionScreen>
        {(session, scope, revision) => (
          <ProgressContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
