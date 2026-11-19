'use client';

import { useEffect, useState } from 'react';
import { screenApi } from './client.js';
import { readFailure } from './session-screen.jsx';

/**
 * @template T
 * @param {import('./session-screen.jsx').ScreenSession} session
 * @param {import('./session-screen.jsx').SessionScope} scope
 * @param {number} revision
 * @param {string} key
 * @param {(signal: AbortSignal) => Promise<T>} read
 * @returns {{data: T | null, state: string | null, retry: () => void}}
 */
export function useCalendarRead(session, scope, revision, key, read) {
  const [loaded, setLoaded] = useState(null);
  const [state, setState] = useState('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, scope.signal]);
    async function load() {
      setState('loading');
      try {
        const today = await screenApi.today(signal);
        let catchingUp = false;
        if (today.status === 'catching-up') {
          if (!signal.aborted) setState('catching-up');
          const sync = await screenApi.syncCalendar(session.csrfToken, {
            signal,
          });
          catchingUp = sync.status === 'catching-up';
        }
        const result = await read(signal);
        if (signal.aborted) return;
        const cached = scope.get(key);
        const accepted =
          result.stateVersion < cached?.stateVersion ? cached : result;
        scope.set(key, accepted);
        setLoaded({ key, data: accepted });
        setState(catchingUp ? 'catching-up' : null);
      } catch (error) {
        if (!signal.aborted) setState(readFailure(error));
      }
    }
    void load();
    return () => controller.abort();
  }, [session.csrfToken, scope, revision, key, read, retry]);
  return {
    data:
      loaded?.key === key && state !== 'expired-session' ? loaded.data : null,
    state,
    retry: () => setRetry((value) => value + 1),
  };
}
