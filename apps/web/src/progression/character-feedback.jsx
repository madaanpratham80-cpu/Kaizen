'use client';

import Image from 'next/image';
import { gsap } from 'gsap';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  HEALTH_BANDS,
  healthBandFor,
  normalizePercent,
} from './health-band.js';
import { claimFeedbackEvents, setFeedbackSession } from './feedback-session.js';

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const BAR_DURATION_SECONDS = 0.4;
const MAX_VALUE = 100;
const DEFAULT_PORTRAIT = '/today-portrait.jpg';
const SEAL_TITLES = {
  'seven-day-warrior': 'Seven-Day Warrior',
  'iron-will': 'Iron Will',
  'hundred-gates': 'Hundred Gates',
};

/** @typedef {{health: number, totalXp: number, stateVersion: number}} Snapshot */
/** @typedef {Snapshot & {status: string, eventIds?: string[], seals?: {code: string, bonusXp: number}[]}} Completion */

function subscribeToMotion(listener) {
  const media = window.matchMedia?.(MOTION_QUERY);
  media?.addEventListener('change', listener);
  return () => media?.removeEventListener('change', listener);
}
const prefersReducedMotion = () =>
  window.matchMedia?.(MOTION_QUERY).matches ?? true;
const serverPrefersReducedMotion = () => true;

function FeedbackMeter({ label, value, fill, color, poster }) {
  return (
    <div>
      <p className="progression-value">
        {label} {value}%
      </p>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={MAX_VALUE}
        aria-valuenow={value}
        aria-valuetext={`${value}%`}
        className={`h-2 overflow-hidden ${poster ? 'bg-surface-bright' : 'bg-progression-track'}`}
      >
        <span
          ref={fill}
          aria-hidden="true"
          className={`character-meter-fill ${color}`}
          style={{ '--feedback-scale': value / MAX_VALUE }}
        />
      </div>
    </div>
  );
}

function Gesture({ band }) {
  return (
    <div
      className="character-gesture"
      data-health-band={band}
      aria-hidden="true"
    >
      <div className="character-gesture__body" />
      <div className="character-gesture__head">
        <i />
        <i />
        <span />
      </div>
    </div>
  );
}

function sealDetails(completion) {
  // The transaction returns the completion event first, then one event per seal.
  return (completion.seals ?? []).flatMap(({ code, bonusXp }, index) => {
    const eventId = completion.eventIds[index + 1];
    return eventId
      ? [{ eventId, title: SEAL_TITLES[code] ?? code, bonusXp }]
      : [];
  });
}

function SessionFeedback({
  sessionId,
  snapshot,
  completion,
  poster,
  portraitSrc,
}) {
  const reduced = useSyncExternalStore(
    subscribeToMotion,
    prefersReducedMotion,
    serverPrefersReducedMotion,
  );
  const committed =
    completion?.status === 'completed' &&
    completion.eventIds?.length &&
    completion.stateVersion >= snapshot.stateVersion
      ? completion
      : null;
  const incoming = committed ?? snapshot;
  const [latest, setLatest] = useState(incoming);
  if (incoming.stateVersion > latest.stateVersion) setLatest(incoming);
  const shown = incoming.stateVersion > latest.stateVersion ? incoming : latest;
  const feedback =
    committed?.stateVersion === shown.stateVersion ? committed : null;

  const health = normalizePercent(shown.health);
  const xp = shown.totalXp % MAX_VALUE;
  const band = healthBandFor(health);
  const previousVersion = useRef(null);
  const healthFill = useRef(null);
  const xpFill = useRef(null);
  const [reveals, setReveals] = useState([]);
  const eventId =
    shown.status === 'completed' ? shown.eventIds?.[0] : undefined;

  useLayoutEffect(() => {
    const unseen =
      eventId && claimFeedbackEvents(sessionId, [eventId]).size > 0;
    const isNewCompletion =
      unseen &&
      previousVersion.current !== null &&
      shown.stateVersion > previousVersion.current;
    previousVersion.current = shown.stateVersion;
    const healthTarget = { scaleX: health / MAX_VALUE };
    const xpTarget = { scaleX: xp / MAX_VALUE };
    if (!isNewCompletion || reduced) {
      gsap.set(healthFill.current, healthTarget);
      gsap.set(xpFill.current, xpTarget);
      return;
    }
    const timeline = gsap.timeline({
      defaults: { duration: BAR_DURATION_SECONDS, ease: 'power2.out' },
    });
    timeline
      .to(healthFill.current, healthTarget, 0)
      .to(xpFill.current, xpTarget, 0);
    return () => timeline.kill();
  }, [eventId, health, xp, shown.stateVersion, reduced, sessionId]);

  useEffect(() => {
    if (!feedback) return;
    let active = true;
    // Claim after the effect settles so Strict Mode's setup/cleanup cannot consume a reveal.
    queueMicrotask(() => {
      if (!active) return;
      const seals = sealDetails(feedback);
      const ids = claimFeedbackEvents(
        sessionId,
        seals.map(({ eventId }) => eventId),
      );
      const fresh = seals.filter(({ eventId }) => ids.has(eventId));
      if (fresh.length) setReveals((previous) => [...previous, ...fresh]);
    });
    return () => {
      active = false;
    };
  }, [sessionId, feedback]);

  const { label, color } = HEALTH_BANDS[band];
  return (
    <section
      aria-label="Character feedback"
      className={
        poster
          ? 'bg-surface text-on-surface'
          : 'progression-panel space-y-progression border border-progression-ink bg-progression-paper p-progression font-progression'
      }
    >
      {poster && (
        <div className="border-b-2 border-outline-variant">
          <p className="border-b border-outline-variant px-space-lg py-space-sm font-label-mono-md text-label-mono-md text-outline uppercase">
            Character dossier
          </p>
          <div className="relative aspect-square min-h-64 border-4 border-outline-variant bg-surface-container-lowest sm:aspect-[9/10]">
            <Image
              src={portraitSrc}
              alt=""
              fill
              sizes="(min-width: 1024px) 32vw, (min-width: 640px) 42vw, 100vw"
              className={
                portraitSrc === DEFAULT_PORTRAIT
                  ? 'object-cover object-center grayscale contrast-150 brightness-90'
                  : 'object-cover object-[center_32%]'
              }
              unoptimized
            />
          </div>
        </div>
      )}
      <div
        className={
          poster
            ? 'space-y-space-lg p-space-lg sm:p-margin-desktop'
            : 'contents'
        }
      >
        <div className={poster ? 'text-tertiary' : color}>
          {poster ? (
            <>
              <p className="flex flex-wrap items-center justify-between gap-space-sm border-b border-outline-variant pb-space-sm font-label-mono-md text-label-mono-md uppercase">
                <span className="text-outline">Vitality level</span>
                <span className="bg-tertiary px-space-sm text-on-tertiary">
                  {label}
                </span>
              </p>
              <p
                aria-hidden="true"
                className="py-space-md font-display-xl text-display-xl-mobile text-on-surface tabular-nums xl:text-display-xl"
              >
                {health}%
              </p>
            </>
          ) : (
            <>
              <Gesture band={band} />
              <p className="font-semibold">{label}</p>
            </>
          )}
          <FeedbackMeter
            label="Health"
            value={health}
            fill={healthFill}
            color={poster ? 'text-tertiary' : color}
            poster={poster}
          />
        </div>
        <p
          className={
            poster
              ? 'border-t border-outline-variant pt-space-md font-headline-md text-headline-md'
              : undefined
          }
        >
          Level {1 + Math.floor(shown.totalXp / MAX_VALUE)} · {shown.totalXp} XP
        </p>
        <FeedbackMeter
          label="XP toward next level"
          value={xp}
          fill={xpFill}
          color={poster ? 'text-primary-container' : 'text-progression-ink'}
          poster={poster}
        />
      </div>
      <div aria-live="polite" aria-relevant="additions">
        {reveals.map(({ eventId: id, title, bonusXp }) => (
          <p key={id}>
            <strong>{title}</strong> · {bonusXp} XP earned
          </p>
        ))}
      </div>
    </section>
  );
}

/**
 * @param {{sessionId: string | null, snapshot: Snapshot, completion?: {sessionId: string, result: Completion} | null, poster?: boolean, portraitSrc?: string}} props
 * Capture the completion's session when submitting the mutation. The snapshot belongs to the current session.
 * @returns {import('react').ReactElement | null}
 */
export function CharacterFeedback({
  sessionId,
  snapshot,
  completion,
  poster = false,
  portraitSrc = DEFAULT_PORTRAIT,
}) {
  useEffect(() => setFeedbackSession(sessionId), [sessionId]);
  if (!sessionId) return null;
  return (
    <SessionFeedback
      key={sessionId}
      sessionId={sessionId}
      snapshot={snapshot}
      poster={poster}
      portraitSrc={portraitSrc}
      completion={
        completion?.sessionId === sessionId ? completion.result : null
      }
    />
  );
}
