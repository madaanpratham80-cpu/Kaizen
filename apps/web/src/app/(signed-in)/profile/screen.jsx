'use client';

import Image from 'next/image';
import { useCallback } from 'react';
import { screenApi } from '../../../api/client.js';
import { ScreenNotice, SessionScreen } from '../../../api/session-screen.jsx';
import { useCalendarRead } from '../../../api/use-calendar-read.js';
import {
  HEALTH_BANDS,
  healthBandFor,
} from '../../../progression/health-band.js';

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
        <div className="border-b-2 border-[#5c403b] bg-[#1d1b1a] p-4 sm:p-6">
          <ScreenNotice
            state={state}
            retry={state === 'loading' ? undefined : retry}
          />
        </div>
      )}
      {data && (!state || state === 'catching-up') && (
        <>
          {/* TOP METRICS ROW */}
          <dl className="grid grid-cols-2 gap-px border-b-2 border-[#5c403b] bg-[#5c403b] xl:grid-cols-4 font-mono">
            <div className="bg-[#141312] p-5 sm:p-6 flex flex-col justify-between border-t-2 border-t-[#c0ce71]">
              <dt className="text-xs uppercase tracking-wider text-[#ac8883] font-bold">
                Total XP
              </dt>
              <dd className="text-3xl sm:text-4xl font-black text-[#c0ce71] font-mono tracking-tight mt-2 tabular-nums">
                {`${data.totalXp} XP`}
              </dd>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#cac6bd] mt-3 font-bold">
                Lifetime discipline experience
              </p>
            </div>
            <div className="bg-[#141312] p-5 sm:p-6 flex flex-col justify-between border-t-2 border-t-[#ff5541]">
              <dt className="text-xs uppercase tracking-wider text-[#ac8883] font-bold">
                Current streak
              </dt>
              <dd className="text-3xl sm:text-4xl font-black text-[#ff5541] font-mono tracking-tight mt-2 tabular-nums">
                {`${data.currentStreak} ${data.currentStreak === 1 ? 'day' : 'days'}`}
              </dd>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#ffb4a8] mt-3 font-bold">
                {`Best streak ${data.bestStreak}`}
              </p>
            </div>
            <div className="bg-[#141312] p-5 sm:p-6 flex flex-col justify-between border-t-2 border-t-[#f5f0e6]">
              <dt className="text-xs uppercase tracking-wider text-[#ac8883] font-bold">
                Health
              </dt>
              <dd className="text-3xl sm:text-4xl font-black text-[#f5f0e6] font-mono tracking-tight mt-2 tabular-nums">
                {`${data.health}%`}
              </dd>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#c0ce71] mt-3 font-bold">
                {HEALTH_BANDS[healthBandFor(data.health)]?.label}
              </p>
            </div>
            <div className="bg-[#141312] p-5 sm:p-6 flex flex-col justify-between border-t-2 border-t-[#c0ce71]">
              <dt className="text-xs uppercase tracking-wider text-[#ac8883] font-bold">
                Earned seals
              </dt>
              <dd className="text-3xl sm:text-4xl font-black text-[#c0ce71] font-mono tracking-tight mt-2 tabular-nums">
                {data.seals.length}
              </dd>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#cac6bd] mt-3 font-bold">
                Honorific milestone achievements
              </p>
            </div>
          </dl>

          {/* MAIN 2-COLUMN DOSSIER GRID */}
          <div className="grid gap-px bg-[#5c403b] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] font-mono">
            {/* LEFT COLUMN: IDENTITY DOSSIER & DIRECTIVES */}
            <div className="min-w-0 bg-[#141312]">
              {/* CHARACTER DOSSIER SECTION */}
              <section aria-label="Character dossier" className="border-b-2 border-[#5c403b]">
                <div className="border-b-2 border-[#5c403b] bg-[#0f0e0d] px-6 py-3.5 flex items-center justify-between text-xs font-mono uppercase font-bold text-[#ac8883] tracking-wider">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#ff5541] inline-block animate-pulse"></span>
                    Character dossier
                  </span>
                  <span className="text-[#c0ce71]">{'SYS_VERIFIED // 01'}</span>
                </div>

                {/* TACTICAL AVATAR VIEWPORT */}
                <div className="p-6">
                  <div className="relative aspect-square min-h-36 max-w-sm mx-auto grid place-items-center border-2 border-[#5c403b] bg-[#090808] p-6 shadow-inner">
                    {/* CYBER RETICLE CORNER ACCENTS */}
                    <span className="absolute top-1 left-2 text-xs text-[#ff5541] font-mono select-none">+</span>
                    <span className="absolute top-1 right-2 text-xs text-[#ff5541] font-mono select-none">+</span>
                    <span className="absolute bottom-1 left-2 text-xs text-[#ff5541] font-mono select-none">+</span>
                    <span className="absolute bottom-1 right-2 text-xs text-[#ff5541] font-mono select-none">+</span>

                    <Image
                      src="/profile-dossier-avatar.svg"
                      alt=""
                      width={192}
                      height={192}
                      className="h-auto w-2/3 max-w-44 drop-shadow-[0_0_12px_rgba(255,85,65,0.25)]"
                      unoptimized
                    />

                    <div className="absolute bottom-2 inset-x-3 bg-[#141312]/90 border border-[#5c403b] px-3 py-1 flex items-center justify-between text-[10px] text-[#ac8883] uppercase">
                      <span>BIO_ID: DISCIPLINE</span>
                      <span className="text-[#c0ce71] font-bold">ONLINE</span>
                    </div>
                  </div>
                </div>

                {/* SPEC SHEET KEY-VALUE TABLE */}
                <dl className="divide-y-2 divide-[#5c403b] border-y-2 border-[#5c403b] bg-[#0f0e0d]">
                  {[
                    ['Display name', data.user.displayName],
                    ['Level', data.level],
                    ['Rank title', data.rank.title],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex min-w-0 flex-wrap items-baseline justify-between gap-4 px-6 py-3.5 hover:bg-[#1d1b1a] transition-none"
                    >
                      <dt className="font-mono text-xs text-[#ac8883] uppercase tracking-wider font-bold">
                        {label}
                      </dt>
                      <dd className="font-mono text-sm sm:text-base font-bold text-[#ff5541] [overflow-wrap:anywhere]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* SELECTED GOALS SECTION */}
              <section aria-label="Selected goals">
                <div className="border-b-2 border-[#5c403b] bg-[#0f0e0d] px-6 py-3.5 flex items-center justify-between text-xs font-mono uppercase font-bold text-[#ac8883] tracking-wider">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#c0ce71] inline-block"></span>
                    Selected goals
                  </span>
                  <span className="text-[#c0ce71]">{data.user.goals.length} ACTIVE</span>
                </div>
                <div className="p-6">
                  {data.user.goals.length ? (
                    <ul className="divide-y-2 divide-[#5c403b] border-2 border-[#5c403b] bg-[#0f0e0d]">
                      {data.user.goals.map((goal, index) => (
                        <li
                          key={`${index}:${goal}`}
                          className="p-4 flex items-start gap-3 [overflow-wrap:anywhere] hover:bg-[#1d1b1a] transition-none"
                        >
                          <span className="text-[10px] text-[#ff5541] font-bold tracking-wider pt-0.5 select-none">
                            {`[DIR .0${index + 1}]`}
                          </span>
                          <span className="text-xs sm:text-sm text-[#e6e1df] font-bold leading-snug">
                            {goal}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 border-2 border-dashed border-[#5c403b] bg-[#0f0e0d] text-center text-xs text-[#ac8883] space-y-2">
                      <ScreenNotice state="empty" />
                      <p className="uppercase font-bold">No goals selected.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: PILLAR TOTALS & SEALS */}
            <div className="min-w-0 bg-[#0f0e0d]">
              {/* PILLAR TOTALS SECTION */}
              <section
                aria-label="Pillar totals"
                className="min-w-0 bg-[#0f0e0d] border-b-2 border-[#5c403b]"
              >
                <div className="border-b-2 border-[#5c403b] bg-[#0a0909] px-6 py-3.5 flex items-center justify-between text-xs font-mono uppercase font-bold text-[#ac8883] tracking-wider">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#ff5541] inline-block"></span>
                    Pillar totals
                  </span>
                  <span className="text-[#ac8883]">XP CAPACITY MATRIX</span>
                </div>
                <div className="p-6">
                  {!data.pillarTotals.length ||
                  data.pillarTotals.every(({ xp }) => xp === 0) ? (
                    <div className="p-4 border-2 border-dashed border-[#5c403b] bg-[#141312] text-center text-xs text-[#ac8883] space-y-2">
                      <ScreenNotice state="empty" />
                      <p className="uppercase font-bold">No pillar XP yet.</p>
                    </div>
                  ) : (
                    <ul className="divide-y-2 divide-[#5c403b]">
                      {data.pillarTotals.map(({ pillar, xp }, index) => (
                        <li
                          key={pillar}
                          className="space-y-3 py-5 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between">
                            <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider font-bold text-white">
                              <span
                                aria-hidden="true"
                                className={`w-2.5 h-2.5 inline-block ${
                                  ['bg-[#c0ce71]', 'bg-[#ff5541]', 'bg-[#f5f0e6]'][
                                    index % 3
                                  ]
                                }`}
                              />
                              {pillar}
                            </p>
                            <span className="text-[11px] font-mono text-[#ac8883] font-bold">
                              {Math.round((xp / (data.totalXp || 1)) * 100)}% RATIO
                            </span>
                          </div>
                          <p className="border-2 border-[#5c403b] bg-[#141312] p-3 font-mono text-xs uppercase font-bold text-[#c0ce71] tabular-nums tracking-wider shadow-inner">
                            {pillar}: {xp} XP
                          </p>
                          <div className="w-full bg-[#141312] border border-[#5c403b] h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                ['bg-[#c0ce71]', 'bg-[#ff5541]', 'bg-[#f5f0e6]'][
                                  index % 3
                                ]
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    6,
                                    Math.round((xp / (data.totalXp || 1)) * 100),
                                  ),
                                )}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {/* ACHIEVEMENT ARCHIVE SECTION */}
              <section
                aria-label="Achievement archive"
                className="min-w-0 bg-[#0f0e0d]"
              >
                <div className="border-b-2 border-[#5c403b] bg-[#0a0909] px-6 py-3.5 flex items-center justify-between text-xs font-mono uppercase font-bold text-[#ac8883] tracking-wider">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#c0ce71] inline-block animate-pulse"></span>
                    Achievement archive
                  </span>
                  <span className="text-[#c0ce71]">{data.seals.length} UNLOCKED</span>
                </div>
                <div className="p-6">
                  {data.seals.length ? (
                    <ul className="divide-y-2 divide-[#5c403b] border-2 border-[#5c403b] bg-[#141312]">
                      {data.seals.map((seal) => (
                        <li
                          key={`${seal.achievementCode}:${seal.ruleVersion}`}
                          className="p-4 flex items-start justify-between gap-3 [overflow-wrap:anywhere] hover:bg-[#1d1b1a] transition-none"
                        >
                          <div className="space-y-1">
                            <div className="text-xs sm:text-sm text-[#e6e1df] font-bold uppercase tracking-wider flex items-center gap-2">
                              <span className="text-[#c0ce71]">★</span>
                              <span>
                                {seal.achievementCode} · Bonus XP: {seal.bonusXp} XP ·
                                Earned:{' '}
                                <time dateTime={seal.unlockedAt}>
                                  {seal.unlockedAt}
                                </time>
                              </span>
                            </div>
                            <span className="text-[10px] text-[#ac8883] uppercase block font-bold">
                              {`RULE VER: ${seal.ruleVersion} // CRYPTOGRAPHIC SEAL`}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 border-2 border-dashed border-[#5c403b] bg-[#141312] text-center text-xs text-[#ac8883] space-y-2">
                      <ScreenNotice state="empty" />
                      <p className="uppercase font-bold">No achievements earned yet.</p>
                    </div>
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
    <main className="min-w-0 min-h-dvh border-x-2 border-[#5c403b] bg-[#141312] text-[#e6e1df] font-mono">
      {/* MONOLITHIC PROFILE HEADER */}
      <header className="border-b-2 border-[#5c403b] bg-[#0f0e0d] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-[#ac8883] uppercase tracking-wider mb-2">
          <div className="flex items-center gap-3">
            <span className="bg-[#ff5541] text-[#5c0000] px-2 py-0.5 font-bold">
              DOSSIER .05
            </span>
            <span>{'// OPERATOR ARCHIVE // CADENCE 2026'}</span>
          </div>
          <span className="text-[#c0ce71] font-bold">STATUS: REPUTATION VERIFIED</span>
        </div>
        <div className="mt-4 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-[#e6e1df] font-['Space_Grotesk',sans-serif] m-0">
            <span
              aria-hidden="true"
              className="mr-3 text-[#ff5541] before:content-[attr(data-number)]"
              data-number=".05"
            />
            Profile
          </h1>
          <span className="text-3xl sm:text-4xl font-black text-[#c0ce71] font-mono tracking-widest">
            改善
          </span>
        </div>
      </header>

      <SessionScreen>
        {(session, scope, revision) => (
          <ProfileContent {...{ session, scope, revision }} />
        )}
      </SessionScreen>
    </main>
  );
}

export default ProfileScreen;

