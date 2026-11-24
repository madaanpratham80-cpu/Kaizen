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
import { DossierHeader, DossierMetric, dossierPanel } from '../dossier.jsx';

const PAGE_SIZE = 25;
const panelHeading =
  'border-b border-surface-bright bg-surface-container px-space-md py-space-sm font-headline-sm text-headline-sm uppercase sm:px-space-lg';
const panelContents = 'space-y-space-md p-space-md sm:p-space-lg';
const DAYS_PER_WEEK = 7;
const monthName = new Intl.DateTimeFormat('en', {
  month: 'short',
  timeZone: 'UTC',
});
const SEAL_TITLES = {
  'seven-day-warrior': 'Seven-Day Warrior',
  'iron-will': 'Iron Will',
  'hundred-gates': 'Hundred Gates',
};

/** @param {{cells: Awaited<ReturnType<typeof screenApi.progress>>['heatmap']}} props */
function Heatmap({ cells }) {
  const months = Map.groupBy(cells, ({ localDate }) => localDate.slice(0, 7));
  const blocks = [];
  let column = 1;
  for (const [month, days] of months) {
    const startDay =
      (new Date(days[0].localDate).getUTCDay() + 6) % DAYS_PER_WEEK;
    const columns = Math.ceil((startDay + days.length) / DAYS_PER_WEEK);
    blocks.push({ month, days, startDay, column, columns });
    column += columns + 1;
  }
  const columns = column - 2;
  return (
    <div
      className="relative overflow-x-auto pb-space-sm focus-visible:outline-2 focus-visible:outline-primary"
      tabIndex={0}
      role="region"
      aria-label="Annual calendar"
    >
      <div className="grid min-w-[56rem] grid-cols-[2.75rem_minmax(0,1fr)] gap-space-sm">
        <div
          aria-hidden="true"
          className="grid grid-rows-7 gap-1 font-label-mono-sm text-label-mono-sm text-outline"
        >
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div>
          <ul
            aria-label="365-day activity heatmap"
            className="grid grid-rows-7 gap-1"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {blocks.flatMap(({ days, startDay, column }) =>
              days.map(({ localDate, status, completions }, index) => {
                const day = startDay + index;
                const detail = `${status ?? 'No plan'} · ${completions} ${completions === 1 ? 'completion' : 'completions'}`;
                return (
                  <li
                    key={localDate}
                    title={`${localDate}: ${detail}`}
                    className={`aspect-square min-h-2 ${completions ? 'bg-tertiary' : 'bg-surface-container-high'}`}
                    style={{
                      gridColumn: column + Math.floor(day / DAYS_PER_WEEK),
                      gridRow: 1 + (day % DAYS_PER_WEEK),
                    }}
                  >
                    <span className="sr-only">
                      <time dateTime={localDate}>{localDate}</time> {detail}
                    </span>
                  </li>
                );
              }),
            )}
          </ul>
          <div
            aria-hidden="true"
            className="mt-space-sm grid gap-1 text-center font-label-mono-sm text-label-mono-sm text-outline uppercase"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {blocks.map(({ month, column, columns }) => (
              <span
                key={month}
                style={{ gridColumn: `${column} / span ${columns}` }}
              >
                {monthName.format(new Date(`${month}-01`))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
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
            <dl className="grid grid-cols-2 gap-px bg-outline-variant xl:grid-cols-4">
              <DossierMetric label="Lifetime XP" value={data.totals.totalXp} />
              <DossierMetric
                label="Current streak"
                value={data.totals.currentStreak}
                note={`Days · Best streak ${data.totals.bestStreak}`}
                tone="signal"
              />
              <DossierMetric
                label="Active days this year"
                value={
                  data.heatmap.filter(({ completions }) => completions > 0)
                    .length
                }
                tone="paper"
              />
              <DossierMetric
                label="Earned seals"
                value={data.seals.length}
                tone="olive"
              />
            </dl>
            <p className="border-t border-outline-variant px-space-lg py-space-sm font-label-mono-md text-label-mono-md text-secondary">
              {data.totals.totalXp} XP · Level {data.totals.level} ·{' '}
              {data.rank.title}
            </p>
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
          <div className="grid bg-surface lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="grid content-start border-outline-variant lg:border-r">
              <section
                aria-labelledby="progress-seals"
                className="bg-surface-container-lowest"
              >
                <h2 id="progress-seals" className={panelHeading}>
                  Seals
                </h2>
                <div className={panelContents}>
                  {data.seals.length ? (
                    <ul className="grid border-t border-l border-outline-variant bg-surface sm:grid-cols-2 xl:grid-cols-3">
                      {data.seals.map(
                        ({ achievementCode, bonusXp, unlockedAt }) => (
                          <li
                            key={achievementCode}
                            className="min-w-0 space-y-space-md border-r border-b border-outline-variant bg-surface-container-low p-space-md"
                          >
                            <p className="font-label-mono-sm text-label-mono-sm text-tertiary uppercase">
                              Earned
                            </p>
                            <span
                              aria-hidden="true"
                              className="grid size-12 place-items-center border border-outline-variant bg-surface text-xl text-tertiary"
                            >
                              ◆
                            </span>
                            <h3 className="font-headline-sm text-headline-sm uppercase">
                              {SEAL_TITLES[achievementCode] ?? achievementCode}
                            </h3>
                            <p className="border-t border-outline-variant pt-space-sm font-label-mono-sm text-label-mono-sm text-secondary">
                              <time dateTime={unlockedAt}>
                                {unlockedAt.slice(0, 10)}
                              </time>
                              {' · '}
                              <span className="text-tertiary">
                                +{bonusXp} XP
                              </span>
                            </p>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <ScreenNotice state="empty" />
                  )}
                </div>
              </section>
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
    <main className={dossierPanel}>
      <DossierHeader number=".04" title="Progress" eyebrow="Activity archive" />
      <SessionScreen>
        {(session, scope, revision) => (
          <ProgressContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
