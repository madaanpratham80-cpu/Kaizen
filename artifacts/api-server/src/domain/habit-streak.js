/**
 * @param {Iterable<'COMPLETED' | 'MISSED' | 'PENDING' | null>} history Chronological scheduled-date outcomes.
 * @returns {{current: number, best: number}}
 */
export function habitStreak(history) {
  let current = 0;
  let best = 0;
  for (const outcome of history) {
    if (outcome === 'MISSED') current = 0;
    if (outcome === 'COMPLETED') {
      current += 1;
      best = Math.max(best, current);
    }
  }
  return { current, best };
}
