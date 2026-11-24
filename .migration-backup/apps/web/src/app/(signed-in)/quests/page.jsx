import { STIX_Two_Text } from 'next/font/google';
import { QuestsScreen } from './screen.jsx';

const displayFont = STIX_Two_Text({
  subsets: ['latin'],
  weight: '700',
  style: 'normal',
  variable: '--font-quests-display',
  preload: false,
  adjustFontFallback: false,
});

/** @returns {import('react').ReactElement} */
export default function QuestsPage() {
  return <QuestsScreen className={displayFont.variable} />;
}
