import { DM_Sans, Space_Grotesk, Space_Mono } from 'next/font/google';
import './globals.css';

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-kaizen-grotesk',
  preload: false,
});

const sans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-kaizen-sans',
  preload: false,
});

const mono = Space_Mono({
  subsets: ['latin'],
  style: 'normal',
  weight: ['400', '700'],
  variable: '--font-kaizen-mono',
  preload: false,
});

/**
 * @param {Readonly<{ children: import('react').ReactNode }>} props
 * @returns {import('react').ReactElement}
 */
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${grotesk.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
