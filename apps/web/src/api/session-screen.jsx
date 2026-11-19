'use client';

import Link from 'next/link';
import { Fragment, useEffect, useState } from 'react';
import { ApiError, auth } from '../auth/client.js';
import { ScreenState } from './screen-state.jsx';
import { sessionCache } from './session-cache.js';

/** @typedef {NonNullable<Awaited<ReturnType<typeof auth.session>>>} ScreenSession */
/** @typedef {NonNullable<ReturnType<typeof sessionCache.forSession>>} SessionScope */

/** @param {unknown} error */
export function readFailure(error) {
  if (error instanceof ApiError && error.code === 'STATE_VERSION_MISMATCH')
    return 'version-conflict';
  if (error instanceof ApiError && error.status === 401)
    return 'expired-session';
  return navigator.onLine === false ? 'offline' : 'error';
}

/**
 * @param {{state: Parameters<typeof ScreenState>[0]['state'], retry?: () => void}} props
 */
export function ScreenNotice({ state, retry }) {
  return (
    <div className="space-y-2">
      <ScreenState state={state} />
      {state === 'expired-session' ? (
        <Link className="underline" href="/login">
          Log in
        </Link>
      ) : (
        retry && (
          <button className="auth-button" type="button" onClick={retry}>
            Try again
          </button>
        )
      )}
    </div>
  );
}

/** @param {{children: (session: ScreenSession, scope: SessionScope, revision: number) => import('react').ReactNode}} props */
export function SessionScreen({ children }) {
  const [access, setAccess] = useState(null);
  const [failure, setFailure] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let current;
    async function verify() {
      current?.abort();
      const controller = new AbortController();
      current = controller;
      const { signal } = controller;
      try {
        const session = await auth.session(signal);
        if (signal.aborted) return;
        const scope =
          session && sessionCache.forSession(session.feedbackSessionId);
        setFailure(scope ? null : 'expired-session');
        setAccess((previous) =>
          scope
            ? {
                session,
                scope,
                revision: (previous?.revision ?? 0) + 1,
              }
            : null,
        );
      } catch (error) {
        if (signal.aborted) return;
        setAccess(null);
        setFailure(readFailure(error));
      }
    }
    void verify();
    window.addEventListener('focus', verify);
    window.addEventListener('online', verify);
    return () => {
      current?.abort();
      window.removeEventListener('focus', verify);
      window.removeEventListener('online', verify);
    };
  }, [retry]);

  const scopeSignal = access?.scope.signal;
  useEffect(() => {
    if (!scopeSignal || scopeSignal.aborted) return;
    function retire() {
      setAccess((previous) =>
        previous?.scope.signal === scopeSignal ? null : previous,
      );
    }
    scopeSignal.addEventListener('abort', retire, { once: true });
    return () => scopeSignal.removeEventListener('abort', retire);
  }, [scopeSignal]);

  if (!access || scopeSignal.aborted) {
    return (
      <ScreenNotice
        state={failure ?? 'loading'}
        retry={
          failure
            ? () => {
                setFailure(null);
                setRetry((value) => value + 1);
              }
            : undefined
        }
      />
    );
  }
  return (
    <Fragment key={access.session.feedbackSessionId}>
      {children(access.session, access.scope, access.revision)}
    </Fragment>
  );
}
