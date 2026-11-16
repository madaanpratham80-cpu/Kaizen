import './globals.css';

/**
 * @param {Readonly<{ children: import('react').ReactNode }>} props
 * @returns {import('react').ReactElement}
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
