'use client';

import { useCallback } from 'react';
import { screenApi } from '../../../api/client.js';
import { ScreenNotice, SessionScreen } from '../../../api/session-screen.jsx';
import { useCalendarRead } from '../../../api/use-calendar-read.js';

const metricLabel = 'font-label-mono-sm text-label-mono-sm uppercase';
const panelLabel =
  'border-b border-surface-bright bg-surface-container px-space-md py-space-sm font-label-mono-md text-label-mono-md text-primary uppercase sm:px-space-lg';
const panelBody = 'space-y-space-sm p-space-md sm:p-space-lg';

/** @param {{session: import('../../../api/session-screen.jsx').ScreenSession, scope: import('../../../api/session-screen.jsx').SessionScope, revision: number}} props */
function ProfileContent({ session, scope, revision }) {
  const read = useCallback((signal) => screenApi.profile(signal), []);
  const { data, state, retry } = useCalendarRead(
    session,
    scope,
    revision,
    'profile:overview',
    read,
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
      {data && (!state || state === 'catching-up') && (
        <>
          <dl className="grid gap-px border-b border-surface-bright bg-surface-bright sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 space-y-space-sm bg-surface-container-low p-space-md sm:p-space-lg">
              <dt className={metricLabel}>Display name</dt>
              <dd className="font-headline-md text-headline-md [overflow-wrap:anywhere]">
                {data.user.displayName}
              </dd>
            </div>
            <div className="min-w-0 space-y-space-sm bg-surface-container p-space-md sm:p-space-lg">
              <dt className={metricLabel}>Level</dt>
              <dd className="font-display-lg text-display-lg-mobile font-bold text-tertiary tabular-nums">
                {data.level}
              </dd>
            </div>
            <div className="min-w-0 space-y-space-sm bg-surface-container-low p-space-md sm:p-space-lg">
              <dt className={metricLabel}>Rank title</dt>
              <dd className="font-headline-md text-headline-md text-primary [overflow-wrap:anywhere]">
                {data.rank.title}
              </dd>
            </div>
            <div className="min-w-0 space-y-space-sm bg-secondary-fixed p-space-md text-on-secondary-fixed sm:p-space-lg">
              <dt className={metricLabel}>Total XP</dt>
              <dd className="font-display-lg text-display-lg-mobile font-bold tabular-nums [overflow-wrap:anywhere]">
                {data.totalXp} XP
              </dd>
            </div>
          </dl>
          <div className="grid gap-px bg-surface-bright lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <section aria-label="Selected goals" className="min-w-0 bg-surface">
              <p className={panelLabel}>Selected goals</p>
              <div className={panelBody}>
                {data.user.goals.length ? (
                  <ul className="divide-y divide-surface-bright border border-surface-bright bg-surface-container-low">
                    {data.user.goals.map((goal, index) => (
                      <li
                        key={`${index}:${goal}`}
                        className="px-space-md py-space-sm [overflow-wrap:anywhere]"
                      >
                        {goal}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <ScreenNotice state="empty" />
                    <p>No goals selected.</p>
                  </>
                )}
              </div>
            </section>
            <section
              aria-label="Pillar totals"
              className="min-w-0 bg-surface-container-lowest lg:row-span-2"
            >
              <p className={panelLabel}>Pillar totals</p>
              <div className={panelBody}>
                {!data.pillarTotals.length ||
                data.pillarTotals.every(({ xp }) => xp === 0) ? (
                  <>
                    <ScreenNotice state="empty" />
                    <p>No pillar XP yet.</p>
                  </>
                ) : (
                  <ul className="space-y-space-sm">
                    {data.pillarTotals.map(({ pillar, xp }) => (
                      <li
                        key={pillar}
                        className="border border-surface-bright border-l-2 border-l-primary-container bg-surface-container px-space-md py-space-md font-headline-sm text-headline-sm tabular-nums [overflow-wrap:anywhere]"
                      >
                        {pillar}: {xp} XP
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
            <section
              aria-label="Achievement archive"
              className="min-w-0 bg-surface"
            >
              <p className={panelLabel}>Achievement archive</p>
              <div className={panelBody}>
                {data.seals.length ? (
                  <ul className="divide-y divide-surface-bright border border-surface-bright bg-surface-container-low">
                    {data.seals.map((seal) => (
                      <li
                        key={`${seal.achievementCode}:${seal.ruleVersion}`}
                        className="px-space-md py-space-sm [overflow-wrap:anywhere]"
                      >
                        {seal.achievementCode} · Bonus XP: {seal.bonusXp} XP ·
                        Earned:{' '}
                        <time dateTime={seal.unlockedAt}>
                          {seal.unlockedAt}
                        </time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <ScreenNotice state="empty" />
                    <p>No achievements earned yet.</p>
                  </>
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
export function ProfileScreen() {
  return (
    <main className="border border-surface-bright bg-surface font-body-md text-body-md text-on-surface">
      <header className="border-b border-surface-bright bg-surface-container-lowest px-space-md py-space-lg sm:p-space-lg">
        <p className="mb-space-sm inline-block bg-primary-container px-space-sm py-space-xs font-label-mono-sm text-label-mono-sm text-on-primary-container uppercase">
          Dossier
        </p>
        <h1 className="font-display-xl text-display-xl-mobile font-bold uppercase sm:text-display-xl">
          Profile
        </h1>
      </header>
      <SessionScreen>
        {(session, scope, revision) => (
          <ProfileContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
