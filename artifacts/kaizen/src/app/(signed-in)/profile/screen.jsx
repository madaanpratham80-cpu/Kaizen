'use client';

import { publicAsset } from '../../../api/base-url.js';
import { useCallback } from 'react';
import { screenApi } from '../../../api/client.js';
import { ScreenNotice, SessionScreen } from '../../../api/session-screen.jsx';
import { useCalendarRead } from '../../../api/use-calendar-read.js';
import {
  HEALTH_BANDS,
  healthBandFor,
} from '../../../progression/health-band.js';
import { DossierHeader, DossierMetric, dossierPanel } from '../dossier.jsx';

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
          <dl className="grid grid-cols-2 gap-px border-b-2 border-outline-variant bg-outline-variant xl:grid-cols-4">
            <DossierMetric label="Total XP" value={`${data.totalXp} XP`} />
            <DossierMetric
              label="Current streak"
              value={`${data.currentStreak} ${data.currentStreak === 1 ? 'day' : 'days'}`}
              note={`Best streak ${data.bestStreak}`}
              tone="signal"
            />
            <DossierMetric
              label="Health"
              value={`${data.health}%`}
              note={HEALTH_BANDS[healthBandFor(data.health)]?.label}
              tone="paper"
            />
            <DossierMetric
              label="Earned seals"
              value={data.seals.length}
              tone="olive"
            />
          </dl>
          <div className="grid gap-px bg-outline-variant lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="min-w-0 bg-surface">
              <section aria-label="Character dossier">
                <p className={panelLabel}>Character dossier</p>
                <div className="p-space-lg">
                  <div className="grid aspect-square min-h-32 place-items-center border-2 border-outline-variant bg-surface-container-lowest p-space-lg">
                    <img
                      src={publicAsset('profile-dossier-avatar.svg')}
                      alt=""
                      width={192}
                      height={192}
                      className="h-auto w-2/3 max-w-48"
                      loading="lazy"
                    />
                  </div>
                </div>
                <dl className="divide-y divide-outline-variant border-y border-outline-variant">
                  {[
                    ['Display name', data.user.displayName],
                    ['Level', data.level],
                    ['Rank title', data.rank.title],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex min-w-0 flex-wrap items-baseline justify-between gap-space-sm px-space-lg py-space-sm"
                    >
                      <dt className={`${metricLabel} text-outline`}>{label}</dt>
                      <dd className="font-headline-sm text-headline-sm text-primary [overflow-wrap:anywhere]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section aria-label="Selected goals">
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
            </div>
            <div className="min-w-0 bg-surface-container-lowest">
              <section
                aria-label="Pillar totals"
                className="min-w-0 bg-surface-container-lowest"
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
                    <ul className="divide-y divide-outline-variant">
                      {data.pillarTotals.map(({ pillar, xp }, index) => (
                        <li
                          key={pillar}
                          className="space-y-space-md py-space-lg first:pt-0 last:pb-0"
                        >
                          <p className="flex items-center gap-space-sm font-headline-md text-headline-md uppercase">
                            <span
                              aria-hidden="true"
                              className={`size-2.5 ${['bg-primary-container', 'bg-tertiary', 'bg-secondary'][index % 3]}`}
                            />
                            {pillar}
                          </p>
                          <p className="border border-outline-variant bg-surface-container p-space-md font-label-mono-md text-label-mono-md tabular-nums">
                            {pillar}: {xp} XP
                          </p>
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
          </div>
        </>
      )}
    </div>
  );
}

/** @returns {import('react').ReactElement} */
export function ProfileScreen() {
  return (
    <main className={dossierPanel}>
      <DossierHeader number=".05" title="Profile" eyebrow="Personnel dossier" />
      <SessionScreen>
        {(session, scope, revision) => (
          <ProfileContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
