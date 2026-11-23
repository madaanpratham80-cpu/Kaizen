import { STIX_Two_Text } from 'next/font/google';
import { HabitsScreen } from './screen.jsx';

const displayFont = STIX_Two_Text({
  subsets: ['latin'],
  weight: '700',
  style: 'normal',
  variable: '--font-habits-display',
  preload: false,
  adjustFontFallback: false,
});

/** @returns {import('react').ReactElement} */
export default function HabitsPage() {
  return <HabitsScreen className={displayFont.variable} />;
}
