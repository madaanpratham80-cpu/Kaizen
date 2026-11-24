'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState('');

  async function handleGuestLogin() {
    setGuestLoading(true);
    setGuestError('');
    try {
      // Set the instant evaluation guest cookie
      document.cookie =
        'kaizen_guest=true; path=/; max-age=86400; SameSite=Lax';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('kaizen_guest_mode', 'true');
      }
      // Route immediately into the operational dashboard
      router.push('/today');
    } catch {
      setGuestError('Guest demo initialization failed. Please try again.');
      setGuestLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#141312] text-[#e6e1df] font-['DM_Sans',sans-serif] selection:bg-[#ff5541] selection:text-[#5c0000]">
      {/* TOP TICKER BAR */}
      <header className="border-b-2 border-[#5c403b] bg-[#0f0e0d] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between text-xs font-mono uppercase tracking-widest text-[#ac8883] gap-2">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-2 text-[#c0ce71] font-bold">
            <span
              className="w-2 h-2 bg-[#c0ce71] inline-block animate-pulse"
              aria-hidden="true"
            />
            SYS_STATUS: OPERATIONAL
          </span>
          <span className="hidden md:inline text-[#5c403b]">{'//'}</span>
          <span className="hidden md:inline">DISCIPLINE ARCHITECTURE V.1.0</span>
        </div>
        <nav
          aria-label="Landing page shortcuts"
          className="flex items-center gap-4 sm:gap-6 text-[11px]"
        >
          <a
            href="#how-it-works"
            className="hidden sm:inline hover:text-[#e6e1df] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            HOW IT WORKS
          </a>
          <a
            href="#preview"
            className="hidden md:inline hover:text-[#e6e1df] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            PREVIEW
          </a>
          <a
            href="#stability"
            className="hidden lg:inline hover:text-[#e6e1df] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            ROUTINE STABILITY
          </a>
          <a
            href="#who-its-for"
            className="hidden sm:inline hover:text-[#e6e1df] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            WHO IT&apos;S FOR
          </a>
          <Link
            href="/login"
            className="text-[#ff5541] hover:text-white uppercase font-bold transition-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            [ ACCESS TERMINAL ]
          </Link>
        </nav>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-16 sm:space-y-24">
        {/* HERO SECTION */}
        <section aria-labelledby="hero-heading" className="flex flex-col">
          {/* SUBTITLE DISPATCH */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono text-[#ff5541] uppercase tracking-widest font-bold mb-4">
            <span className="bg-[#ff5541] text-[#5c0000] px-2 py-0.5 font-bold">
              DISPATCH .01
            </span>
            <span className="text-[#ac8883]">
              {'// REAL-WORLD GAMIFIED PROGRESSION PLATFORM'}
            </span>
          </div>

          {/* MONOLITHIC TITLE BOX */}
          <div className="border-t-2 border-b-2 border-[#5c403b] py-6 sm:py-8 my-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <h1
                id="hero-heading"
                className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter leading-none font-['Space_Grotesk',sans-serif] m-0 text-[#e6e1df]"
              >
                KAIZEN
              </h1>
              <span
                className="text-3xl sm:text-5xl md:text-6xl font-black text-[#c0ce71] tracking-widest font-mono"
                aria-label="Japanese kanji for Kaizen: Continuous Improvement"
              >
                改善
              </span>
            </div>

            {/* BENEFIT-FOCUSED HERO COPY */}
            <p className="text-lg sm:text-2xl uppercase tracking-tight text-[#cac6bd] mt-6 mb-0 font-bold max-w-4xl font-['Space_Grotesk',sans-serif] leading-snug">
              Build lasting habits for study, fitness, and craft. When life
              interrupts and you miss a day, your lifetime progress is never
              wiped out. Resume immediately with structured routine recovery.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6 pt-6 border-t border-[#2b2a28] font-mono text-xs uppercase text-[#ac8883]">
              <div>
                <span className="text-[#c0ce71] font-bold block mb-0.5">
                  ✓ LIFETIME EFFORT
                </span>
                Permanent XP that never decays
              </div>
              <div>
                <span className="text-[#ff5541] font-bold block mb-0.5">
                  ✓ ROUTINE STABILITY
                </span>
                Health bounded between 0–100%
              </div>
              <div>
                <span className="text-[#c0ce71] font-bold block mb-0.5">
                  ✓ PLANNED REST
                </span>
                Schedule off-days with zero penalty
              </div>
              <div>
                <span className="text-[#cac6bd] font-bold block mb-0.5">
                  ✓ ZERO GUILT
                </span>
                Immediate recovery without resets
              </div>
            </div>
          </div>

          {/* ERROR NOTICE IF GUEST LOGIN FAILS */}
          {guestError && (
            <div
              role="alert"
              className="my-4 p-3 border border-[#ff5541] bg-[#1d1b1a] text-[#ffb4a8] font-mono text-xs uppercase"
            >
              {guestError}
            </div>
          )}

          {/* ACTION BUTTONS GROUP */}
          <div className="flex flex-col sm:grid sm:grid-cols-3 gap-[2px] border-2 border-[#5c403b] bg-[#5c403b] my-6 font-mono">
            {/* PRIMARY CTA: REGISTER */}
            <Link
              href="/register"
              className="group p-5 sm:p-6 bg-[#ff5541] text-[#5c0000] uppercase font-bold text-sm tracking-wider flex flex-col justify-between hover:bg-[#e6e1df] hover:text-[#141312] transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5541] min-h-[110px]"
            >
              <span className="text-xs opacity-75 mb-3">
                {'// NEW OPERATOR'}
              </span>
              <span className="text-base sm:text-lg flex items-center justify-between">
                <span>INITIALISE ACCOUNT</span>
                <span
                  className="group-hover:translate-x-1 transition-transform ml-2"
                  aria-hidden="true"
                >
                  →
                </span>
              </span>
            </Link>

            {/* SECONDARY CTA: LOGIN */}
            <Link
              href="/login"
              className="group p-5 sm:p-6 bg-[#1d1b1a] text-[#e6e1df] uppercase font-bold text-sm tracking-wider flex flex-col justify-between hover:bg-[#2b2a28] transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5541] min-h-[110px]"
            >
              <span className="text-xs text-[#ac8883] mb-3">
                {'// RETURNING OPERATOR'}
              </span>
              <span className="text-base sm:text-lg flex items-center justify-between">
                <span>ACCESS TERMINAL</span>
                <span
                  className="group-hover:translate-x-1 transition-transform ml-2"
                  aria-hidden="true"
                >
                  →
                </span>
              </span>
            </Link>

            {/* GUEST DEMO CTA */}
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={guestLoading}
              className="group p-5 sm:p-6 bg-[#0f0e0d] text-[#c0ce71] uppercase font-bold text-sm tracking-wider flex flex-col justify-between hover:bg-[#c0ce71] hover:text-[#141312] transition-none cursor-pointer border-none text-left disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0ce71] min-h-[110px]"
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-xs text-[#c0ce71] opacity-80">
                  {'// INSTANT IN-BROWSER EVALUATION'}
                </span>
                <span className="bg-[#c0ce71] text-[#2d3400] text-[10px] font-bold px-1.5 py-0.5">
                  GUEST DEMO
                </span>
              </div>
              <span className="text-base sm:text-lg flex items-center justify-between w-full">
                <span>
                  {guestLoading
                    ? 'LAUNCHING DEMO...'
                    : 'TRY THE DEMO — NO ACCOUNT NEEDED'}
                </span>
                <span className="text-lg ml-2" aria-hidden="true">
                  ⚡
                </span>
              </span>
            </button>
          </div>
          <p className="text-xs font-mono text-[#ac8883] uppercase">
            * Guest demo loads pre-populated realistic data instantly in your
            browser. No credentials or setup required.
          </p>
        </section>

        {/* SECTION 1: VISUAL PRODUCT PREVIEW */}
        <section
          id="preview"
          aria-labelledby="preview-heading"
          className="scroll-mt-12"
        >
          <div className="flex items-center gap-3 text-xs font-mono text-[#c0ce71] uppercase tracking-widest font-bold mb-3">
            <span className="bg-[#c0ce71] text-[#2d3400] px-2 py-0.5 font-bold">
              SECTION .01
            </span>
            <span className="text-[#ac8883]">
              {'// AUTHENTIC INTERFACE SPECIFICATION'}
            </span>
          </div>

          <h2
            id="preview-heading"
            className="text-3xl sm:text-5xl font-black uppercase tracking-tight font-['Space_Grotesk',sans-serif] m-0 mb-4"
          >
            THE OPERATIONAL DASHBOARD
          </h2>
          <p className="text-sm sm:text-base text-[#cac6bd] max-w-3xl mb-8 leading-relaxed">
            Every screen in Kaizen is engineered as a zero-radius, high-contrast
            dossier. Here is the exact Daily Ledger where operators anchor their
            priorities, verify completions, and inspect real-time stability.
          </p>

          {/* MOCKUP CONTAINER */}
          <div className="border-2 border-[#5c403b] bg-[#0f0e0d] font-mono shadow-2xl overflow-hidden">
            {/* WINDOW TOP HEADER */}
            <div className="border-b-2 border-[#5c403b] bg-[#1d1b1a] px-4 py-2.5 flex items-center justify-between text-xs text-[#ac8883]">
              <div className="flex items-center gap-3">
                <span className="inline-flex gap-1.5" aria-hidden="true">
                  <span className="w-2.5 h-2.5 bg-[#ff5541] inline-block" />
                  <span className="w-2.5 h-2.5 bg-[#c0ce71] inline-block" />
                  <span className="w-2.5 h-2.5 bg-[#cac6bd] inline-block" />
                </span>
                <span className="font-bold text-[#e6e1df]">
                  KAIZEN://TODAY/OPERATOR_LEDGER
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="text-[#c0ce71] font-bold">
                  ● CADENCE: ACTIVE
                </span>
                <span className="hidden sm:inline">STATE_VER: 48</span>
              </div>
            </div>

            {/* MOCK CHARACTER DOSSIER BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-[#5c403b] border-b-2 border-[#5c403b] text-xs">
              <div className="bg-[#141312] p-4">
                <span className="text-[#ac8883] text-[10px] block mb-1">
                  CHARACTER RANK
                </span>
                <div className="text-sm sm:text-base font-bold text-[#e6e1df]">
                  LEVEL 12 ARTISAN
                </div>
                <span className="text-[11px] text-[#c0ce71]">
                  8,420 LIFETIME XP
                </span>
              </div>

              <div className="bg-[#141312] p-4">
                <span className="text-[#ac8883] text-[10px] block mb-1">
                  ROUTINE STABILITY
                </span>
                <div className="text-sm sm:text-base font-bold text-[#c0ce71] flex items-center justify-between">
                  <span>85% HEALTH</span>
                  <span className="text-[10px] bg-[#2d3400] text-[#c0ce71] px-1.5 py-0.5">
                    HEALTHY
                  </span>
                </div>
                <div className="w-full bg-[#2b2a28] h-1.5 mt-2">
                  <div className="bg-[#c0ce71] h-1.5 w-[85%]" />
                </div>
              </div>

              <div className="bg-[#141312] p-4">
                <span className="text-[#ac8883] text-[10px] block mb-1">
                  ACTIVE CONTINUITY
                </span>
                <div className="text-sm sm:text-base font-bold text-[#e6e1df]">
                  42-DAY STREAK
                </div>
                <span className="text-[11px] text-[#ac8883]">
                  REST DAYS PROTECTED
                </span>
              </div>

              <div className="bg-[#141312] p-4">
                <span className="text-[#ac8883] text-[10px] block mb-1">
                  ACTIVE UNLOCKS
                </span>
                <div className="text-sm sm:text-base font-bold text-[#ffb4a8]">
                  3 MILESTONE SEALS
                </div>
                <span className="text-[11px] text-[#ac8883]">
                  IRON WILL ATTAINED
                </span>
              </div>
            </div>

            {/* MOCK TODAY COMMITMENTS SPLIT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* LEFT 2 COLS: DAILY COMMITMENTS LEDGER */}
              <div className="lg:col-span-2 p-5 sm:p-6 border-b-2 lg:border-b-0 lg:border-r-2 border-[#5c403b] space-y-4">
                <div className="flex items-center justify-between border-b border-[#2b2a28] pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#e6e1df] m-0">
                      TODAY&apos;S DIRECTIVES
                    </h3>
                    <span className="text-[11px] text-[#ac8883]">
                      ONE PRIORITY ANCHORS YOUR DAY
                    </span>
                  </div>
                  <span className="text-xs text-[#c0ce71] font-bold">
                    2 OF 3 FULFILLED
                  </span>
                </div>

                {/* TASK 1 (PRIORITY - COMPLETED) */}
                <div className="p-4 border border-[#c0ce71] bg-[#1a1f10] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-[#ff5541] text-[#5c0000] text-[10px] font-bold px-1.5 py-0.5">
                        DAILY PRIORITY
                      </span>
                      <span className="text-[10px] text-[#c0ce71] uppercase">
                        [ COGNITIVE PILLAR ]
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#e6e1df]">
                      Discrete Mathematics &amp; SVD Matrix Proofs
                    </div>
                    <div className="text-xs text-[#ac8883] mt-0.5">
                      Completed at 09:15 UTC · +25 XP awarded · Vitality locked
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#c0ce71] bg-[#2d3400] px-2.5 py-1">
                      ✓ VERIFIED
                    </span>
                  </div>
                </div>

                {/* TASK 2 (COMPLETED) */}
                <div className="p-4 border border-[#5c403b] bg-[#141312] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-[#ffb4a8] uppercase">
                        [ PHYSICAL PILLAR ]
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#e6e1df]">
                      5km Interval Conditioning + Posture Mobility
                    </div>
                    <div className="text-xs text-[#ac8883] mt-0.5">
                      Completed at 12:40 UTC · +20 XP awarded
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#c0ce71] bg-[#2d3400] px-2.5 py-1">
                      ✓ VERIFIED
                    </span>
                  </div>
                </div>

                {/* TASK 3 (QUEUED) */}
                <div className="p-4 border border-[#5c403b] bg-[#141312] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-[#cac6bd] uppercase">
                        [ CRAFT PILLAR ]
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#e6e1df]">
                      Async Queue Parser &amp; State Machine Tests
                    </div>
                    <div className="text-xs text-[#ac8883] mt-0.5">
                      Scheduled for evening block · Target: +20 XP
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#cac6bd] border border-[#5c403b] px-2.5 py-1">
                      [ PENDING COMMIT ]
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT COL: FEEDBACK & SEALS */}
              <div className="p-5 sm:p-6 bg-[#141312] space-y-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#e6e1df] border-b border-[#2b2a28] pb-2 mb-4">
                    OPERATOR SEALS
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="border border-[#2b2a28] p-3 bg-[#1d1b1a]">
                      <div className="text-[#c0ce71] font-bold">
                        ★ SEVEN-DAY WARRIOR
                      </div>
                      <div className="text-[11px] text-[#ac8883] mt-1">
                        7 consecutive scheduled active days fulfilled.
                      </div>
                    </div>

                    <div className="border border-[#ff5541] p-3 bg-[#1d1b1a]">
                      <div className="text-[#ff5541] font-bold">
                        ★ IRON WILL (RECOVERY)
                      </div>
                      <div className="text-[11px] text-[#ac8883] mt-1">
                        Successfully resumed cadence after an interrupted day.
                      </div>
                    </div>

                    <div className="border border-[#2b2a28] p-3 bg-[#1d1b1a]">
                      <div className="text-[#cac6bd] font-bold">
                        ★ HUNDRED GATES
                      </div>
                      <div className="text-[11px] text-[#ac8883] mt-1">
                        Over 100 verified lifetime real-world completions.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2b2a28] text-[11px] text-[#ac8883]">
                  STATUS: All transactions committed to durable PostgreSQL
                  ledger.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: HOW IT WORKS */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-12"
        >
          <div className="flex items-center gap-3 text-xs font-mono text-[#ff5541] uppercase tracking-widest font-bold mb-3">
            <span className="bg-[#ff5541] text-[#5c0000] px-2 py-0.5 font-bold">
              SECTION .02
            </span>
            <span className="text-[#ac8883]">
              {'// CORE OPERATIONAL ARCHITECTURE'}
            </span>
          </div>

          <h2
            id="how-it-works-heading"
            className="text-3xl sm:text-5xl font-black uppercase tracking-tight font-['Space_Grotesk',sans-serif] m-0 mb-4"
          >
            HOW KAIZEN WORKS
          </h2>
          <p className="text-sm sm:text-base text-[#cac6bd] max-w-3xl mb-8 leading-relaxed">
            Unlike traditional trackers that treat habit failure as a moral
            collapse, Kaizen uses an engineering model: clear inputs, immutable
            lifetime records, and non-punitive routine recovery.
          </p>

          {/* 4-STEP LOOP GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[2px] border-2 border-[#5c403b] bg-[#5c403b]">
            {/* STEP 1 */}
            <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-[#ff5541] font-bold block mb-2">
                  PHASE 01
                </span>
                <h3 className="text-lg font-bold font-['Space_Grotesk',sans-serif] uppercase text-[#e6e1df] m-0 mb-3">
                  CHOOSE YOUR PILLARS
                </h3>
                <p className="text-xs sm:text-sm text-[#cac6bd] leading-relaxed">
                  Map habits across three foundational disciplines:
                  <strong className="text-[#e6e1df] block mt-2">
                    • Cognitive:
                  </strong>{' '}
                  Reading, study, problem sets, and analysis.
                  <strong className="text-[#e6e1df] block mt-1">
                    • Physical:
                  </strong>{' '}
                  Workouts, conditioning, mobility, and recovery.
                  <strong className="text-[#e6e1df] block mt-1">
                    • Craft:
                  </strong>{' '}
                  Coding, writing, language practice, and design.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#ac8883]">
                [ 3 BALANCED DISCIPLINES ]
              </div>
            </div>

            {/* STEP 2 */}
            <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-[#c0ce71] font-bold block mb-2">
                  PHASE 02
                </span>
                <h3 className="text-lg font-bold font-['Space_Grotesk',sans-serif] uppercase text-[#e6e1df] m-0 mb-3">
                  LOCK DAILY PRIORITY
                </h3>
                <p className="text-xs sm:text-sm text-[#cac6bd] leading-relaxed">
                  Avoid decision fatigue. Designate one non-negotiable anchor
                  quest each morning. Completing your priority quest secures
                  your streak and stabilizes character vitality, even when the
                  rest of your day is constrained.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#c0ce71]">
                [ ONE ANCHOR COMMITMENT ]
              </div>
            </div>

            {/* STEP 3 */}
            <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-[#ffb4a8] font-bold block mb-2">
                  PHASE 03
                </span>
                <h3 className="text-lg font-bold font-['Space_Grotesk',sans-serif] uppercase text-[#e6e1df] m-0 mb-3">
                  EARN PERMANENT XP
                </h3>
                <p className="text-xs sm:text-sm text-[#cac6bd] leading-relaxed">
                  Every verified completion commits immutable XP directly to
                  your player state. XP unlocks ranks from Initiate to Master.
                  Your lifetime progress is permanent—it cannot be docked, lost,
                  or undone by time off.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#ffb4a8]">
                [ 100% NON-DEPLETING ]
              </div>
            </div>

            {/* STEP 4 */}
            <div className="bg-[#f5f0e6] text-[#141312] p-6 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono text-[#690000] font-bold block mb-2">
                  PHASE 04
                </span>
                <h3 className="text-lg font-bold font-['Space_Grotesk',sans-serif] uppercase text-[#141312] m-0 mb-3">
                  REST OR RESUME
                </h3>
                <p className="text-xs sm:text-sm text-[#32302a] leading-relaxed">
                  Take scheduled rest days without losing streak status. And if
                  an unplanned disruption causes a miss, routine stability
                  absorbs a small, bounded delta. Complete your next priority to
                  activate the recovery loop immediately.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-[#d2cab9] font-mono text-[11px] text-[#141312] font-bold">
                [ CONTINUITY WITH RECOVERY ]
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: ROUTINE STABILITY & REST DAYS EXPLAINED */}
        <section
          id="stability"
          aria-labelledby="stability-heading"
          className="scroll-mt-12"
        >
          <div className="flex items-center gap-3 text-xs font-mono text-[#c0ce71] uppercase tracking-widest font-bold mb-3">
            <span className="bg-[#c0ce71] text-[#2d3400] px-2 py-0.5 font-bold">
              SECTION .03
            </span>
            <span className="text-[#ac8883]">
              {'// SYSTEM MATHEMATICS & RECOVERY RULES'}
            </span>
          </div>

          <h2
            id="stability-heading"
            className="text-3xl sm:text-5xl font-black uppercase tracking-tight font-['Space_Grotesk',sans-serif] m-0 mb-4"
          >
            ROUTINE STABILITY &amp; REST DAYS
          </h2>
          <p className="text-sm sm:text-base text-[#cac6bd] max-w-3xl mb-8 leading-relaxed">
            Most habit trackers punish you with all-or-nothing streaks that
            collapse on your first sick day or travel emergency. Kaizen replaces
            fragile streaks with mathematical resilience.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD 1: HOW ROUTINE STABILITY WORKS */}
            <div className="border-2 border-[#5c403b] bg-[#0f0e0d] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#2b2a28] pb-3 mb-4">
                  <h3 className="text-base sm:text-lg font-bold font-mono uppercase text-[#ff5541] m-0">
                    CHARACTER HEALTH (0–100%)
                  </h3>
                  <span className="text-xs font-mono text-[#ac8883]">
                    BOUNDED DELTA
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#cac6bd] leading-relaxed mb-4">
                  Routine stability reflects your short-term consistency over
                  recent days. Instead of resetting everything upon a miss,
                  health operates within controlled thresholds:
                </p>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 border border-[#2b2a28] bg-[#141312]">
                    <div className="flex items-center justify-between text-[#c0ce71] font-bold">
                      <span>HEALTHY (70% – 100%)</span>
                      <span>OPTIMAL CADENCE</span>
                    </div>
                    <p className="text-[11px] text-[#ac8883] mt-1 mb-0 font-sans">
                      Active consistency. Quests and priority commitments
                      replenish health up to 100%.
                    </p>
                  </div>

                  <div className="p-3 border border-[#2b2a28] bg-[#141312]">
                    <div className="flex items-center justify-between text-[#ffb4a8] font-bold">
                      <span>TIRED (40% – 69%)</span>
                      <span>REDUCED VITALITY</span>
                    </div>
                    <p className="text-[11px] text-[#ac8883] mt-1 mb-0 font-sans">
                      A day was missed. Daily health loss is strictly capped
                      (max -5% per day). Lifetime XP remains untouched.
                    </p>
                  </div>

                  <div className="p-3 border border-[#2b2a28] bg-[#141312]">
                    <div className="flex items-center justify-between text-[#ff5541] font-bold">
                      <span>FADING (0% – 39%)</span>
                      <span>INACTIVITY WARNING</span>
                    </div>
                    <p className="text-[11px] text-[#ac8883] mt-1 mb-0 font-sans">
                      Longer disruption. You are never reset to Level 1.
                      Completing one priority quest immediately initiates
                      recovery.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2b2a28] text-xs font-mono text-[#ac8883]">
                RULE: Inactivity adjusts stability; it never subtracts lifetime
                XP.
              </div>
            </div>

            {/* CARD 2: PLANNED REST & IRON WILL RECOVERY */}
            <div className="border-2 border-[#5c403b] bg-[#0f0e0d] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#2b2a28] pb-3 mb-4">
                  <h3 className="text-base sm:text-lg font-bold font-mono uppercase text-[#c0ce71] m-0">
                    PLANNED REST &amp; RECOVERY
                  </h3>
                  <span className="text-xs font-mono text-[#ac8883]">
                    SCHEDULE AWARE
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#cac6bd] leading-relaxed mb-4">
                  Human performance requires deliberate rest. Kaizen natively
                  integrates scheduled rest days into the calendar:
                </p>

                <div className="space-y-4 text-xs sm:text-sm text-[#cac6bd]">
                  <div className="p-3 border border-[#2b2a28] bg-[#141312]">
                    <span className="font-mono font-bold text-[#c0ce71] block mb-1">
                      SCHEDULED REST DAYS:
                    </span>
                    <p className="m-0 leading-relaxed text-xs">
                      Mark days as rest in advance. Scheduled rest days preserve
                      your continuity streak, incur zero health loss, and
                      require no fake activity.
                    </p>
                  </div>

                  <div className="p-3 border border-[#2b2a28] bg-[#141312]">
                    <span className="font-mono font-bold text-[#ff5541] block mb-1">
                      IRON WILL RECOVERY:
                    </span>
                    <p className="m-0 leading-relaxed text-xs">
                      When an active day is missed unexpectedly, the system flags
                      a recovery opportunity. Completing your next planned day
                      restores vitality and awards the permanent{' '}
                      <strong>Iron Will</strong> seal.
                    </p>
                  </div>

                  <div className="p-3 border border-[#2b2a28] bg-[#141312]">
                    <span className="font-mono font-bold text-[#e6e1df] block mb-1">
                      NO PAY-TO-REST GIMMICKS:
                    </span>
                    <p className="m-0 leading-relaxed text-xs">
                      No streak freeze coins, no fake currency, and no guilt
                      notifications. Progress is calculated purely from your
                      real-world discipline.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2b2a28] text-xs font-mono text-[#ac8883]">
                INVARIANT: Streaks reflect verified active days and planned
                rests.
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: WHO IT'S FOR */}
        <section
          id="who-its-for"
          aria-labelledby="who-heading"
          className="scroll-mt-12"
        >
          <div className="flex items-center gap-3 text-xs font-mono text-[#ff5541] uppercase tracking-widest font-bold mb-3">
            <span className="bg-[#ff5541] text-[#5c0000] px-2 py-0.5 font-bold">
              SECTION .04
            </span>
            <span className="text-[#ac8883]">
              {'// TARGET OPERATOR PROFILES'}
            </span>
          </div>

          <h2
            id="who-heading"
            className="text-3xl sm:text-5xl font-black uppercase tracking-tight font-['Space_Grotesk',sans-serif] m-0 mb-4"
          >
            WHO KAIZEN IS FOR
          </h2>
          <p className="text-sm sm:text-base text-[#cac6bd] max-w-3xl mb-8 leading-relaxed">
            Kaizen is built for individuals who take daily self-mastery
            seriously and want an honest system that doesn&apos;t treat them like
            children.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[2px] border-2 border-[#5c403b] bg-[#5c403b]">
            {/* PERSONA 1 */}
            <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#ac8883] uppercase block mb-1 font-bold">
                  PROFILE 01
                </span>
                <h3 className="text-base font-bold font-mono text-[#ffb4a8] uppercase m-0 mb-2">
                  STUDENTS &amp; RESEARCHERS
                </h3>
                <p className="text-xs text-[#cac6bd] leading-relaxed">
                  Master demanding university curricula, graduate research, or
                  exam prep with consistent cognitive deep work blocks without
                  burning out before finals.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#ac8883]">
                FOCUS: COGNITIVE RIGOR
              </div>
            </div>

            {/* PERSONA 2 */}
            <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#ac8883] uppercase block mb-1 font-bold">
                  PROFILE 02
                </span>
                <h3 className="text-base font-bold font-mono text-[#c0ce71] uppercase m-0 mb-2">
                  SOFTWARE BUILDERS &amp; ENGINEERS
                </h3>
                <p className="text-xs text-[#cac6bd] leading-relaxed">
                  Maintain daily code commits, open source contributions, and
                  technical book study alongside high-velocity work and life
                  demands.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#ac8883]">
                FOCUS: CRAFT MASTERY
              </div>
            </div>

            {/* PERSONA 3 */}
            <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#ac8883] uppercase block mb-1 font-bold">
                  PROFILE 03
                </span>
                <h3 className="text-base font-bold font-mono text-[#ff5541] uppercase m-0 mb-2">
                  ATHLETES &amp; PRACTITIONERS
                </h3>
                <p className="text-xs text-[#cac6bd] leading-relaxed">
                  Structure progressive resistance training, mobility sessions,
                  and endurance cycles while protecting designated recovery
                  without guilt.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#ac8883]">
                FOCUS: PHYSICAL VITALITY
              </div>
            </div>

            {/* PERSONA 4 */}
            <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#ac8883] uppercase block mb-1 font-bold">
                  PROFILE 04
                </span>
                <h3 className="text-base font-bold font-mono text-[#e6e1df] uppercase m-0 mb-2">
                  DELIBERATE PRACTITIONERS
                </h3>
                <p className="text-xs text-[#cac6bd] leading-relaxed">
                  Writers, language learners, and artists who value multi-year
                  continuity and want proof that a busy week won&apos;t destroy
                  years of habit building.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#ac8883]">
                FOCUS: LIFETIME HABITS
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: CONTACT & REPOSITORY INFORMATION */}
        <section
          id="contact"
          aria-labelledby="contact-heading"
          className="border-2 border-[#5c403b] bg-[#0f0e0d] p-6 sm:p-10 font-mono"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-[#5c403b] pb-6 mb-6">
            <div>
              <div className="text-xs text-[#ff5541] font-bold uppercase tracking-widest mb-1">
                DISCIPLINE LEDGER REPOSITORY
              </div>
              <h2
                id="contact-heading"
                className="text-2xl sm:text-4xl font-bold uppercase tracking-tight text-[#e6e1df] m-0"
              >
                OPEN SOURCE &amp; TEAM CONTACT
              </h2>
            </div>
            <div className="text-xs text-[#ac8883]">
              STATUS: PUBLIC ACCESS LEDGER
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm">
            <div>
              <p className="text-[#cac6bd] leading-relaxed mb-4 font-sans">
                Kaizen is an open, disciplined habit platform built with Next.js
                App Router, Express, and PostgreSQL. Feedback, architectural
                proposals, and issue reports are tracked transparently on
                GitHub.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-[#c0ce71] font-bold">REPO:</span>
                  <a
                    href="https://github.com/madaanpratham80-cpu/Kaizen"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff5541] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
                  >
                    github.com/madaanpratham80-cpu/Kaizen
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#c0ce71] font-bold">ISSUES:</span>
                  <a
                    href="https://github.com/madaanpratham80-cpu/Kaizen/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ff5541] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
                  >
                    github.com/madaanpratham80-cpu/Kaizen/issues
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-[#2b2a28] pt-6 md:pt-0 md:pl-8 flex flex-col justify-between">
              <div>
                <span className="text-[#ac8883] text-xs font-bold uppercase block mb-2">
                  COMMUNITY GUIDELINE
                </span>
                <p className="text-[#cac6bd] text-xs leading-relaxed font-sans mb-4">
                  For bug reports, feature discussions, or deployment support,
                  please file an issue on GitHub. Our maintainers review issues
                  and pull requests following the project architecture
                  guidelines.
                </p>
              </div>
              <div className="p-3 bg-[#141312] border border-[#2b2a28] text-[11px] text-[#ac8883]">
                ARCHITECTURE: Zero-radius editorial brutalist dossier. All
                metrics verified against durable PostgreSQL invariants.
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER LEDGER STRIP */}
      <footer className="border-t-2 border-[#5c403b] bg-[#0f0e0d] px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#ac8883] uppercase tracking-wider gap-4">
        <div className="flex items-center gap-3">
          <span
            className="w-2 h-2 bg-[#ff5541] inline-block"
            aria-hidden="true"
          />
          <span>
            KAIZEN ARCHITECTURAL PLATFORM // BUILT FOR DISCIPLINED CONTINUOUS
            IMPROVEMENT
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <Link
            href="/register"
            className="text-[#cac6bd] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            INITIALISE
          </Link>
          <span className="text-[#5c403b]">|</span>
          <Link
            href="/login"
            className="text-[#cac6bd] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            LOGIN
          </Link>
          <span className="text-[#5c403b]">|</span>
          <span>© 2026 KAIZEN LEDGER</span>
        </div>
      </footer>
    </div>
  );
}
