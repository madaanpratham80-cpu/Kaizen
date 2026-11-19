import Link from 'next/link';

/**
 * @param {{children: import('react').ReactNode}} props
 * @returns {import('react').ReactElement}
 */
export default function SignedInLayout({ children }) {
  return (
    <div className="progression-panel mx-auto w-full max-w-6xl space-y-8 px-4 py-6 font-progression">
      <nav
        aria-label="Kaizen"
        className="flex items-baseline gap-6 border-b border-progression-ink pb-4"
      >
        <span className="text-xl font-bold">Kaizen</span>
        <Link href="/today" className="underline">
          Today
        </Link>
        <Link href="/quests" className="underline">
          Quests
        </Link>
        <Link href="/habits" className="underline">
          Habits
        </Link>
        <Link href="/progress" className="underline">
          Progress
        </Link>
      </nav>
      {children}
    </div>
  );
}
