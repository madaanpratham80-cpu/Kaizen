export const QUEST_RULE_VERSION = 1;
export const REWARD_XP = { EASY: 10, MEDIUM: 20, HARD: 35 };

const pillars = {
  Academic: 'Cognitive',
  Physical: 'Physical',
  Productivity: 'Craft',
  Language: 'Craft',
};

/**
 * @param {{title: string, category: keyof typeof pillars}} input
 * @returns {{title: string, category: string, pillar: string}}
 */
export function questFields({ title, category }) {
  return { title, category, pillar: pillars[category] };
}
