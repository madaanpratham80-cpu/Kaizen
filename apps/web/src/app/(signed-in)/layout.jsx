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
const dossierRoutes = new Set(['/quests', '/habits', '/progress', '/profile']);
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
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(14rem,22.4%)_minmax(0,1fr)]">
      <nav
        aria-label="Kaizen"
        className="flex flex-col border-b border-outline-variant bg-surface-container-lowest text-on-surface lg:sticky lg:top-0 lg:h-dvh lg:overflow-auto lg:border-r lg:border-b-0"
      >
        <div className="border-b border-outline-variant px-space-lg py-space-lg sm:px-margin-desktop">
          <p className="font-headline-lg text-headline-lg uppercase">Kaizen</p>
          <p className="mt-space-xs font-label-mono-sm text-label-mono-sm text-outline uppercase">
            {'// Continuous discipline'}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1">
          {routes.map(([label, href], index) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-space-sm border-b border-outline-variant px-space-md py-space-md font-label-mono-md text-label-mono-md uppercase focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary sm:px-space-lg lg:px-margin-desktop ${active ? 'bg-primary-container font-bold text-on-primary-container focus-visible:outline-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                {index < 5 && (
                  <span
                    aria-hidden="true"
                    className="after:content-[attr(data-route-number)]"
                    data-route-number={`.0${index + 1}`}
                  />
                )}
                {label}
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          className="border-t border-outline-variant px-space-lg py-space-md text-left font-label-mono-md text-label-mono-md text-primary uppercase hover:bg-surface-container-high focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary disabled:opacity-60 lg:mt-auto lg:px-margin-desktop"
          disabled={!proof || pending}
          onClick={signOut}
        >
          Sign out
        </button>
      </nav>
      <div
        className={
          pathname === '/today'
            ? 'min-w-0 text-on-surface'
            : dossierRoutes.has(pathname)
              ? 'min-w-0 bg-surface px-space-sm text-on-surface sm:px-space-lg'
              : 'min-w-0 bg-white p-space-md text-progression-ink sm:p-space-lg'
        }
      >
        {proof === null && (
          <p role="alert" className="p-space-md">
            Could not verify your session for sign-out. Reload the page to try
            again.
          </p>
        )}
        {error && (
          <p role="alert" className="p-space-md">
            {error}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
