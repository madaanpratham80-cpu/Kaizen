import { useEffect, useState } from 'react';
import { Redirect } from 'wouter';
import { auth } from './client.js';

// This gate only controls navigation. Express independently authorizes
// every account request and never trusts the browser's guest state.
/** @param {{children: import('react').ReactNode}} props */
export function ProtectedRoute({ children }) {
  const [access, setAccess] = useState('checking');
  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(2000)]);
    auth.session(signal, { allowGuestFallback: false }).then(
      (session) => {
        if (!controller.signal.aborted) setAccess(session ? 'allowed' : 'denied');
      },
      () => {
        if (!controller.signal.aborted) setAccess('denied');
      },
    );
    return () => controller.abort();
  }, []);
  if (access === 'denied') return <Redirect to="/login" replace />;
  if (access === 'allowed') return children;
  return null;
}
