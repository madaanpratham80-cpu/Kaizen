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

const SEAL_DESCRIPTIONS = {
  'iron-will':
    'Iron Will // Successfully resumed active cadence after an interrupted day.',
  'seven-day-warrior':
    'Seven-Day Warrior // Maintained 7 consecutive scheduled active days without an unexcused lapse.',
  'hundred-gates':
    'Hundred Gates Conqueror // Reached 100 verified lifetime real-world quest completions.',
};

const PILLAR_METADATA = {
  Cognitive: {
    accent: 'bg-[#c0ce71]',
    textColor: 'text-[#c0ce71]',
    borderColor: 'border-[#c0ce71]',
    description:
      'Academics, mathematical study, reading, and analytical problem sets.',
  },
  Physical: {
    accent: 'bg-[#ff5541]',
    textColor: 'text-[#ff5541]',
    borderColor: 'border-[#ff5541]',
    description:
      'Conditioning, progressive resistance training, mobility, and sleep recovery.',
  },
  Craft: {
    accent: 'bg-[#f5f0e6]',
    textColor: 'text-[#f5f0e6]',
    borderColor: 'border-[#f5f0e6]',
    description:
      'Programming, technical writing, design architecture, and deliberate practice.',
  },
};

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
          {/* COMPACT IDENTITY BANNER STRIP */}
          <div className="border-b-2 border-[#5c403b] bg-[#090808] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between text-xs font-mono text-[#ac8883] uppercase tracking-wider gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-[#c0ce71] font-bold">
                <span
                  className="w-2 h-2 bg-[#c0ce71] inline-block animate-pulse"
                  aria-hidden="true"
                />
                OPERATOR_STATUS: VERIFIED
              </span>
              <span className="text-[#5c403b]" aria-hidden="true">
                {'//'}
              </span>
              <span className="text-[#cac6bd]">
                DOSSIER SPECIFICATION V.1.0
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-[#cac6bd]">
                TIMEZONE: {data.user.timezone}
              </span>
              <span className="hidden sm:inline text-[#5c403b]">|</span>
              <span className="hidden sm:inline text-[#ff5541]">
                CADENCE VER: {data.stateVersion}
              </span>
            </div>
          </div>

          {/* TOP METRICS ROW: 4 PROGRESSION SUMMARY TILES */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px border-b-2 border-[#5c403b] bg-[#5c403b] font-mono">
            {/* TILE 1: LIFETIME EFFORT (TOTAL XP) */}
            <div className="bg-[#141312] p-5 sm:p-6 flex flex-col justify-between border-t-2 border-t-[#c0ce71]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#ac8883] uppercase tracking-wider">
                    DIMENSION 01 // XP
                  </span>
                  <span className="text-[10px] bg-[#2d3400] text-[#c0ce71] font-bold px-1.5 py-0.5 select-none font-mono">
                    IMMUTABLE
                  </span>
                </div>
                <dt className="text-xs uppercase tracking-wider text-[#ac8883] font-bold">
                  Total XP
                </dt>
                <dd className="text-3xl sm:text-4xl font-black text-[#c0ce71] font-mono tracking-tight mt-1 tabular-nums">
                  {`${data.totalXp} XP`}
                </dd>
                <div className="mt-3 pt-2 border-t border-[#2b2a28] flex items-center justify-between text-[11px] text-[#cac6bd]">
                  <span>LEVEL {data.level} CADENCE</span>
                  <span className="text-[#c0ce71] font-bold">
                    {data.xpIntoLevel}/100 XP
                  </span>
                </div>
                <div
                  className="w-full bg-[#0f0e0d] border border-[#2b2a28] h-1.5 mt-1.5 overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className="bg-[#c0ce71] h-full"
                    style={{ width: `${Math.min(100, data.xpIntoLevel)}%` }}
                  />
                </div>
              </div>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#cac6bd] mt-4 font-bold">
                Lifetime discipline experience
              </p>
            </div>

            {/* TILE 2: ACTIVE CONTINUITY (CURRENT STREAK) */}
            <div className="bg-[#141312] p-5 sm:p-6 flex flex-col justify-between border-t-2 border-t-[#ff5541]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#ac8883] uppercase tracking-wider">
                    DIMENSION 02 // STREAK
                  </span>
                  <span className="text-[10px] bg-[#450a0a] text-[#ffb4a8] font-bold px-1.5 py-0.5 select-none font-mono">
                    SCHEDULE AWARE
                  </span>
                </div>
                <dt className="text-xs uppercase tracking-wider text-[#ac8883] font-bold">
                  Current streak
                </dt>
                <dd className="text-3xl sm:text-4xl font-black text-[#ff5541] font-mono tracking-tight mt-1 tabular-nums">
                  {`${data.currentStreak} ${data.currentStreak === 1 ? 'day' : 'days'}`}
                </dd>
                <div className="mt-3 pt-2 border-t border-[#2b2a28] flex items-center justify-between text-[11px]">
                  <span className="text-[#ac8883]">PEAK CONTINUITY</span>
                  <span className="text-[#ffb4a8] font-bold">
                    {data.bestStreak} {data.bestStreak === 1 ? 'DAY' : 'DAYS'}
                  </span>
                </div>
                <p className="text-[10px] text-[#ac8883] mt-1.5 font-sans">
                  Protected by planned rest days.
                </p>
              </div>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#ffb4a8] mt-4 font-bold">
                {`Best streak ${data.bestStreak}`}
              </p>
            </div>

            {/* TILE 3: ROUTINE STABILITY (HEALTH) */}
            <div className="bg-[#141312] p-5 sm:p-6 flex flex-col justify-between border-t-2 border-t-[#f5f0e6]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#ac8883] uppercase tracking-wider">
                    DIMENSION 03 // STABILITY
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 select-none font-mono ${
                      healthBandFor(data.health) === 'healthy'
                        ? 'bg-[#2d3400] text-[#c0ce71]'
                        : healthBandFor(data.health) === 'tired'
                          ? 'bg-[#3b2505] text-[#ffb4a8]'
                          : 'bg-[#450a0a] text-[#ff5541]'
                    }`}
                  >
                    {HEALTH_BANDS[healthBandFor(data.health)]?.label ||
                      'UNKNOWN'}
                  </span>
                </div>
                <dt className="text-xs uppercase tracking-wider text-[#ac8883] font-bold">
                  Health
                </dt>
                <dd className="text-3xl sm:text-4xl font-black text-[#f5f0e6] font-mono tracking-tight mt-1 tabular-nums">
                  {`${data.health}%`}
                </dd>
                <div
                  className="w-full bg-[#0f0e0d] border border-[#2b2a28] h-1.5 mt-3 overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      healthBandFor(data.health) === 'healthy'
                        ? 'bg-[#c0ce71]'
                        : healthBandFor(data.health) === 'tired'
                          ? 'bg-[#ffb4a8]'
                          : 'bg-[#ff5541]'
                    }`}
                    style={{ width: `${Math.min(100, data.health)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#ac8883] mt-1.5 font-sans">
                  Bounded daily delta: max -5% on missed day.
                </p>
              </div>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#c0ce71] mt-4 font-bold">
                {HEALTH_BANDS[healthBandFor(data.health)]?.label}
              </p>
            </div>

            {/* TILE 4: HONORIFIC MILESTONES (EARNED SEALS) */}
            <div className="bg-[#141312] p-5 sm:p-6 flex flex-col justify-between border-t-2 border-t-[#c0ce71]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#ac8883] uppercase tracking-wider">
                    DIMENSION 04 // SEALS
                  </span>
                  <span className="text-[10px] bg-[#1d1b1a] text-[#cac6bd] border border-[#5c403b] font-bold px-1.5 py-0.5 select-none font-mono">
                    ARCHIVE
                  </span>
                </div>
                <dt className="text-xs uppercase tracking-wider text-[#ac8883] font-bold">
                  Earned seals
                </dt>
                <dd className="text-3xl sm:text-4xl font-black text-[#c0ce71] font-mono tracking-tight mt-1 tabular-nums">
                  {data.seals.length}
                </dd>
                <div className="mt-3 pt-2 border-t border-[#2b2a28] flex items-center justify-between text-[11px] text-[#cac6bd]">
                  <span>VERIFIED MILESTONES</span>
                  <span className="text-[#c0ce71] font-bold">★ VERIFIED</span>
                </div>
                <p className="text-[10px] text-[#ac8883] mt-1.5 font-sans">
                  Permanent seals awarded upon criteria proof.
                </p>
              </div>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#cac6bd] mt-4 font-bold">
                Honorific milestone achievements
              </p>
            </div>
          </dl>

          {/* MAIN 2-COLUMN DOSSIER GRID */}
          <div className="grid gap-px bg-[#5c403b] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] font-mono">
            {/* LEFT COLUMN: IDENTITY DOSSIER & DIRECTIVES */}
            <div className="min-w-0 bg-[#141312]">
              {/* CHARACTER DOSSIER SECTION */}
              <section
                aria-label="Character dossier"
                className="border-b-2 border-[#5c403b]"
              >
                <div className="border-b-2 border-[#5c403b] bg-[#0f0e0d] px-6 py-3.5 flex items-center justify-between text-xs font-mono uppercase font-bold text-[#ac8883] tracking-wider">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 bg-[#ff5541] inline-block animate-pulse"
                      aria-hidden="true"
                    />
                    Character dossier
                  </span>
                  <span className="text-[#c0ce71]">{'SYS_VERIFIED // 01'}</span>
                </div>

                {/* TACTICAL AVATAR VIEWPORT */}
                <div className="p-6">
                  <div className="relative aspect-square min-h-36 max-w-sm mx-auto grid place-items-center border-2 border-[#5c403b] bg-[#090808] p-6 shadow-inner">
                    {/* CYBER RETICLE CORNER ACCENTS */}
                    <span
                      className="absolute top-1 left-2 text-xs text-[#ff5541] font-mono select-none"
                      aria-hidden="true"
                    >
                      +
                    </span>
                    <span
                      className="absolute top-1 right-2 text-xs text-[#ff5541] font-mono select-none"
                      aria-hidden="true"
                    >
                      +
                    </span>
                    <span
                      className="absolute bottom-1 left-2 text-xs text-[#ff5541] font-mono select-none"
                      aria-hidden="true"
                    >
                      +
                    </span>
                    <span
                      className="absolute bottom-1 right-2 text-xs text-[#ff5541] font-mono select-none"
                      aria-hidden="true"
                    >
                      +
                    </span>

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
                    <span
                      className="w-2 h-2 bg-[#c0ce71] inline-block"
                      aria-hidden="true"
                    />
                    Selected goals
                  </span>
                  <span className="text-[#c0ce71]">
                    {data.user.goals.length} ACTIVE
                  </span>
                </div>
                <div className="p-6">
                  {data.user.goals.length ? (
                    <ul className="divide-y-2 divide-[#5c403b] border-2 border-[#5c403b] bg-[#0f0e0d]">
                      {data.user.goals.map((goal, index) => (
                        <li
                          key={`${index}:${goal}`}
                          className="p-4 flex items-start gap-3 [overflow-wrap:anywhere] hover:bg-[#1d1b1a] transition-none"
                        >
                          <span
                            className="text-[10px] text-[#ff5541] font-bold tracking-wider pt-0.5 select-none"
                            aria-hidden="true"
                          >
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
                    <span
                      className="w-2 h-2 bg-[#ff5541] inline-block"
                      aria-hidden="true"
                    />
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
                      {data.pillarTotals.map(({ pillar, xp }, index) => {
                        const ratio = Math.round(
                          (xp / (data.totalXp || 1)) * 100,
                        );
                        const meta = PILLAR_METADATA[pillar] || {
                          accent: 'bg-[#c0ce71]',
                          textColor: 'text-[#c0ce71]',
                          borderColor: 'border-[#c0ce71]',
                          description: 'Core discipline commitment.',
                        };

                        return (
                          <li
                            key={pillar}
                            className="space-y-3 py-5 first:pt-0 last:pb-0"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider font-bold text-white m-0">
                                <span
                                  aria-hidden="true"
                                  className={`w-2.5 h-2.5 inline-block ${meta.accent}`}
                                />
                                {pillar}
                              </p>
                              <span className="text-[11px] font-mono text-[#ac8883] font-bold">
                                {ratio}% OF LIFETIME EFFORT
                              </span>
                            </div>

                            <p className="text-[11px] text-[#cac6bd] font-sans m-0">
                              {meta.description}
                            </p>

                            <p className="border-2 border-[#5c403b] bg-[#141312] p-3 font-mono text-xs uppercase font-bold text-[#c0ce71] tabular-nums tracking-wider shadow-inner m-0">
                              {pillar}: {xp} XP
                            </p>

                            <div
                              className="w-full bg-[#141312] border border-[#5c403b] h-2.5 overflow-hidden"
                              aria-hidden="true"
                            >
                              <div
                                className={`h-full transition-all duration-300 ${meta.accent}`}
                                style={{
                                  width: `${Math.min(100, Math.max(6, ratio))}%`,
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
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
                    <span
                      className="w-2 h-2 bg-[#c0ce71] inline-block animate-pulse"
                      aria-hidden="true"
                    />
                    Achievement archive
                  </span>
                  <span className="text-[#c0ce71]">
                    {data.seals.length} UNLOCKED
                  </span>
                </div>

                <div className="p-6">
                  {data.seals.length ? (
                    <ul className="divide-y-2 divide-[#5c403b] border-2 border-[#5c403b] bg-[#141312]">
                      {data.seals.map((seal) => {
                        const description =
                          SEAL_DESCRIPTIONS[seal.achievementCode] ||
                          'Permanent honorific seal verified upon condition proof.';

                        return (
                          <li
                            key={`${seal.achievementCode}:${seal.ruleVersion}`}
                            className="p-4 sm:p-5 flex flex-col gap-2.5 [overflow-wrap:anywhere] hover:bg-[#1d1b1a] transition-none"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs sm:text-sm text-[#e6e1df] font-bold uppercase tracking-wider flex items-center gap-2">
                                <span
                                  className="text-[#c0ce71] text-base"
                                  aria-hidden="true"
                                >
                                  ★
                                </span>
                                <span>
                                  {seal.achievementCode} · Bonus XP:{' '}
                                  {seal.bonusXp} XP · Earned:{' '}
                                  <time dateTime={seal.unlockedAt}>
                                    {seal.unlockedAt}
                                  </time>
                                </span>
                              </span>
                              <span className="text-[10px] text-[#c0ce71] font-bold bg-[#2d3400] px-2 py-0.5 select-none">
                                VERIFIED
                              </span>
                            </div>

                            <p className="text-xs text-[#cac6bd] font-sans m-0 leading-relaxed">
                              {description}
                            </p>

                            <div className="flex items-center justify-between pt-2 border-t border-[#2b2a28] text-[10px] text-[#ac8883] uppercase font-bold">
                              <span>{`RULE VER: ${seal.ruleVersion} // CRYPTOGRAPHIC SEAL`}</span>
                              <span>STATUS: PERMANENT</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="p-4 border-2 border-dashed border-[#5c403b] bg-[#141312] text-center text-xs text-[#ac8883] space-y-2">
                      <ScreenNotice state="empty" />
                      <p className="uppercase font-bold">
                        No achievements earned yet.
                      </p>
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
          <span className="text-[#c0ce71] font-bold">
            STATUS: REPUTATION VERIFIED
          </span>
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
          <span
            className="text-3xl sm:text-4xl font-black text-[#c0ce71] font-mono tracking-widest"
            aria-label="Japanese kanji for Kaizen: Continuous Improvement"
          >
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
