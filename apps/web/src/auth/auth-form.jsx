'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { loginRequestSchema, registerRequestSchema } from '@kaizen/contracts';
import { auth, errorMessage } from './client.js';

const loginLabel =
  'flex flex-col gap-space-xs font-label-mono-sm text-label-mono-sm text-secondary uppercase';
const loginInput =
  'w-full border border-surface-bright bg-surface-container-lowest px-space-md py-space-sm font-body-md text-body-md text-on-surface placeholder:text-secondary/50 focus:border-primary-container focus:outline-2 focus:outline-primary-container';
const loginButton =
  'w-full border border-primary-container bg-primary-container px-space-lg py-space-md font-label-mono-lg text-label-mono-lg text-on-primary-container uppercase hover:bg-on-surface hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60';
const loginLink =
  'text-secondary underline hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/**
 * @param {{ mode: 'login' | 'register' }} props
 * @returns {import('react').ReactElement}
 */
export function AuthForm({ mode }) {
  const registering = mode === 'register';
  const label = registering ? 'Create account' : 'Log in';
  const [session, setSession] = useState(
    /** @type {Awaited<ReturnType<typeof auth.session>>} */ (null),
  );
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
          if (!controller.signal.aborted) setSession(value);
        },
        (reason) => {
          if (!controller.signal.aborted) setError(errorMessage(reason));
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

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
        const parsed = registerRequestSchema.safeParse(input);
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
      setSession(current);
    });
  }

  const Container = registering ? 'main' : 'div';
  const buttonClass = registering ? 'auth-button' : loginButton;
  const formError = error && !registering && !loading && !session;
  const errorMessageId = formError ? 'login-form-error' : undefined;
  const alert = error && (
    <p
      id={errorMessageId}
      role="alert"
      className={
        registering
          ? 'mb-4 border-l-4 border-[#E63827] pl-3'
          : 'font-label-mono-sm text-label-mono-sm text-error uppercase'
      }
    >
      {error}
    </p>
  );

  return (
    <Container
      className={registering ? 'mx-auto max-w-lg p-6 sm:py-16' : undefined}
    >
      <section
        aria-labelledby="auth-heading"
        className={
          registering
            ? 'border border-[#121110] bg-[#F5F0E6] p-6 text-[#121110] sm:p-9'
            : 'flex flex-col gap-space-lg border border-surface-bright bg-surface-container-low p-space-md sm:p-space-lg'
        }
      >
        {registering ? (
          <h1
            id="auth-heading"
            className="mb-6 text-4xl font-bold tracking-tight"
          >
            {session ? 'Your account' : label}
          </h1>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-space-sm border-b border-surface-bright pb-space-md">
            <h1
              id="auth-heading"
              className="font-headline-md text-headline-md uppercase"
            >
              {session ? 'Your account' : 'Access terminal'}
            </h1>
            <span className="font-label-mono-sm text-label-mono-sm text-primary-container uppercase">
              [ Session:{' '}
              {loading ? 'Checking' : session ? 'Verified' : 'Unverified'} ]
            </span>
          </div>
        )}
        {!formError && alert}
        {loading ? (
          <p role="status">Checking session…</p>
        ) : session ? (
          <div className="space-y-4">
            <p>
              Signed in as <strong>{session.user.displayName}</strong>
            </p>
            <p>{session.user.email}</p>
            <Link
              className={registering ? 'block underline' : `block ${loginLink}`}
              href="/today"
            >
              Open Today
            </Link>
            <button
              className={buttonClass}
              disabled={pending}
              onClick={() =>
                void mutate(async () => {
                  if ((await auth.logout(session.csrfToken)) === 'done') {
                    setSession(null);
                    setRegistrationCommitted(false);
                    return;
                  }
                  const current = await auth.session();
                  setSession(current);
                  if (current)
                    setError(
                      'Your session changed. Check the account and select Log out again.',
                    );
                })
              }
            >
              {pending ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        ) : registrationCommitted ? (
          <div className="space-y-4">
            <button
              className="auth-button"
              disabled={pending}
              onClick={() =>
                void mutate(async () => {
                  const current = await auth.session();
                  setSession(current);
                  if (!current)
                    setError('Your account was created. Log in to continue.');
                })
              }
            >
              Check session again
            </button>
            <Link className="block underline" href="/login">
              Log in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={submit}
            aria-busy={pending}
            className={registering ? undefined : 'flex flex-col gap-space-lg'}
          >
            {!registering && (
              <nav
                aria-label="Account access"
                className="grid grid-cols-2 text-center font-label-mono-md text-label-mono-md uppercase"
              >
                <span
                  aria-current="page"
                  className="grid place-items-center border border-primary-container bg-primary-container px-space-xs py-space-sm font-bold text-on-primary-container"
                >
                  Log in
                </span>
                <Link
                  className="grid place-items-center border border-surface-bright bg-surface px-space-xs py-space-sm text-secondary hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  href="/register"
                >
                  Create an account
                </Link>
              </nav>
            )}
            <fieldset
              className={
                registering ? 'space-y-4' : 'flex flex-col gap-space-md'
              }
              disabled={pending}
            >
              {registering && (
                <label className="auth-label">
                  Display name
                  <input
                    name="displayName"
                    autoComplete="name"
                    required
                    maxLength={80}
                  />
                </label>
              )}
              <label className={registering ? 'auth-label' : loginLabel}>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={registering ? undefined : loginInput}
                  placeholder={registering ? undefined : 'disciple@kaizen.io'}
                  aria-describedby={errorMessageId}
                />
              </label>
              <label className={registering ? 'auth-label' : loginLabel}>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    registering ? 'new-password' : 'current-password'
                  }
                  required
                  className={registering ? undefined : loginInput}
                  aria-describedby={errorMessageId}
                />
              </label>
              {formError && alert}
              {registering && (
                <label className="auth-label">
                  Time zone
                  <input
                    name="timezone"
                    defaultValue="UTC"
                    placeholder="Asia/Kolkata"
                    required
                  />
                </label>
              )}
              <button
                className={
                  registering ? buttonClass : `mt-space-sm ${buttonClass}`
                }
                type="submit"
              >
                {pending
                  ? registering
                    ? 'Creating account…'
                    : 'Logging in…'
                  : label}
              </button>
            </fieldset>
            {registering && (
              <Link className="mt-5 inline-block underline" href="/login">
                Log in
              </Link>
            )}
            {error && (
              <button
                className={
                  registering
                    ? 'ml-4 underline'
                    : `self-center font-label-mono-sm text-label-mono-sm uppercase ${loginLink}`
                }
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
    </Container>
  );
}
