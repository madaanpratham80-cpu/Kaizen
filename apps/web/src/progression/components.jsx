import { healthBandFor, normalizePercent } from './health-band.js';

const XP_PER_LEVEL = 100;
const COMPLETE_PERCENT = 100;
const HEALTH_BANDS = {
  healthy: { label: 'Healthy', color: 'text-health-healthy' },
  tired: { label: 'Tired', color: 'text-health-tired' },
  fading: { label: 'Fading', color: 'text-health-fading' },
};
const PANEL =
  'progression-panel space-y-progression-gap border border-progression-ink bg-progression-paper p-progression font-progression';

function ratio(value, target) {
  return Number.isFinite(value) && Number.isFinite(target) && target > 0
    ? normalizePercent((value / target) * COMPLETE_PERCENT)
    : null;
}

function Percentage({ label, value, meter = false }) {
  return (
    <div className="space-y-progression-gap">
      <p className="progression-value">
        {label} {value === null ? 'unavailable' : `${value}%`}
      </p>
      {meter && value !== null && (
        <meter
          className="progression-meter"
          min={0}
          max={COMPLETE_PERCENT}
          value={value}
          aria-label={label}
          aria-valuetext={`${value}%`}
        />
      )}
    </div>
  );
}

/**
 * @param {{health?: number | null}} props
 * @returns {import('react').ReactElement}
 */
export function HealthBar({ health }) {
  const band = HEALTH_BANDS[healthBandFor(health)];
  return (
    <div className={`${PANEL} ${band?.color ?? ''}`}>
      <p className="font-semibold">{band?.label ?? 'Health'}</p>
      {band && (
        <Percentage label="Health" value={normalizePercent(health)} meter />
      )}
      {!band && (
        <p className="progression-value">Health percentage unavailable</p>
      )}
    </div>
  );
}

/**
 * @param {{level?: number, xpIntoLevel?: number | null}} props
 * @returns {import('react').ReactElement}
 */
export function XPMeter({ level, xpIntoLevel }) {
  return (
    <div className={PANEL}>
      <p className="font-semibold">
        {Number.isInteger(level) && level > 0 ? `XP · Level ${level}` : 'XP'}
      </p>
      <Percentage
        label="XP toward next level"
        value={ratio(xpIntoLevel, XP_PER_LEVEL)}
        meter
      />
    </div>
  );
}

/**
 * @param {{days?: number | null, milestoneDays?: number | null}} props
 * @returns {import('react').ReactElement}
 */
export function StreakBadge({ days, milestoneDays }) {
  return (
    <div className={PANEL}>
      <p className="font-semibold">
        {Number.isInteger(days) && days >= 0
          ? `Streak · ${days} ${days === 1 ? 'day' : 'days'}`
          : 'Streak'}
      </p>
      <Percentage
        label={
          milestoneDays > 0
            ? `${milestoneDays}-day milestone`
            : 'Streak milestone'
        }
        value={ratio(days, milestoneDays)}
      />
    </div>
  );
}

/**
 * @param {{title: string, earned?: boolean, bonusXp?: number, progress?: number, threshold?: number}} props
 * @returns {import('react').ReactElement}
 */
export function SealBadge({ title, earned, bonusXp, progress, threshold }) {
  const milestone = ratio(progress, threshold);
  const percentage =
    earned === true
      ? COMPLETE_PERCENT
      : (milestone ?? (earned === false && threshold == null ? 0 : null));
  return (
    <div className={PANEL}>
      <p className="font-semibold">{title}</p>
      <p>
        {earned === true
          ? 'Earned'
          : earned === false
            ? 'Locked'
            : 'Seal status unavailable'}
        {earned && Number.isFinite(bonusXp) ? ` · ${bonusXp} XP` : ''}
      </p>
      <Percentage
        label={threshold > 0 ? 'Seal milestone' : 'Seal earned'}
        value={percentage}
      />
    </div>
  );
}

/**
 * @param {{title: string, status?: string, target?: number, completedCount?: number, difficulty?: string, rewardXp?: number}} props
 * @returns {import('react').ReactElement}
 */
export function QuestCard({
  title,
  status,
  target,
  completedCount,
  difficulty,
  rewardXp,
}) {
  const targetProgress = ratio(completedCount, target);
  const completed = status === 'COMPLETED';
  const pending = status === 'PENDING';
  const percent =
    targetProgress ?? (completed ? COMPLETE_PERCENT : pending ? 0 : null);
  return (
    <article className={PANEL}>
      <h3 className="font-semibold">{title}</h3>
      {(difficulty || Number.isFinite(rewardXp)) && (
        <p>
          {[difficulty, Number.isFinite(rewardXp) ? `${rewardXp} XP` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
      <p>
        {completed
          ? 'Completed'
          : pending
            ? 'Pending'
            : 'Quest status unavailable'}
      </p>
      <Percentage
        label={
          targetProgress === null ? 'Quest completion' : 'Quest target progress'
        }
        value={percent}
      />
    </article>
  );
}
