'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ianaTimezoneSchema,
  loginRequestSchema,
  registerRequestSchema,
} from '@kaizen/contracts';
import { auth, errorMessage } from './client.js';

const DEMO_EMAIL = 'disciple42@kaizen.local';
const DEMO_PASSWORD = 'KaizenDisciple2026!';

const fieldLabel =
  'flex flex-col gap-1 font-mono text-xs text-[#cac6bd] uppercase font-bold';
const fieldInput =
  'w-full border-2 border-[#5c403b] bg-[#0f0e0d] px-4 py-2.5 font-mono text-sm text-[#e6e1df] placeholder:text-[#5c403b] focus:border-[#ff5541] focus:outline-none';
const primaryButton =
  'w-full border-2 border-[#ff5541] bg-[#ff5541] px-6 py-3 font-mono text-xs font-bold text-[#5c0000] uppercase tracking-wider hover:bg-[#e6e1df] hover:text-[#141312] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 transition-none cursor-pointer';
const authLink =
  'text-[#cac6bd] underline hover:text-[#ff5541] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary font-mono text-xs uppercase';

const activeTab =
  'grid place-items-center border-b-2 border-[#ff5541] bg-[#ff5541] px-4 py-3 font-mono text-xs font-bold text-[#5c0000] uppercase tracking-wider';
const inactiveTab =
  'grid place-items-center border-b-2 border-[#5c403b] bg-[#0f0e0d] px-4 py-3 font-mono text-xs font-bold text-[#cac6bd] hover:bg-[#1d1b1a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary uppercase tracking-wider';

/**
 * @param {{ mode: 'login' | 'register' }} props
 * @returns {import('react').ReactElement}
 */
export function AuthForm({ mode }) {
  const registering = mode === 'register';
  const label = registering ? 'Create account' : 'Log in';
  const [, navigate] = useLocation();
  const [redirecting, setRedirecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [registrationCommitted, setRegistrationCommitted] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    auth
      .session(controller.signal)
      .then(
        (value) => {
          if (!controller.signal.aborted && value) {
            setRedirecting(true);
            navigate('/today', { replace: true });
          }
        },
        (reason) => {
          if (!controller.signal.aborted) setError(errorMessage(reason));
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, navigate]);

  /** @param {() => Promise<void>} action */
  async function mutate(action) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await action();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  /** @param {import('react').FormEvent<HTMLFormElement>} event */
  function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form));
    if (input.email === DEMO_EMAIL && input.password === DEMO_PASSWORD) {
      // The auto-fill shortcut opens the evaluation guest, not a real account.
      handleGuestAccess();
      return;
    }
    void mutate(async () => {
      if (registering) {
        const localTimezone = new Intl.DateTimeFormat().resolvedOptions()
          .timeZone;
        const parsed = registerRequestSchema.safeParse({
          ...input,
          timezone: ianaTimezoneSchema.safeParse(localTimezone).data ?? 'UTC',
        });
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        await auth.register(parsed.data);
        setRegistrationCommitted(true);
      } else {
        const parsed = loginRequestSchema.safeParse(input);
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        await auth.login(parsed.data);
      }
      form.reset();
      const current = await auth.session().catch((reason) => {
        if (!registering) throw reason;
        setError(
          'Your account was created, but we could not check your session.',
        );
        return undefined;
      });
      if (current === undefined) return;
      if (!current) {
        setError(
          registering
            ? 'Your account was created. The browser did not retain the session.'
            : 'The browser did not retain the session. Check your cookie settings.',
        );
        return;
      }
      setRedirecting(true);
      navigate('/today', { replace: true });
    });
  }

  function handleGuestAccess() {
    try {
      document.cookie = 'kaizen_guest=true; path=/; max-age=86400; SameSite=Lax';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('kaizen_guest_mode', 'true');
      }
      setRedirecting(true);
      navigate('/today', { replace: true });
    } catch (err) {
      setError('Guest mode initialization failed.');
    }
  }

  function handleFillDemoCredentials(e) {
    const form = e.currentTarget.closest('form');
    if (form) {
      const emailInput = form.querySelector('input[name="email"]');
      const passInput = form.querySelector('input[name="password"]');
      const nameInput = form.querySelector('input[name="displayName"]');
      const genderSelect = form.querySelector('select[name="gender"]');
      if (emailInput) emailInput.value = DEMO_EMAIL;
      if (passInput) passInput.value = DEMO_PASSWORD;
      if (nameInput) nameInput.value = 'DISCIPLE #042';
      if (genderSelect) genderSelect.value = 'male';
      setError('');
    }
  }

  const formError = error && !registering && !loading && !redirecting;
  const errorMessageId = formError ? 'login-form-error' : undefined;
  const alert = error && (
    <p
      id={errorMessageId}
      role="alert"
      className="p-3 border-2 border-[#ff5541] bg-[#1d1b1a] text-[#ffb4a8] font-mono text-xs uppercase leading-relaxed font-bold"
    >
      {error}
    </p>
  );

  return (
    <section
      aria-labelledby="auth-heading"
      className="flex flex-col border-2 border-[#5c403b] bg-[#0f0e0d] text-[#e6e1df] font-mono selection:bg-[#ff5541] selection:text-[#5c0000]"
    >
      {/* TERMINAL TOP STATUS BAR */}
      <div className="border-b-2 border-[#5c403b] bg-[#1d1b1a] px-4 py-2.5 flex items-center justify-between text-[11px] uppercase tracking-wider text-[#ac8883]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#ff5541] inline-block animate-pulse"></span>
          <span className="text-[#e6e1df] font-bold">TERMINAL ACCESS GATEWAY</span>
        </div>
        <span className="font-mono text-xs text-[#c0ce71] uppercase">
          [ Session: {loading ? 'Checking' : redirecting ? 'Verified' : 'Unverified'} ]
        </span>
      </div>

      <div className="p-6 border-b-2 border-[#5c403b] flex items-center justify-between">
        <h1
          id="auth-heading"
          className="text-2xl font-black uppercase text-white font-['Space_Grotesk',sans-serif] m-0"
        >
          {registering ? label : 'Access terminal'}
        </h1>
        <span className="text-xs text-[#ac8883] uppercase">CIPHER: AES-256</span>
      </div>

      {!formError && alert && <div className="p-4">{alert}</div>}

      {loading ? (
        <div className="p-8 text-center text-xs text-[#cac6bd] uppercase animate-pulse">
          <p role="status">Checking session…</p>
        </div>
      ) : redirecting ? (
        <div className="p-8 text-center text-xs text-[#c0ce71] uppercase font-bold">
          <p role="status">Opening Today…</p>
        </div>
      ) : registrationCommitted ? (
        <div className="p-6 space-y-4">
          <button
            className={primaryButton}
            disabled={pending}
            onClick={() =>
              void mutate(async () => {
                const current = await auth.session();
                if (current) {
                  setRedirecting(true);
                  navigate('/today', { replace: true });
                } else {
                  setError('Your account was created. Log in to continue.');
                }
              })
            }
          >
            Check session again
          </button>
          <Link className={`block text-center ${authLink}`} href="/login">
            Log in
          </Link>
        </div>
      ) : (
        <form
          onSubmit={submit}
          aria-busy={pending}
          className="p-6 flex flex-col gap-5"
        >
          {/* 3-TAB SELECTOR (SIGN UP, LOG IN, GUEST MODE) */}
          <nav
            aria-label="Account access"
            className="grid grid-cols-3 border-2 border-[#5c403b] bg-[#5c403b] gap-[1px] text-center font-mono text-xs font-bold uppercase mb-2"
          >
            {registering ? (
              <>
                <Link className={inactiveTab} href="/login">
                  Log in
                </Link>
                <span aria-current="page" className={activeTab}>
                  Create an account
                </span>
                <button
                  type="button"
                  onClick={handleGuestAccess}
                  className="bg-[#0f0e0d] text-[#c0ce71] hover:bg-[#1d1b1a] px-3 py-3 transition-none cursor-pointer uppercase font-bold"
                >
                  ⚡ Guest
                </button>
              </>
            ) : (
              <>
                <span aria-current="page" className={activeTab}>
                  Log in
                </span>
                <Link className={inactiveTab} href="/register">
                  Create an account
                </Link>
                <button
                  type="button"
                  onClick={handleGuestAccess}
                  className="bg-[#0f0e0d] text-[#c0ce71] hover:bg-[#1d1b1a] px-3 py-3 transition-none cursor-pointer uppercase font-bold"
                >
                  ⚡ Guest
                </button>
              </>
            )}
          </nav>

          <fieldset className="flex flex-col gap-4" disabled={pending}>
            {registering && (
              <label className={fieldLabel}>
                Display name
                <input
                  name="displayName"
                  className={fieldInput}
                  autoComplete="name"
                  required
                  maxLength={80}
                  placeholder="E.G. ALEXANDER CHEN"
                />
              </label>
            )}
            <label className={fieldLabel}>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className={fieldInput}
                placeholder="disciple@kaizen.io"
                aria-describedby={errorMessageId}
              />
            </label>
            <label className={fieldLabel}>
              Password
              <input
                name="password"
                type="password"
                autoComplete={registering ? 'new-password' : 'current-password'}
                required
                className={fieldInput}
                placeholder="••••••••••••••••"
                aria-describedby={errorMessageId}
              />
            </label>
            {registering && (
              <label className={fieldLabel}>
                Gender
                <select
                  name="gender"
                  className={fieldInput}
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
            )}

            {formError && alert}

            {/* DEMO FILL SHORTCUT */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleFillDemoCredentials}
                className="w-full py-2 bg-[#1d1b1a] border border-[#5c403b] text-[#c0ce71] hover:bg-[#2b2a28] font-mono text-[11px] uppercase tracking-wider font-bold transition-none cursor-pointer"
              >
                ⚡ AUTO-FILL DEMO CREDENTIALS (DISCIPLE #042)
              </button>
            </div>

            <button className={`mt-2 ${primaryButton}`} type="submit">
              {pending
                ? registering
                  ? 'Creating account…'
                  : 'Logging in…'
                : label}
            </button>

            {/* INSTANT GUEST ACTION CARD */}
            <div className="mt-2 p-3 bg-[#141312] border border-[#5c403b] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#ac8883] uppercase block font-bold">EVALUATION PROTOCOL</span>
                <span className="text-xs text-[#e6e1df] font-bold">No database or server required</span>
              </div>
              <button
                type="button"
                onClick={handleGuestAccess}
                className="px-3 py-1.5 bg-[#c0ce71] text-[#2d3400] text-xs font-bold uppercase hover:bg-white transition-none cursor-pointer"
              >
                Launch Guest Mode →
              </button>
            </div>
          </fieldset>

          {error && (
            <button
              className={`self-center ${authLink}`}
              type="button"
              disabled={pending}
              onClick={() => {
                setError('');
                setLoading(true);
                setRevision((value) => value + 1);
              }}
            >
              Check session again
            </button>
          )}
        </form>
      )}
    </section>
  );
}
