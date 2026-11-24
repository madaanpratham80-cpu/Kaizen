'use client';

import Link from 'next/link';
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ApiError, auth } from '../auth/client.js';
import { ScreenState } from './screen-state.jsx';
import { sessionCache } from './session-cache.js';

const ExpiredSessionContext = createContext(
  /** @type {(() => void) | null} */ (null),
);

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
  const markExpired = useContext(ExpiredSessionContext);
  useLayoutEffect(() => {
    if (state === 'expired-session') markExpired?.();
  }, [markExpired, state]);
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
  const expired = useRef(false);
  const expiryGeneration = useRef(0);
  const markExpired = useCallback(() => {
    expired.current = true;
    expiryGeneration.current += 1;
  }, []);

  useEffect(() => {
    let current;
    async function verify() {
      current?.abort();
      const controller = new AbortController();
      current = controller;
      const { signal } = controller;
      const generation = expiryGeneration.current;
      try {
        const session = await auth.session(signal);
        if (signal.aborted || generation !== expiryGeneration.current) return;
        const scope =
          session && sessionCache.forSession(session.feedbackSessionId);
        expired.current = !scope;
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
        if (signal.aborted || generation !== expiryGeneration.current) return;
        setAccess(null);
        const nextFailure = readFailure(error);
        expired.current = nextFailure === 'expired-session';
        setFailure(nextFailure);
      }
    }
    function verifyOnFocus() {
      if (!expired.current) void verify();
    }
    void verify();
    window.addEventListener('focus', verifyOnFocus);
    window.addEventListener('online', verify);
    return () => {
      current?.abort();
      window.removeEventListener('focus', verifyOnFocus);
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
    <ExpiredSessionContext.Provider value={markExpired}>
      <Fragment key={access.session.feedbackSessionId}>
        {children(access.session, access.scope, access.revision)}
      </Fragment>
    </ExpiredSessionContext.Provider>
  );
}
