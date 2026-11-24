const XP_PER_LEVEL = 100;
const HEALTH_PER_DAY = 5;
const MAX_HEALTH = 100;
const STREAK_SEAL_THRESHOLD = 7;
const LIFETIME_SEAL_THRESHOLD = 100;
const SEAL_BONUS_XP = 25;
const SEAL_RULE_VERSION = 1;

/** @typedef {'OPEN' | 'ACTIVE' | 'MISSED' | 'REST' | 'EMPTY'} DayStatus */
/** @typedef {{status: DayStatus, plannedCount: number, completedPlannedCount: number, health: number}} DayHealth */
/** @typedef {{currentStreak: number, bestStreak: number, recoveryPending: boolean}} Streak */

function appliesPlannedHealth({ status, plannedCount }) {
  return plannedCount > 0 && status !== 'REST' && status !== 'EMPTY';
}

function applyHealthDelta(health, delta) {
  const nextHealth = Math.max(0, Math.min(MAX_HEALTH, health + delta));
  return { health: nextHealth, healthDelta: nextHealth - health };
}

/**
 * @param {{rewardXp: number}} occurrence
 * @returns {number} XP from the immutable occurrence snapshot.
 */
export function completionXp({ rewardXp }) {
  return rewardXp;
}

/**
 * @param {number} totalXp
 * @returns {{level: number, xpIntoLevel: number}}
 */
export function levelProgress(totalXp) {
  return {
    level: 1 + Math.floor(totalXp / XP_PER_LEVEL),
    xpIntoLevel: totalXp % XP_PER_LEVEL,
  };
}

/**
 * @param {DayHealth & {planned: boolean, healthGainAccounted: number}} input
 * @returns {{health: number, healthDelta: number, healthGainAccounted: number}}
 */
export function healthOnCompletion(input) {
  const { health, healthGainAccounted, plannedCount, completedPlannedCount } =
    input;
  if (!input.planned || !appliesPlannedHealth(input)) {
    return { health, healthDelta: 0, healthGainAccounted };
  }
  const allowance = Math.floor(
    (HEALTH_PER_DAY * completedPlannedCount) / plannedCount,
  );
  const accounted = Math.max(healthGainAccounted, allowance);
  // The full allowance is spent even if some of the gain was clamped.
  return {
    ...applyHealthDelta(health, accounted - healthGainAccounted),
    healthGainAccounted: accounted,
  };
}

/**
 * @param {DayHealth} input
 * @returns {{health: number, healthDelta: number}}
 */
export function healthOnClose(input) {
  const { health, plannedCount, completedPlannedCount } = input;
  if (!appliesPlannedHealth(input)) return { health, healthDelta: 0 };
  const missed = plannedCount - completedPlannedCount;
  return applyHealthDelta(
    health,
    -Math.ceil((HEALTH_PER_DAY * missed) / plannedCount),
  );
}

/**
 * @param {Streak} state Recovery is pending if the last meaningful day was missed.
 * @param {{from: DayStatus, to: DayStatus, planned?: boolean}} transition
 * @returns {Streak & {activated: boolean, recovered: boolean}}
 */
export function transitionStreak(
  { currentStreak, bestStreak, recoveryPending },
  { from, to, planned },
) {
  if (from === 'OPEN' && to === 'ACTIVE' && planned) {
    const nextStreak = currentStreak + 1;
    return {
      currentStreak: nextStreak,
      bestStreak: Math.max(bestStreak, nextStreak),
      recoveryPending: false,
      activated: true,
      recovered: recoveryPending,
    };
  }
  if (from === 'OPEN' && to === 'MISSED') {
    return {
      currentStreak: 0,
      bestStreak,
      recoveryPending: true,
      activated: false,
      recovered: false,
    };
  }
  return {
    currentStreak,
    bestStreak,
    recoveryPending,
    activated: false,
    recovered: false,
  };
}

/**
 * @param {{currentStreak: number, lifetimeCompletions: number, activated: boolean, recovered: boolean, unlockedCodes: Iterable<string>}} input
 * @returns {{code: string, ruleVersion: number, bonusXp: number}[]}
 */
export function eligibleSeals({
  currentStreak,
  lifetimeCompletions,
  activated,
  recovered,
  unlockedCodes,
}) {
  const unlocked = new Set(unlockedCodes);
  const candidates = [
    ['seven-day-warrior', activated && currentStreak >= STREAK_SEAL_THRESHOLD],
    ['iron-will', activated && recovered],
    ['hundred-gates', lifetimeCompletions >= LIFETIME_SEAL_THRESHOLD],
  ];
  return candidates
    .filter(([code, eligible]) => eligible && !unlocked.has(code))
    .map(([code]) => ({
      code,
      ruleVersion: SEAL_RULE_VERSION,
      bonusXp: SEAL_BONUS_XP,
    }));
}
