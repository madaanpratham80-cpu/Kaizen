import { AuthForm } from './auth-form.jsx';

/** @param {{ mode: 'login' | 'register' }} props */
export function AuthPage({ mode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface font-body-md text-body-md text-on-surface [color-scheme:dark]">
      <header className="border-b border-outline-variant px-margin py-space-sm text-right font-label-mono-sm text-label-mono-sm tracking-widest text-tertiary uppercase md:px-margin-tablet lg:px-margin-desktop">
        Account access
      </header>
      <main className="flex flex-1 items-center justify-center px-margin md:px-margin-tablet lg:px-margin-desktop">
        <div className="flex w-full max-w-[440px] flex-col gap-space-lg py-space-xl">
          <div className="flex flex-col gap-space-xs border-t border-surface-bright pt-space-lg">
            <p className="font-headline-lg text-headline-lg uppercase">
              Kaizen
            </p>
            <p className="font-label-mono-sm text-label-mono-sm text-secondary uppercase">
              {'// Continuous discipline'}
            </p>
          </div>
          <AuthForm mode={mode} />
        </div>
      </main>
      <div
        aria-hidden="true"
        className="h-7 border-t border-outline-variant bg-surface-container-lowest"
      />
    </div>
  );
}
