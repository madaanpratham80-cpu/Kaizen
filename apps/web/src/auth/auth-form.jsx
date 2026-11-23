'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, errorMessage } from './client.js';

export function AuthForm({ mode }) {
  const router = useRouter();
  const registering = mode === 'register';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('male');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  function handleAutoFillDemo() {
    setEmail('disciple42@kaizen.local');
    setPassword('KaizenDisciple2026!');
    setDisplayName('DISCIPLE #042');
    setGender('male');
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPending(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        throw new Error('Please enter a valid operator email address.');
      }

      if (password.length < 12) {
        throw new Error('Passphrase must be at least 12 characters (e.g. KaizenDisciple2026!).');
      }

      const timezone =
        typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
          : 'UTC';

      if (registering) {
        const finalDisplayName = displayName.trim() || cleanEmail.split('@')[0].toUpperCase();
        await auth.register({
          email: cleanEmail,
          password,
          displayName: finalDisplayName,
          gender,
          timezone,
        });
        setSuccessNotice('ACCOUNT INITIALIZED // OPENING OPERATIONAL DOSSIER...');
      } else {
        await auth.login({
          email: cleanEmail,
          password,
        });
        setSuccessNotice('AUTHENTICATED // ACCESSING TERMINAL...');
      }

      // Small delay for brutalist visual confirmation
      setTimeout(() => {
        router.push('/today');
      }, 500);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col border-2 border-[#5c403b] bg-[#0f0e0d] text-[#e6e1df] font-mono selection:bg-[#ff5541] selection:text-[#5c0000]">
      {/* TERMINAL TOP STATUS BAR */}
      <div className="border-b-2 border-[#5c403b] bg-[#1d1b1a] px-4 py-2.5 flex items-center justify-between text-[11px] uppercase tracking-wider text-[#ac8883]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#ff5541] inline-block animate-pulse"></span>
          <span className="text-[#e6e1df] font-bold">TERMINAL ACCESS GATEWAY</span>
        </div>
        <span className="text-[#c0ce71] font-bold">CIPHER: AES-256-GCM</span>
      </div>

      {/* MODE SWITCHER TABS (ABUTTING BLOCKS) */}
      <div className="grid grid-cols-2 border-b-2 border-[#5c403b] bg-[#5c403b] gap-[1px] text-xs font-bold uppercase">
        <Link
          href="/register"
          className={`p-4 text-center transition-none ${
            registering
              ? 'bg-[#ff5541] text-[#5c0000]'
              : 'bg-[#0f0e0d] text-[#cac6bd] hover:bg-[#1d1b1a]'
          }`}
        >
          // 01 SIGN UP
        </Link>
        <Link
          href="/login"
          className={`p-4 text-center transition-none ${
            !registering
              ? 'bg-[#ff5541] text-[#5c0000]'
              : 'bg-[#0f0e0d] text-[#cac6bd] hover:bg-[#1d1b1a]'
          }`}
        >
          // 02 LOG IN
        </Link>
      </div>

      {/* ALERT MESSAGES */}
      {error && (
        <div className="m-4 p-3 border-2 border-[#ff5541] bg-[#1d1b1a] text-[#ffb4a8] text-xs uppercase leading-relaxed">
          <span className="font-bold block mb-0.5">⚠ ACCESS DENIED:</span>
          {error}
        </div>
      )}

      {successNotice && (
        <div className="m-4 p-3 border-2 border-[#c0ce71] bg-[#1d1b1a] text-[#c0ce71] text-xs uppercase font-bold">
          ✓ {successNotice}
        </div>
      )}

      {/* FORM FIELDS */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {registering && (
          <div>
            <label className="block text-xs text-[#ac8883] uppercase mb-1 font-bold">
              [ 01 ] Operator Callsign / Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="E.G. ALEXANDER CHEN"
              className="w-full bg-[#141312] border border-[#5c403b] px-3.5 py-2.5 text-sm text-white uppercase focus:border-[#ff5541] focus:outline-none placeholder:text-[#5c403b]"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-[#ac8883] uppercase mb-1 font-bold">
            {registering ? '[ 02 ]' : '[ 01 ]'} Operator Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="disciple@kaizen.local"
            className="w-full bg-[#141312] border border-[#5c403b] px-3.5 py-2.5 text-sm text-white focus:border-[#ff5541] focus:outline-none placeholder:text-[#5c403b]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-[#ac8883] uppercase font-bold">
              {registering ? '[ 03 ]' : '[ 02 ]'} Access Passphrase
            </label>
            <span className="text-[10px] text-[#ac8883]">MIN. 12 CHARS</span>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••••••"
            className="w-full bg-[#141312] border border-[#5c403b] px-3.5 py-2.5 text-sm text-white focus:border-[#ff5541] focus:outline-none placeholder:text-[#5c403b]"
          />
        </div>

        {registering && (
          <div>
            <label className="block text-xs text-[#ac8883] uppercase mb-1 font-bold">
              [ 04 ] Biometric Profile Representation
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs uppercase">
              <button
                type="button"
                onClick={() => setGender('male')}
                className={`p-3 border text-center cursor-pointer transition-none ${
                  gender === 'male'
                    ? 'border-[#ff5541] bg-[#1d1b1a] text-white font-bold'
                    : 'border-[#5c403b] bg-[#141312] text-[#cac6bd]'
                }`}
              >
                MALE AVATAR
              </button>
              <button
                type="button"
                onClick={() => setGender('female')}
                className={`p-3 border text-center cursor-pointer transition-none ${
                  gender === 'female'
                    ? 'border-[#ff5541] bg-[#1d1b1a] text-white font-bold'
                    : 'border-[#5c403b] bg-[#141312] text-[#cac6bd]'
                }`}
              >
                FEMALE AVATAR
              </button>
            </div>
          </div>
        )}

        {/* DEMO AUTOFILL SHORTCUT */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAutoFillDemo}
            className="w-full py-2 bg-[#1d1b1a] border border-[#5c403b] text-[#c0ce71] hover:bg-[#2b2a28] text-xs uppercase tracking-wider font-bold transition-none cursor-pointer"
          >
            ⚡ AUTO-FILL DEMO CREDENTIALS (DISCIPLE #042)
          </button>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-4 bg-[#ff5541] text-[#5c0000] font-bold text-sm uppercase tracking-wider hover:bg-white hover:text-black transition-none cursor-pointer disabled:opacity-60 shadow-lg mt-2"
        >
          {pending
            ? 'AUTHENTICATING CIPHER...'
            : registering
              ? 'SIGN UP →'
              : 'LOG IN →'}
        </button>

        {/* FOOTER SWITCHER LINK */}
        <div className="text-center pt-2 text-xs text-[#ac8883] uppercase">
          {registering ? (
            <span>
              ALREADY REGISTERED?{' '}
              <Link href="/login" className="text-[#ff5541] underline font-bold">
                ACCESS TERMINAL
              </Link>
            </span>
          ) : (
            <span>
              NEED AN ACCOUNT?{' '}
              <Link href="/register" className="text-[#ff5541] underline font-bold">
                INITIALIZE ACCOUNT
              </Link>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
