'use client';

import Link from 'next/link';
import { AuthForm } from './auth-form.jsx';

/** @param {{ mode: 'login' | 'register' }} props */
export function AuthPage({ mode }) {
  const registering = mode === 'register';

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#141312] text-[#e6e1df] font-['DM_Sans',sans-serif] selection:bg-[#ff5541] selection:text-[#5c0000]">
      {/* TOP TICKER BAR */}
      <header className="border-b-2 border-[#5c403b] bg-[#0f0e0d] px-6 py-3 flex items-center justify-between text-xs font-mono uppercase tracking-widest text-[#ac8883]">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-[#c0ce71] font-bold hover:text-white">
            <span className="w-2 h-2 bg-[#c0ce71] inline-block animate-pulse"></span>
            KAIZEN // 改善
          </Link>
          <span className="hidden md:inline text-[#5c403b]">{'//'}</span>
          <span className="hidden md:inline">SECURITY REGIME: ACTIVE</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-[#ac8883] hover:text-[#ff5541] uppercase font-bold transition-none"
          >
            ← [ RETURN TO MAIN DISPATCH ]
          </Link>
        </div>
      </header>

      {/* MAIN AUTH CONTAINER */}
      <main className="flex-1 max-w-xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        {/* BRANDING HEADER */}
        <div className="mb-6 border-b-2 border-[#5c403b] pb-4">
          <div className="flex items-center gap-3 text-xs font-mono text-[#ff5541] uppercase tracking-widest font-bold mb-2">
            <span className="bg-[#ff5541] text-[#5c0000] px-2 py-0.5">
              {registering ? 'DISPATCH .01' : 'DISPATCH .02'}
            </span>
            <span className="text-[#ac8883]">
              {registering
                ? '// INITIALISE ACCOUNT'
                : '// ACCESS TERMINAL WITH EXISTING ACCOUNT'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-[#e6e1df] font-['Space_Grotesk',sans-serif] m-0">
              {registering
                ? 'INITIALISE ACCOUNT'
                : 'ACCESS TERMINAL WITH EXISTING ACCOUNT'}
            </h1>
            <span className="text-3xl font-black text-[#c0ce71] font-mono">改善</span>
          </div>
          <p className="font-mono text-xs text-[#cac6bd] mt-2 uppercase">
            Disciplined continuity requires an established operator ledger.
          </p>
        </div>

        {/* AUTH FORM CARD */}
        <AuthForm mode={mode} />
      </main>

      {/* FOOTER STRIP */}
      <footer className="border-t-2 border-[#5c403b] bg-[#0f0e0d] px-6 py-4 flex items-center justify-between text-xs font-mono text-[#ac8883] uppercase tracking-wider">
        <span>SECURITY ENCLAVE // CANONICAL LEDGER ACCRUAL</span>
        <span>© 2026 KAIZEN</span>
      </footer>
    </div>
  );
}
