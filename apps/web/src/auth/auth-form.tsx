'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { loginRequestSchema, registerRequestSchema } from '@kaizen/contracts';
import { auth, errorMessage } from './client';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const registering = mode === 'register';
  const label = registering ? 'Create account' : 'Log in';
  const [session, setSession] =
    useState<Awaited<ReturnType<typeof auth.session>>>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    auth
      .session(controller.signal)
      .then(
        (value) => {
          if (!controller.signal.aborted) setSession(value);
        },
        (reason: unknown) => {
          if (!controller.signal.aborted) setError(errorMessage(reason));
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  async function mutate(action: () => Promise<void>) {
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

  function submit(event: FormEvent<HTMLFormElement>) {
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
      } else {
        const parsed = loginRequestSchema.safeParse(input);
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        await auth.login(parsed.data);
      }
      form.reset();
      const current = await auth.session();
      if (!current) {
        setError(
          'The browser did not retain the session. Check your cookie settings.',
        );
        return;
      }
      setSession(current);
    });
  }

  return (
    <main className="mx-auto max-w-lg p-6 sm:py-16">
      <section className="border border-[#121110] bg-[#F5F0E6] p-6 text-[#121110] sm:p-9">
        <h1 className="mb-6 text-4xl font-bold tracking-tight">
          {session ? 'Your account' : label}
        </h1>
        {error && (
          <p role="alert" className="mb-4 border-l-4 border-[#E63827] pl-3">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Checking session…</p>
        ) : session ? (
          <div className="space-y-4">
            <p>
              Signed in as <strong>{session.user.displayName}</strong>
            </p>
            <p>{session.user.email}</p>
            <button
              className="auth-button"
              disabled={pending}
              onClick={() =>
                void mutate(async () => {
                  await auth.logout(session.csrfToken);
                  setSession(null);
                })
              }
            >
              {pending ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} aria-busy={pending}>
            <fieldset className="space-y-4" disabled={pending}>
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
              <label className="auth-label">
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="auth-label">
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    registering ? 'new-password' : 'current-password'
                  }
                  required
                />
              </label>
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
              <button className="auth-button" type="submit">
                {pending
                  ? registering
                    ? 'Creating account…'
                    : 'Logging in…'
                  : label}
              </button>
            </fieldset>
            <Link
              className="mt-5 inline-block underline"
              href={registering ? '/login' : '/register'}
            >
              {registering ? 'Log in' : 'Create an account'}
            </Link>
            {error && (
              <button
                className="ml-4 underline"
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
    </main>
  );
}
