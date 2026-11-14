import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-lg space-y-5 p-6 sm:py-16">
      <h1 className="text-4xl font-bold tracking-tight">Kaizen</h1>
      <nav aria-label="Account" className="flex gap-5 underline">
        <Link href="/login">Log in</Link>
        <Link href="/register">Create an account</Link>
      </nav>
    </main>
  );
}
