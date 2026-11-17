/**
 * @param {{children: import('react').ReactNode}} props
 * @returns {import('react').ReactElement}
 */
export default function SignedInLayout({ children }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-6">{children}</div>;
}
