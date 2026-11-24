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
      // Route immediately into the live workspace
      router.push('/today');
    } catch {
      setGuestError('Could not start demo session. Please try again.');
      setGuestLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#141312] text-[#e6e1df] font-['DM_Sans',sans-serif] selection:bg-[#ff5541] selection:text-[#5c0000]">
      {/* NAVIGATION HEADER */}
      <header className="border-b-2 border-[#5c403b] bg-[#0f0e0d] px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-black tracking-tight text-white font-['Space_Grotesk',sans-serif] hover:text-[#c0ce71] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5541]"
          >
            <span className="text-[#ff5541]">KAIZEN</span>
            <span
              className="text-[#c0ce71] text-sm font-mono tracking-widest font-bold"
              aria-hidden="true"
            >
              改善
            </span>
          </Link>

          <span
            className="hidden md:inline-block w-px h-4 bg-[#5c403b]"
            aria-hidden="true"
          />

          <span className="hidden md:inline-flex items-center gap-2 text-xs font-mono text-[#ac8883]">
            <span
              className="w-2 h-2 bg-[#c0ce71] inline-block animate-pulse"
              aria-hidden="true"
            />
            DISCIPLINE WITH RECOVERY
          </span>
        </div>

        <nav
          aria-label="Site navigation"
          className="flex items-center gap-4 sm:gap-6 text-xs font-mono"
        >
          <a
            href="#how-it-works"
            className="hidden md:inline text-[#cac6bd] hover:text-white uppercase transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            How it works
          </a>
          <a
            href="#preview"
            className="hidden sm:inline text-[#cac6bd] hover:text-white uppercase transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            Preview
          </a>
          <a
            href="#faq"
            className="hidden sm:inline text-[#cac6bd] hover:text-white uppercase transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            FAQ
          </a>

          <Link
            href="/login"
            className="text-[#cac6bd] hover:text-white uppercase font-bold transition-colors px-2 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            Sign in
          </Link>

          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={guestLoading}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#c0ce71] text-[#141312] hover:bg-white text-xs font-bold uppercase transition-colors cursor-pointer border-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c0ce71]"
          >
            <span>{guestLoading ? 'Starting…' : 'Try Demo'}</span>
            <span aria-hidden="true">→</span>
          </button>
        </nav>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-12 md:py-20 space-y-20 md:space-y-32">
        {/* HERO SECTION */}
        <section aria-labelledby="hero-title" className="flex flex-col pt-4">
          {/* CATEGORY CALLOUT */}
          <div className="flex items-center gap-2.5 text-xs font-mono text-[#c0ce71] uppercase tracking-wider font-bold mb-4">
            <span
              className="w-2 h-2 bg-[#c0ce71] inline-block"
              aria-hidden="true"
            />
            <span>HABIT TRACKER FOR STUDY, FITNESS &amp; CRAFT</span>
          </div>

          {/* MAIN PROMISE HEADLINE */}
          <h1
            id="hero-title"
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white font-['Space_Grotesk',sans-serif] leading-[1.05] m-0 max-w-4xl"
          >
            Build habits that survive real life.
          </h1>

          {/* HUMAN BENEFIT EXPLANATION */}
          <p className="text-lg sm:text-2xl text-[#cac6bd] mt-6 mb-0 font-normal max-w-3xl leading-relaxed">
            Plan one daily priority, accumulate permanent progress, and resume
            effortlessly after a missed day—without losing your streak or starting
            over.
          </p>

          {/* BENEFIT HIGHLIGHTS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-8 py-6 border-y-2 border-[#5c403b] font-mono text-xs text-[#cac6bd]">
            <div className="flex items-start gap-2.5">
              <span className="text-[#c0ce71] font-bold text-sm" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong className="text-white block font-bold uppercase">
                  Permanent Progress
                </strong>
                <span>Lifetime XP and levels that can never decay.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-[#ff5541] font-bold text-sm" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong className="text-white block font-bold uppercase">
                  Routine Stability
                </strong>
                <span>Bounded health bands absorb off-days safely.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-[#c0ce71] font-bold text-sm" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong className="text-white block font-bold uppercase">
                  Planned Rest Days
                </strong>
                <span>Take scheduled recovery without breaking streaks.</span>
              </div>
            </div>
          </div>

          {/* ERROR ALERT IF DEMO FAILS */}
          {guestError && (
            <div
              role="alert"
              className="mb-6 p-3 border-2 border-[#ff5541] bg-[#1d1b1a] text-[#ffb4a8] font-mono text-xs uppercase font-bold"
            >
              {guestError}
            </div>
          )}

          {/* CLEAR CTA GROUP: 1 PROMINENT PRIMARY + 1 QUIETER SECONDARY */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-xl">
            {/* PRIMARY ACTION: DEMO */}
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={guestLoading}
              className="flex-1 px-8 py-4 bg-[#ff5541] text-[#5c0000] hover:bg-white hover:text-[#141312] text-base font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-colors cursor-pointer border-none shadow-lg disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5541]"
            >
              <span>
                {guestLoading ? 'Opening demo…' : 'Try the demo'}
              </span>
              <span className="text-lg" aria-hidden="true">
                →
              </span>
            </button>

            {/* SECONDARY ACTION: REGISTER */}
            <Link
              href="/register"
              className="px-6 py-4 border-2 border-[#5c403b] bg-[#141312] text-[#e6e1df] hover:border-[#cac6bd] hover:bg-[#1d1b1a] text-base font-bold uppercase tracking-wider flex items-center justify-center transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cac6bd]"
            >
              Create account
            </Link>
          </div>

          {/* HELPER SUBTEXT */}
          <p className="text-xs font-mono text-[#ac8883] mt-3.5 mb-0">
            No password or card needed for demo. Explore preloaded habits
            instantly in your browser.
          </p>
        </section>

        {/* SECTION 1: PRODUCT EXPERIENCE PREVIEW */}
        <section
          id="preview"
          aria-labelledby="preview-title"
          className="scroll-mt-20 space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-[#c0ce71] uppercase tracking-wider font-bold">
              <span>LIVE WORKSPACE PREVIEW</span>
              <span className="text-[#5c403b]" aria-hidden="true">
                {'//'}
              </span>
              <span className="text-[#ac8883]">DEMO DATA</span>
            </div>
            <h2
              id="preview-title"
              className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-['Space_Grotesk',sans-serif] m-0"
            >
              A focused daily ledger, not a game of guilt.
            </h2>
            <p className="text-sm sm:text-base text-[#cac6bd] max-w-2xl leading-relaxed m-0">
              Here is how your day looks in Kaizen. One daily priority anchors
              your streak, while lifetime experience and routine stability
              track your real-world consistency.
            </p>
          </div>

          {/* INTERFACE MOCKUP FRAME */}
          <div className="border-2 border-[#5c403b] bg-[#0f0e0d] font-mono shadow-2xl overflow-hidden">
            {/* TERMINAL CHROME BAR */}
            <div className="border-b-2 border-[#5c403b] bg-[#1d1b1a] px-4 py-3 flex items-center justify-between text-xs text-[#ac8883]">
              <div className="flex items-center gap-3">
                <span className="inline-flex gap-1.5" aria-hidden="true">
                  <span className="w-2.5 h-2.5 bg-[#ff5541] inline-block" />
                  <span className="w-2.5 h-2.5 bg-[#c0ce71] inline-block" />
                  <span className="w-2.5 h-2.5 bg-[#cac6bd] inline-block" />
                </span>
                <span className="font-bold text-[#e6e1df]">
                  kaizen.app/today
                </span>
              </div>
              <span className="bg-[#2d3400] text-[#c0ce71] text-[10px] font-bold px-2 py-0.5 uppercase">
                Sample Demo Data
              </span>
            </div>

            {/* THREE KEY METRIC HIGHLIGHTS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#5c403b] border-b-2 border-[#5c403b] text-xs">
              <div className="bg-[#141312] p-4">
                <span className="text-[#ac8883] text-[10px] uppercase block mb-1">
                  Lifetime Progress
                </span>
                <div className="text-base font-bold text-white">
                  Level 12 Artisan
                </div>
                <span className="text-[11px] text-[#c0ce71] font-bold">
                  8,420 Total XP
                </span>
              </div>

              <div className="bg-[#141312] p-4">
                <span className="text-[#ac8883] text-[10px] uppercase block mb-1">
                  Routine Stability
                </span>
                <div className="text-base font-bold text-[#c0ce71] flex items-center justify-between">
                  <span>85% Health</span>
                  <span className="text-[10px] bg-[#2d3400] text-[#c0ce71] px-1 py-0.5 font-bold">
                    Healthy
                  </span>
                </div>
                <div className="w-full bg-[#2b2a28] h-1.5 mt-2">
                  <div className="bg-[#c0ce71] h-1.5 w-[85%]" />
                </div>
              </div>

              <div className="bg-[#141312] p-4">
                <span className="text-[#ac8883] text-[10px] uppercase block mb-1">
                  Continuity Streak
                </span>
                <div className="text-base font-bold text-white">42 Days</div>
                <span className="text-[11px] text-[#ac8883]">
                  Rest days protected
                </span>
              </div>

              <div className="bg-[#141312] p-4">
                <span className="text-[#ac8883] text-[10px] uppercase block mb-1">
                  Earned Milestone
                </span>
                <div className="text-base font-bold text-[#ffb4a8]">
                  Iron Will
                </div>
                <span className="text-[11px] text-[#ac8883]">
                  Resumed after off-day
                </span>
              </div>
            </div>

            {/* PREVIEW CONTENT COLUMNS */}
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {/* TODAY'S HABITS */}
              <div className="lg:col-span-2 p-5 sm:p-6 border-b-2 lg:border-b-0 lg:border-r-2 border-[#5c403b] space-y-4">
                <div className="flex items-center justify-between border-b border-[#2b2a28] pb-2.5">
                  <span className="text-xs uppercase font-bold text-white tracking-wider">
                    Today&apos;s Habits
                  </span>
                  <span className="text-xs text-[#c0ce71] font-bold">
                    2 of 3 completed
                  </span>
                </div>

                {/* HABIT 1: PRIORITY */}
                <div className="p-4 border border-[#c0ce71] bg-[#192010] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-[#ff5541] text-[#5c0000] text-[10px] font-bold px-1.5 py-0.5 uppercase">
                        Daily Priority
                      </span>
                      <span className="text-[10px] text-[#c0ce71] uppercase">
                        Cognitive Pillar
                      </span>
                    </div>
                    <div className="font-bold text-sm text-white">
                      Linear Algebra &amp; Matrix Proofs Drill
                    </div>
                    <p className="text-xs text-[#ac8883] mt-1 mb-0 font-sans">
                      Anchors your daily streak. Completed at 09:15 · +25 XP.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#c0ce71] bg-[#2d3400] px-2.5 py-1 self-start sm:self-center">
                    ✓ Completed
                  </span>
                </div>

                {/* HABIT 2: PHYSICAL */}
                <div className="p-4 border border-[#5c403b] bg-[#141312] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-[#ffb4a8] uppercase block mb-1">
                      Physical Pillar
                    </span>
                    <div className="font-bold text-sm text-white">
                      5km Interval Run + Mobility Stretches
                    </div>
                    <p className="text-xs text-[#ac8883] mt-1 mb-0 font-sans">
                      Completed at 12:40 · +20 XP.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#c0ce71] bg-[#2d3400] px-2.5 py-1 self-start sm:self-center">
                    ✓ Completed
                  </span>
                </div>

                {/* HABIT 3: CRAFT */}
                <div className="p-4 border border-[#5c403b] bg-[#141312] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-[#cac6bd] uppercase block mb-1">
                      Craft Pillar
                    </span>
                    <div className="font-bold text-sm text-white">
                      Systems Architecture Audit &amp; Writing
                    </div>
                    <p className="text-xs text-[#ac8883] mt-1 mb-0 font-sans">
                      Scheduled for evening · Target: +20 XP.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#cac6bd] border border-[#5c403b] px-2.5 py-1 self-start sm:self-center">
                    Pending
                  </span>
                </div>
              </div>

              {/* CALLOUT EXPLANATIONS */}
              <div className="p-5 sm:p-6 bg-[#141312] space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-white tracking-wider block border-b border-[#2b2a28] pb-2 mb-3">
                    How it works in practice
                  </span>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <strong className="text-[#c0ce71] block mb-1 font-bold">
                        1. One Daily Priority
                      </strong>
                      <p className="text-[#cac6bd] font-sans leading-relaxed m-0">
                        Designate one non-negotiable habit each morning. Even on
                        busy days, completing your priority secures your streak.
                      </p>
                    </div>

                    <div>
                      <strong className="text-[#ff5541] block mb-1 font-bold">
                        2. Non-punitive Health
                      </strong>
                      <p className="text-[#cac6bd] font-sans leading-relaxed m-0">
                        Missing a day causes a small, bounded health adjustment
                        (max -5%), not a streak reset. Your lifetime XP remains
                        untouched.
                      </p>
                    </div>

                    <div>
                      <strong className="text-[#f5f0e6] block mb-1 font-bold">
                        3. Scheduled Rest Days
                      </strong>
                      <p className="text-[#cac6bd] font-sans leading-relaxed m-0">
                        Mark off-days in advance for travel or recovery. Rest days
                        protect your streak without fake check-ins.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2b2a28] text-[11px] text-[#ac8883]">
                  Kaizen tracks progress across Cognitive, Physical, and Craft
                  pillars.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: HOW IT WORKS IN 3 STEPS */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-title"
          className="scroll-mt-20 space-y-8"
        >
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#ff5541] uppercase tracking-wider font-bold">
              THE CORE HABIT LOOP
            </div>
            <h2
              id="how-it-works-title"
              className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-['Space_Grotesk',sans-serif] m-0"
            >
              Three simple steps to long-term consistency.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px border-2 border-[#5c403b] bg-[#5c403b]">
            {/* STEP 1 */}
            <div className="bg-[#0f0e0d] p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-mono text-[#ff5541] font-bold block mb-2">
                  STEP 01
                </span>
                <h3 className="text-lg font-bold font-['Space_Grotesk',sans-serif] text-white m-0 mb-3">
                  Choose your commitments
                </h3>
                <p className="text-xs sm:text-sm text-[#cac6bd] leading-relaxed m-0">
                  Select habits balanced across three foundational disciplines:
                </p>
                <ul className="text-xs text-[#cac6bd] space-y-1.5 mt-3 pl-4 list-disc font-sans">
                  <li>
                    <strong className="text-white">Cognitive:</strong> Reading,
                    study, mathematics, and deep research.
                  </li>
                  <li>
                    <strong className="text-white">Physical:</strong> Workouts,
                    conditioning, mobility, and recovery.
                  </li>
                  <li>
                    <strong className="text-white">Craft:</strong> Programming,
                    writing, design, and deliberate practice.
                  </li>
                </ul>
              </div>
              <div className="pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#ac8883]">
                Balanced life disciplines
              </div>
            </div>

            {/* STEP 2 */}
            <div className="bg-[#0f0e0d] p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-mono text-[#c0ce71] font-bold block mb-2">
                  STEP 02
                </span>
                <h3 className="text-lg font-bold font-['Space_Grotesk',sans-serif] text-white m-0 mb-3">
                  Lock your daily priority
                </h3>
                <p className="text-xs sm:text-sm text-[#cac6bd] leading-relaxed m-0">
                  Every morning, pick one non-negotiable anchor habit. When your
                  schedule gets interrupted, completing your daily priority is all
                  it takes to safeguard your continuity streak and earn verified
                  XP.
                </p>
              </div>
              <div className="pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#c0ce71]">
                Zero decision fatigue
              </div>
            </div>

            {/* STEP 3 */}
            <div className="bg-[#0f0e0d] p-6 sm:p-8 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs font-mono text-[#ffb4a8] font-bold block mb-2">
                  STEP 03
                </span>
                <h3 className="text-lg font-bold font-['Space_Grotesk',sans-serif] text-white m-0 mb-3">
                  Rest or resume freely
                </h3>
                <p className="text-xs sm:text-sm text-[#cac6bd] leading-relaxed m-0">
                  Take scheduled rest days without losing momentum. And if life
                  disrupts your plans unexpectedly, routine health absorbs a
                  small, capped delta. Complete your next priority to clear the
                  fatigue immediately.
                </p>
              </div>
              <div className="pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#ffb4a8]">
                Continuous, guilt-free progress
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: WHY KAIZEN IS DIFFERENT (COMPARISON) */}
        <section aria-labelledby="comparison-title" className="space-y-8">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#c0ce71] uppercase tracking-wider font-bold">
              THE KAIZEN ADVANTAGE
            </div>
            <h2
              id="comparison-title"
              className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-['Space_Grotesk',sans-serif] m-0"
            >
              Why traditional streak trackers fail you.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TRADITIONAL HABIT APPS */}
            <div className="border-2 border-[#5c403b] bg-[#141312] p-6 sm:p-8 space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#ff5541] font-bold block">
                Typical Habit Trackers
              </span>
              <ul className="space-y-3 text-xs sm:text-sm text-[#cac6bd] font-sans pl-4 list-disc">
                <li>
                  <strong className="text-white">All-or-nothing streaks:</strong>{' '}
                  A single sick day or travel flight wipes your entire streak to zero.
                </li>
                <li>
                  <strong className="text-white">Pay-to-save gimmicks:</strong>{' '}
                  Pressures you to buy artificial &ldquo;streak freeze&rdquo; coins or premium passes.
                </li>
                <li>
                  <strong className="text-white">Demoralizing guilt:</strong>{' '}
                  Users often abandon apps entirely after a single interrupted week.
                </li>
              </ul>
            </div>

            {/* KAIZEN SYSTEM */}
            <div className="border-2 border-[#c0ce71] bg-[#171f11] p-6 sm:p-8 space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#c0ce71] font-bold block">
                Kaizen Architecture
              </span>
              <ul className="space-y-3 text-xs sm:text-sm text-[#cac6bd] font-sans pl-4 list-disc">
                <li>
                  <strong className="text-white">Permanent Lifetime XP:</strong>{' '}
                  Your accumulated experience and player ranks can never be lost or reset.
                </li>
                <li>
                  <strong className="text-white">Bounded Routine Health:</strong>{' '}
                  Health adjusts within controlled thresholds (70–100% Healthy; max -5% daily dip).
                </li>
                <li>
                  <strong className="text-white">Scheduled Rest Days:</strong>{' '}
                  Plan recovery ahead of time. Planned rest days preserve your active streak.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 4: WHO IT'S FOR */}
        <section aria-labelledby="who-title" className="space-y-8">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#ff5541] uppercase tracking-wider font-bold">
              BUILT FOR PRACTITIONERS
            </div>
            <h2
              id="who-title"
              className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-['Space_Grotesk',sans-serif] m-0"
            >
              Who Kaizen is built for.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px border-2 border-[#5c403b] bg-[#5c403b]">
            <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-mono text-[#ac8883] uppercase block mb-1">
                  {'01 // Academic'}
                </span>
                <h3 className="text-base font-bold text-white m-0 mb-2">
                  Students &amp; Researchers
                </h3>
                <p className="text-xs text-[#cac6bd] leading-relaxed font-sans m-0">
                  Build deep-work blocks for coursework, thesis writing, and exam
                  preparation without burning out before finals.
                </p>
              </div>
              <div className="pt-2 border-t border-[#2b2a28] font-mono text-[11px] text-[#ac8883]">
                Cognitive Focus
              </div>
            </div>

            <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-mono text-[#ac8883] uppercase block mb-1">
                  {'02 // Engineering'}
                </span>
                <h3 className="text-base font-bold text-white m-0 mb-2">
                  Software Builders
                </h3>
                <p className="text-xs text-[#cac6bd] leading-relaxed font-sans m-0">
                  Maintain daily code commits, technical reading, and open source
                  contributions alongside demanding team sprint cycles.
                </p>
              </div>
              <div className="pt-2 border-t border-[#2b2a28] font-mono text-[11px] text-[#c0ce71]">
                Craft Mastery
              </div>
            </div>

            <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-mono text-[#ac8883] uppercase block mb-1">
                  {'03 // Physical'}
                </span>
                <h3 className="text-base font-bold text-white m-0 mb-2">
                  Athletes &amp; Lifters
                </h3>
                <p className="text-xs text-[#cac6bd] leading-relaxed font-sans m-0">
                  Structure resistance training, endurance, and mobility while
                  respecting planned rest and recovery days without guilt.
                </p>
              </div>
              <div className="pt-2 border-t border-[#2b2a28] font-mono text-[11px] text-[#ff5541]">
                Physical Vitality
              </div>
            </div>

            <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-mono text-[#ac8883] uppercase block mb-1">
                  {'04 // Creative'}
                </span>
                <h3 className="text-base font-bold text-white m-0 mb-2">
                  Deliberate Creators
                </h3>
                <p className="text-xs text-[#cac6bd] leading-relaxed font-sans m-0">
                  Writers, designers, and musicians who understand that multi-year
                  mastery depends on continuity rather than short-lived bursts.
                </p>
              </div>
              <div className="pt-2 border-t border-[#2b2a28] font-mono text-[11px] text-[#cac6bd]">
                Durable Discipline
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: FREQUENTLY ASKED QUESTIONS */}
        <section
          id="faq"
          aria-labelledby="faq-title"
          className="scroll-mt-20 space-y-8"
        >
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#cac6bd] uppercase tracking-wider font-bold">
              COMMON QUESTIONS
            </div>
            <h2
              id="faq-title"
              className="text-2xl sm:text-4xl font-bold tracking-tight text-white font-['Space_Grotesk',sans-serif] m-0"
            >
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 border-2 border-[#5c403b] bg-[#0f0e0d] space-y-2">
              <h3 className="text-sm font-bold text-white font-mono uppercase m-0">
                What happens when I miss a day?
              </h3>
              <p className="text-xs sm:text-sm text-[#cac6bd] font-sans leading-relaxed m-0">
                Your lifetime XP and character level remain 100% safe—they can
                never be deducted. Only short-term routine health absorbs a
                capped delta (maximum 5% per day). Completing your next priority
                habit marks your recovery and restores health.
              </p>
            </div>

            <div className="p-6 border-2 border-[#5c403b] bg-[#0f0e0d] space-y-2">
              <h3 className="text-sm font-bold text-white font-mono uppercase m-0">
                How do planned rest days work?
              </h3>
              <p className="text-xs sm:text-sm text-[#cac6bd] font-sans leading-relaxed m-0">
                Human performance requires intentional recovery. You can schedule
                rest days in advance for travel or rest. Scheduled rest days
                preserve your active streak without requiring fake check-ins.
              </p>
            </div>

            <div className="p-6 border-2 border-[#5c403b] bg-[#0f0e0d] space-y-2">
              <h3 className="text-sm font-bold text-white font-mono uppercase m-0">
                What are the Three Pillars?
              </h3>
              <p className="text-xs sm:text-sm text-[#cac6bd] font-sans leading-relaxed m-0">
                Kaizen organizes all habits into Cognitive (mental study and
                reading), Physical (fitness and sleep), and Craft (coding, writing,
                and practice). Tracking all three provides balanced discipline.
              </p>
            </div>

            <div className="p-6 border-2 border-[#5c403b] bg-[#0f0e0d] space-y-2">
              <h3 className="text-sm font-bold text-white font-mono uppercase m-0">
                Can I try it without creating an account?
              </h3>
              <p className="text-xs sm:text-sm text-[#cac6bd] font-sans leading-relaxed m-0">
                Yes. Click &ldquo;Try the demo&rdquo; to launch directly into an
                in-browser workspace preloaded with realistic sample habits. No email,
                password, or setup required.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6: OPEN SOURCE & COMMUNITY CONTACT */}
        <section
          id="contact"
          aria-labelledby="contact-title"
          className="border-2 border-[#5c403b] bg-[#0f0e0d] p-6 sm:p-10 font-mono"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#5c403b] pb-6 mb-6">
            <div>
              <div className="text-xs text-[#ff5541] font-bold uppercase tracking-wider mb-1">
                TRANSPARENT ARCHITECTURE
              </div>
              <h2
                id="contact-title"
                className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white m-0"
              >
                Open Source &amp; Team Feedback
              </h2>
            </div>
            <span className="text-xs text-[#c0ce71] font-bold">
              PUBLIC REPOSITORY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs sm:text-sm">
            <div className="space-y-4">
              <p className="text-[#cac6bd] leading-relaxed font-sans m-0">
                Kaizen is an open, disciplined achievement system built with
                Next.js App Router, Express, and PostgreSQL. Development, issue
                tracking, and feedback take place transparently on GitHub.
              </p>
              <div className="space-y-2 text-xs">
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

            <div className="border-t md:border-t-0 md:border-l border-[#2b2a28] pt-6 md:pt-0 md:pl-8 flex flex-col justify-between space-y-4">
              <div>
                <strong className="text-[#cac6bd] text-xs uppercase block mb-1 font-bold">
                  Community &amp; Contributions
                </strong>
                <p className="text-[#cac6bd] text-xs leading-relaxed font-sans m-0">
                  Found a bug or have a suggestion? Open an issue on GitHub.
                  Maintainers review issues and pull requests following our
                  system architecture specifications.
                </p>
              </div>
              <div className="p-3 bg-[#141312] border border-[#2b2a28] text-[11px] text-[#ac8883]">
                Zero-radius broadsheet design system. Verified PostgreSQL
                progression rules.
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER STRIP */}
      <footer className="border-t-2 border-[#5c403b] bg-[#0f0e0d] px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#ac8883] uppercase tracking-wider gap-4">
        <div className="flex items-center gap-3">
          <span
            className="w-2 h-2 bg-[#ff5541] inline-block"
            aria-hidden="true"
          />
          <span>{'KAIZEN // DISCIPLINED CONTINUOUS IMPROVEMENT'}</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <Link
            href="/register"
            className="text-[#cac6bd] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            Create account
          </Link>
          <span className="text-[#5c403b]">|</span>
          <Link
            href="/login"
            className="text-[#cac6bd] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            Sign in
          </Link>
          <span className="text-[#5c403b]">|</span>
          <a
            href="https://github.com/madaanpratham80-cpu/Kaizen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#cac6bd] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5541]"
          >
            GitHub
          </a>
          <span className="text-[#5c403b]">|</span>
          <span>© 2026 KAIZEN</span>
        </div>
      </footer>
    </div>
  );
}
