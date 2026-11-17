import { levelProgress } from './progression.js';

const RANK_VERSION = 1;
const RANKS = [
  { level: 20, title: 'Master' },
  { level: 10, title: 'Artisan' },
  { level: 5, title: 'Practitioner' },
  { level: 1, title: 'Initiate' },
];

/**
 * @param {number} totalXp
 * @returns {{title: string, minimumLevel: number, ruleVersion: number}}
 */
export function rankForXp(totalXp) {
  const { level } = levelProgress(totalXp);
  const rank = RANKS.find((candidate) => level >= candidate.level);
  return {
    title: rank.title,
    minimumLevel: rank.level,
    ruleVersion: RANK_VERSION,
  };
}
