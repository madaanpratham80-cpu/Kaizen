'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ianaTimezoneSchema,
  loginRequestSchema,
  registerRequestSchema,
} from '@kaizen/contracts';
import { auth, errorMessage } from './client.js';

const fieldLabel =
  'flex flex-col gap-space-xs font-label-mono-sm text-label-mono-sm text-secondary uppercase';
const fieldInput =
  'w-full border border-surface-bright bg-surface-container-lowest px-space-md py-space-sm font-body-md text-body-md text-on-surface placeholder:text-secondary/50 focus:border-primary-container focus:outline-2 focus:outline-primary-container';
const primaryButton =
  'w-full border border-primary-container bg-primary-container px-space-lg py-space-md font-label-mono-lg text-label-mono-lg text-on-primary-container uppercase hover:bg-on-surface hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60';
const authLink =
  'text-secondary underline hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const activeTab =
  'grid place-items-center border border-primary-container bg-primary-container px-space-xs py-space-sm font-bold text-on-primary-container';
const inactiveTab =
  'grid place-items-center border border-surface-bright bg-surface px-space-xs py-space-sm text-secondary hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/**
 * @param {{ mode: 'login' | 'register' }} props
 * @returns {import('react').ReactElement}
 */
export function AuthForm({ mode }) {
  const registering = mode === 'register';
  const label = registering ? 'Create account' : 'Log in';
  const router = useRouter();
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
            router.replace('/today');
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
  }, [revision, router]);

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
      router.replace('/today');
    });
  }

  const formError = error && !registering && !loading && !redirecting;
  const errorMessageId = formError ? 'login-form-error' : undefined;
  const alert = error && (
    <p
      id={errorMessageId}
      role="alert"
      className="font-label-mono-sm text-label-mono-sm text-error uppercase"
    >
      {error}
    </p>
  );

  return (
    <section
      aria-labelledby="auth-heading"
      className="flex flex-col gap-space-lg border border-surface-bright bg-surface-container-low p-space-md sm:p-space-lg"
    >
      <div className="flex flex-wrap items-center justify-between gap-space-sm border-b border-surface-bright pb-space-md">
        <h1
          id="auth-heading"
          className="font-headline-md text-headline-md uppercase"
        >
          {registering ? label : 'Access terminal'}
        </h1>
        <span className="font-label-mono-sm text-label-mono-sm text-primary-container uppercase">
          [ Session:{' '}
          {loading ? 'Checking' : redirecting ? 'Verified' : 'Unverified'} ]
        </span>
      </div>
      {!formError && alert}
      {loading ? (
        <p role="status">Checking session…</p>
      ) : redirecting ? (
        <p role="status">Opening Today…</p>
      ) : registrationCommitted ? (
        <div className="space-y-4">
          <button
            className={primaryButton}
            disabled={pending}
            onClick={() =>
              void mutate(async () => {
                const current = await auth.session();
                if (current) {
                  setRedirecting(true);
                  router.replace('/today');
                } else {
                  setError('Your account was created. Log in to continue.');
                }
              })
            }
          >
            Check session again
          </button>
          <Link className={`block ${authLink}`} href="/login">
            Log in
          </Link>
        </div>
      ) : (
        <form
          onSubmit={submit}
          aria-busy={pending}
          className="flex flex-col gap-space-lg"
        >
          <nav
            aria-label="Account access"
            className="grid grid-cols-2 text-center font-label-mono-md text-label-mono-md uppercase"
          >
            {registering ? (
              <>
                <Link className={inactiveTab} href="/login">
                  Log in
                </Link>
                <span aria-current="page" className={activeTab}>
                  Create an account
                </span>
              </>
            ) : (
              <>
                <span aria-current="page" className={activeTab}>
                  Log in
                </span>
                <Link className={inactiveTab} href="/register">
                  Create an account
                </Link>
              </>
            )}
          </nav>
          <fieldset className="flex flex-col gap-space-md" disabled={pending}>
            {registering && (
              <label className={fieldLabel}>
                Display name
                <input
                  name="displayName"
                  className={fieldInput}
                  autoComplete="name"
                  required
                  maxLength={80}
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
                placeholder={registering ? undefined : 'disciple@kaizen.io'}
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
            <button className={`mt-space-sm ${primaryButton}`} type="submit">
              {pending
                ? registering
                  ? 'Creating account…'
                  : 'Logging in…'
                : label}
            </button>
          </fieldset>
          {error && (
            <button
              className={`self-center font-label-mono-sm text-label-mono-sm uppercase ${authLink}`}
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
