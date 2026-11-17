const HEALTHY_MINIMUM = 70;
const TIRED_MINIMUM = 40;
const FULL_PERCENT = 100;

/**
 * @param {number | null | undefined} value
 * @returns {number | null}
 */
export function normalizePercent(value) {
  return Number.isFinite(value)
    ? Math.round(Math.min(FULL_PERCENT, Math.max(0, value)))
    : null;
}

/**
 * @param {number | null | undefined} health
 * @returns {'healthy' | 'tired' | 'fading' | null}
 */
export function healthBandFor(health) {
  const percent = normalizePercent(health);
  if (percent === null) return null;
  if (percent >= HEALTHY_MINIMUM) return 'healthy';
  return percent >= TIRED_MINIMUM ? 'tired' : 'fading';
}
