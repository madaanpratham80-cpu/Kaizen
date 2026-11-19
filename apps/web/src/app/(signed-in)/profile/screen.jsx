'use client';

import { useCallback } from 'react';
import { screenApi } from '../../../api/client.js';
import { ScreenNotice, SessionScreen } from '../../../api/session-screen.jsx';
import { useCalendarRead } from '../../../api/use-calendar-read.js';

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
    <div className="space-y-6">
      {state && (
        <ScreenNotice
          state={state}
          retry={state === 'loading' ? undefined : retry}
        />
      )}
      {data && (!state || state === 'catching-up') && (
        <>
          <dl className="space-y-3 border p-progression">
            <div>
              <dt className="font-semibold">Display name</dt>
              <dd>{data.user.displayName}</dd>
            </div>
            <div>
              <dt className="font-semibold">Level</dt>
              <dd>{data.level}</dd>
            </div>
            <div>
              <dt className="font-semibold">Rank title</dt>
              <dd>{data.rank.title}</dd>
            </div>
            <div>
              <dt className="font-semibold">Total XP</dt>
              <dd>{data.totalXp} XP</dd>
            </div>
          </dl>
          <section aria-label="Pillar totals" className="space-y-2">
            <p className="text-xl font-semibold">Pillar totals</p>
            {!data.pillarTotals.length ||
            data.pillarTotals.every(({ xp }) => xp === 0) ? (
              <>
                <ScreenNotice state="empty" />
                <p>No pillar XP yet.</p>
              </>
            ) : (
              <ul>
                {data.pillarTotals.map(({ pillar, xp }) => (
                  <li key={pillar}>
                    {pillar}: {xp} XP
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-label="Selected goals" className="space-y-2">
            <p className="text-xl font-semibold">Selected goals</p>
            {data.user.goals.length ? (
              <ul>
                {data.user.goals.map((goal, index) => (
                  <li key={`${index}:${goal}`}>{goal}</li>
                ))}
              </ul>
            ) : (
              <>
                <ScreenNotice state="empty" />
                <p>No goals selected.</p>
              </>
            )}
          </section>
          <section aria-label="Achievement archive" className="space-y-2">
            <p className="text-xl font-semibold">Achievement archive</p>
            {data.seals.length ? (
              <ul>
                {data.seals.map((seal) => (
                  <li key={`${seal.achievementCode}:${seal.ruleVersion}`}>
                    {seal.achievementCode} · Bonus XP: {seal.bonusXp} XP ·
                    Earned:{' '}
                    <time dateTime={seal.unlockedAt}>{seal.unlockedAt}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <ScreenNotice state="empty" />
                <p>No achievements earned yet.</p>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** @returns {import('react').ReactElement} */
export function ProfileScreen() {
  return (
    <main className="space-y-6">
      <h1 className="text-4xl font-bold">Profile</h1>
      <SessionScreen>
        {(session, scope, revision) => (
          <ProfileContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}
