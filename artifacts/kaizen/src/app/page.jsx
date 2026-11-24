'use client';

import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { auth, errorMessage } from '../auth/client.js';

export default function HomePage() {
  const [, navigate] = useLocation();
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState('');

  async function handleGuestLogin() {
    setGuestLoading(true);
    setGuestError('');
    try {
      // Set the instant evaluation guest cookie
      document.cookie = 'kaizen_guest=true; path=/; max-age=86400; SameSite=Lax';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('kaizen_guest_mode', 'true');
      }
      // Route immediately into the operational dashboard
      navigate('/today');
    } catch (err) {
      setGuestError('Guest access initialization failed. Try again.');
      setGuestLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#141312] text-[#e6e1df] font-['DM_Sans',sans-serif] selection:bg-[#ff5541] selection:text-[#5c0000]">
      {/* TOP TICKER BAR */}
      <header className="border-b-2 border-[#5c403b] bg-[#0f0e0d] px-6 py-3 flex items-center justify-between text-xs font-mono uppercase tracking-widest text-[#ac8883]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-[#c0ce71] font-bold">
            <span className="w-2 h-2 bg-[#c0ce71] inline-block animate-pulse"></span>
            SYS_STATUS: OPERATIONAL
          </span>
          <span className="hidden md:inline text-[#5c403b]">{'//'}</span>
          <span className="hidden md:inline">DISCIPLINE ARCHITECTURE: V.1.0</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden sm:inline">CADENCE: SYNCHRONIZED</span>
          <Link
            href="/login"
            className="text-[#ff5541] hover:text-white uppercase font-bold transition-none"
          >
            [ LOG IN ]
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col justify-center">
        {/* SUBTITLE DISPATCH */}
        <div className="flex items-center gap-3 text-xs font-mono text-[#ff5541] uppercase tracking-widest font-bold mb-4">
          <span className="bg-[#ff5541] text-[#5c0000] px-2 py-0.5 font-bold">
            DISPATCH .00
          </span>
          <span className="text-[#ac8883]">
            {'// REAL-WORLD GAMIFIED PROGRESSION PLATFORM'}
          </span>
        </div>

        {/* MONOLITHIC TITLE BOX */}
        <div className="border-t-2 border-b-2 border-[#5c403b] py-8 my-2">
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter leading-none font-['Space_Grotesk',sans-serif] m-0">
              KAIZEN
            </h1>
            <span className="text-4xl md:text-6xl font-black text-[#c0ce71] tracking-widest font-mono">
              改善
            </span>
          </div>
          <p className="text-xl md:text-2xl uppercase tracking-tight text-[#cac6bd] mt-6 mb-0 font-bold max-w-3xl font-['Space_Grotesk',sans-serif] leading-tight">
            Disciplined continuity with structured recovery. A missed day is a
            clear path back, not punitive failure.
          </p>
        </div>

        {/* ERROR NOTICE IF GUEST LOGIN FAILS */}
        {guestError && (
          <div className="my-4 p-3 border border-[#ff5541] bg-[#1d1b1a] text-[#ffb4a8] font-mono text-xs uppercase">
            {guestError}
          </div>
        )}

        {/* ACTION CARDS (3-COLUMN ABUTTING GRID) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[2px] border-2 border-[#5c403b] bg-[#5c403b] my-8 font-mono">
          {/* PRIMARY CTA */}
          <Link
            href="/register"
            className="group p-6 bg-[#ff5541] text-[#5c0000] uppercase font-bold text-sm tracking-wider flex flex-col justify-between hover:bg-[#e6e1df] hover:text-[#141312] transition-none"
          >
            <span className="text-xs opacity-70 mb-4">{'// NEW DISCIPLE'}</span>
            <span className="text-lg flex items-center justify-between">
              SIGN UP
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </Link>

          {/* SECONDARY CTA */}
          <Link
            href="/login"
            className="group p-6 bg-[#1d1b1a] text-[#e6e1df] uppercase font-bold text-sm tracking-wider flex flex-col justify-between hover:bg-[#2b2a28] transition-none"
          >
            <span className="text-xs text-[#ac8883] mb-4">{'// RETURNING OPERATOR'}</span>
            <span className="text-lg flex items-center justify-between">
              LOG IN
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </Link>

          {/* GUEST ACCESS BUTTON */}
          <button
            type="button"
            onClick={handleGuestLogin}
            disabled={guestLoading}
            className="group p-6 bg-[#0f0e0d] text-[#c0ce71] uppercase font-bold text-sm tracking-wider flex flex-col justify-between hover:bg-[#c0ce71] hover:text-[#141312] transition-none cursor-pointer border-none text-left disabled:opacity-60"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#c0ce71] opacity-80 mb-4">
                {'// INSTANT EVALUATION'}
              </span>
              <span className="bg-[#c0ce71] text-[#2d3400] text-[10px] font-bold px-1.5 py-0.5">
                DEMO
              </span>
            </div>
            <span className="text-lg flex items-center justify-between">
              {guestLoading ? 'INITIALIZING...' : 'GUEST OPERATOR'}
              <span className="text-lg">⚡</span>
            </span>
          </button>
        </div>

        {/* FOUR REWARD SEPARATION METRIC TILES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-[1px] border-2 border-[#5c403b] bg-[#5c403b]">
          {/* XP */}
          <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-[#ac8883] uppercase block mb-1">
                DIMENSION 01
              </span>
              <h3 className="text-sm font-bold font-mono text-[#ffb4a8] uppercase m-0">
                LIFETIME EFFORT (XP)
              </h3>
              <p className="text-xs text-[#cac6bd] mt-2 leading-relaxed">
                Permanent non-depleting lifetime ledger. Unlocks player levels and
                ranks. Never penalized for missing days.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#c0ce71] font-bold">
              [ 100% PERMANENT ]
            </div>
          </div>

          {/* HEALTH */}
          <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-[#ac8883] uppercase block mb-1">
                DIMENSION 02
              </span>
              <h3 className="text-sm font-bold font-mono text-[#ff5541] uppercase m-0">
                ROUTINE STABILITY
              </h3>
              <p className="text-xs text-[#cac6bd] mt-2 leading-relaxed">
                Character health (0–100%) adjusts within controlled daily boundaries.
                Does not wipe lifetime progress.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#ff5541] font-bold">
              [ 0–100% BOUNDED ]
            </div>
          </div>

          {/* STREAK */}
          <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-[#ac8883] uppercase block mb-1">
                DIMENSION 03
              </span>
              <h3 className="text-sm font-bold font-mono text-[#c0ce71] uppercase m-0">
                STREAKS & CONTINUITY
              </h3>
              <p className="text-xs text-[#cac6bd] mt-2 leading-relaxed">
                Consecutive active days fulfilled. Features pre-planned rest days
                that preserve momentum without faking.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#2b2a28] font-mono text-[11px] text-[#c0ce71] font-bold">
              [ REST-PRESERVED ]
            </div>
          </div>

          {/* THREE PILLARS (INVERTED CREAM CARD) */}
          <div className="bg-[#f5f0e6] text-[#141312] p-6 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-[#494740] uppercase block mb-1 font-bold">
                CORE FOUNDATION
              </span>
              <h3 className="text-sm font-bold font-mono text-[#141312] uppercase m-0">
                THREE PILLARS
              </h3>
              <p className="text-xs text-[#32302a] mt-2 leading-relaxed">
                Cognitive (Academics & Study), Physical (Conditioning & Recovery), and
                Craft (Deliberate Practice).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#d2cab9] font-mono text-[11px] text-[#141312] font-bold">
              [ UNIFIED LEDGER ]
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER LEDGER STRIP */}
      <footer className="border-t-2 border-[#5c403b] bg-[#0f0e0d] px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#ac8883] uppercase tracking-wider gap-2">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-[#ff5541] inline-block"></span>
          <span>
            KAIZEN ARCHITECTURAL PLATFORM // BUILT FOR DISCIPLINED CONTINUOUS
            IMPROVEMENT
          </span>
        </div>
        <div>
          <span>AUTONOMOUS LEDGER © 2026</span>
        </div>
      </footer>
    </div>
  );
}