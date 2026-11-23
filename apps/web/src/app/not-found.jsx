import Link from 'next/link';

const shortcuts = [
  { href: '/habits', label: 'Habits' },
  { href: '/progress', label: 'Progress' },
  { href: '/profile', label: 'Profile' },
];

/** @returns {import('react').ReactElement} */
export default function NotFound() {
  return (
    <main className="kaizen-404-theme grid min-h-dvh place-items-center bg-background bg-[linear-gradient(to_right,var(--kaizen-404-border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--kaizen-404-border-subtle)_1px,transparent_1px)] bg-size-[3rem_3rem] px-margin py-space-xl font-body-lg text-body-lg text-on-surface">
      <div className="w-full max-w-xl">
        <section
          aria-labelledby="not-found-title"
          className="border-2 border-primary-container bg-surface-container-low"
        >
          <header className="flex flex-wrap items-center justify-between gap-space-sm bg-primary-container px-space-md py-space-md font-label-mono-md text-label-mono-md text-on-primary-fixed uppercase sm:px-space-lg">
            <p>Archival query failed</p>
            <p className="bg-surface-container-lowest px-space-sm py-space-xs text-primary-container">
              [ Archival fault ]
            </p>
          </header>
          <div className="space-y-space-lg p-space-md sm:p-space-xl">
            <h1
              id="not-found-title"
              className="flex flex-wrap items-baseline gap-x-space-md gap-y-space-xs uppercase"
            >
              <span className="font-display-xl text-display-lg sm:text-display-xl">
                404
              </span>{' '}
              <span className="font-headline-sm text-headline-sm">
                Record not found
              </span>
            </h1>
            <p className="text-secondary">
              The requested page could not be found.
            </p>
            <div className="space-y-space-sm border border-404-border-subtle bg-background p-space-md font-label-mono-md text-label-mono-md">
              <p className="border-b border-404-border-subtle pb-space-sm text-muted uppercase">
                Route diagnostics
              </p>
              <dl className="grid gap-space-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Reference error</dt>
                  <dd className="text-primary-container">UNKNOWN_ROUTE</dd>
                </div>
                <div>
                  <dt className="text-muted">HTTP status</dt>
                  <dd>404 Not Found</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-col gap-space-sm font-label-mono-md text-label-mono-md uppercase sm:flex-row">
              <Link
                href="/today"
                prefetch={false}
                className="flex-1 border border-primary-container bg-primary-container px-space-md py-space-md text-center font-bold text-on-primary-fixed hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span aria-hidden="true">← </span>Return to Today’s Ledger
              </Link>
              <Link
                href="/quests"
                prefetch={false}
                className="border border-404-border-strong bg-404-surface-container px-space-md py-space-md text-center hover:bg-404-surface-container-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Quests
              </Link>
            </div>
          </div>
        </section>
        <nav
          aria-label="Shortcuts"
          className="mt-space-lg flex flex-wrap justify-center gap-x-space-lg gap-y-space-sm font-label-mono-md text-label-mono-md text-secondary uppercase"
        >
          {shortcuts.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className="underline decoration-404-border-strong underline-offset-4 hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
