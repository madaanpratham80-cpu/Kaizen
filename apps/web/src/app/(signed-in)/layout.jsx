'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { sessionCache } from '../../api/session-cache.js';
import { auth } from '../../auth/client.js';

const routes = [
  ['Today', '/today'],
  ['Quests', '/quests'],
  ['Habits', '/habits'],
  ['Progress', '/progress'],
  ['Profile', '/profile'],
  ['Settings', '/settings'],
  ['Onboarding', '/onboarding'],
];
const sessionChanged =
  'Your session changed. Reload the page before signing out.';

/**
 * @param {{children: import('react').ReactNode}} props
 * @returns {import('react').ReactElement}
 */
export default function SignedInLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [proof, setProof] = useState(
    /** @type {{signal: AbortSignal, csrfToken: string} | null | undefined} */ (
      undefined
    ),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    async function loadProof() {
      try {
        const session = await auth.session(signal);
        if (signal.aborted) return;
        const scope =
          session && sessionCache.forSession(session.feedbackSessionId);
        setProof(
          session?.csrfToken && scope
            ? { signal: scope.signal, csrfToken: session.csrfToken }
            : null,
        );
      } catch {
        if (!signal.aborted) setProof(null);
      }
    }
    void loadProof();
    return () => controller.abort();
  }, []);

  async function signOut() {
    if (busy.current || !proof) return;
    if (proof.signal.aborted) {
      setError(sessionChanged);
      return;
    }
    busy.current = true;
    setPending(true);
    setError('');
    try {
      if ((await auth.logout(proof.csrfToken)) === 'done') {
        router.replace('/login');
      } else {
        setError(sessionChanged);
      }
    } catch {
      setError('Could not sign out. Try again.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="progression-panel mx-auto w-full max-w-6xl space-y-8 px-4 py-6 font-progression">
      <nav
        aria-label="Kaizen"
        className="flex flex-wrap items-baseline gap-6 border-b border-progression-ink pb-4"
      >
        <span className="text-xl font-bold">Kaizen</span>
        {routes.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
            className="underline"
          >
            {label}
          </Link>
        ))}
        <button type="button" disabled={!proof || pending} onClick={signOut}>
          Sign out
        </button>
      </nav>
      {proof === null && (
        <p role="alert">
          Could not verify your session for sign-out. Reload the page to try
          again.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {children}
    </div>
  );
}
