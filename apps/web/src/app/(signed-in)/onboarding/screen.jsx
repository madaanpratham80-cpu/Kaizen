'use client';

import {
  createQuestSchema,
  questCategorySchema,
  settingsSaveResponseSchema,
  settingsSchema,
  settingsValidationErrorResponseSchema,
} from '@kaizen/contracts';
import { useEffect, useRef, useState } from 'react';
import { screenApi } from '../../../api/client.js';
import { ScreenState } from '../../../api/screen-state.jsx';
import {
  readFailure,
  ScreenNotice,
  SessionScreen,
} from '../../../api/session-screen.jsx';
import { useCalendarRead } from '../../../api/use-calendar-read.js';
import { ApiError } from '../../../auth/client.js';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1';
const SAVE_TIMEOUT_MS = 15_000;
const MAX_GOALS = 8;
const STARTER_TARGET = 1;
const timezoneHelp =
  "Timezone changes apply to future unopened days only. Today's plan keeps its current timezone.";
const inputStyle = 'block w-full border border-current bg-white p-2';

/** @typedef {import('../../../api/session-screen.jsx').ScreenSession} Session */
/** @typedef {import('../../../api/session-screen.jsx').SessionScope} Scope */
/** @typedef {Awaited<ReturnType<typeof screenApi.profile>>} Profile */
/** @typedef {Awaited<ReturnType<typeof screenApi.createQuest>>} Quest */
/** @typedef {import('@kaizen/contracts').z.infer<typeof settingsSchema>} Settings */
/** @typedef {import('@kaizen/contracts').z.infer<typeof settingsSaveResponseSchema>['data']} SavedSettings */
/** @typedef {import('@kaizen/contracts').z.infer<typeof settingsValidationErrorResponseSchema>['error']['details'][number]} SettingsDetail */
/** @typedef {{path: string, message: string}} FieldIssue */

/**
 * The shared transport exposes only code and message on errors.
 * @param {Settings} input
 * @param {{csrfToken: string, signal: AbortSignal}} options
 */
async function saveSettings(input, { csrfToken, signal }) {
  signal.throwIfAborted();
  const response = await fetch(`${apiBase}/settings`, {
    method: 'PATCH',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(input),
    signal: AbortSignal.any([signal, AbortSignal.timeout(SAVE_TIMEOUT_MS)]),
  });
  signal.throwIfAborted();
  if (response.status === 401) throw new ApiError(401, 'Invalid session.');
  const body = await response.json().catch(() => null);
  if (response.ok)
    return { saved: settingsSaveResponseSchema.parse(body).data };
  if (response.status === 400) {
    const validation = settingsValidationErrorResponseSchema.safeParse(body);
    if (validation.success) return { validation: validation.data.error };
  }
  const message = body?.error?.message;
  throw new ApiError(
    response.status,
    typeof message === 'string' ? message : 'Could not save settings.',
  );
}

/** @param {SettingsDetail} issue */
function settingsIssue({ path, code }) {
  const field = path.join('.');
  if (field === 'displayName')
    return 'Enter a display name of 1 to 80 characters.';
  if (field === 'timezone') return 'Enter a valid IANA timezone, such as UTC.';
  if (field.startsWith('goals.')) return 'Enter a goal of 1 to 80 characters.';
  if (field === 'goals') {
    if (code === 'TOO_BIG') return 'Enter at most eight goals.';
    return 'Check that your goals are valid and distinct.';
  }
  return 'Review the settings before continuing.';
}

/** @param {{field: string, issues: FieldIssue[]}} props */
function FieldErrors({ field, issues }) {
  const messages = issues.filter(({ path }) => path === field);
  if (!messages.length) return null;
  return (
    <ul id={`onboarding-error-${field}`} role="alert">
      {messages.map(({ message }, index) => (
        <li key={index}>{message}</li>
      ))}
    </ul>
  );
}

/** @param {FieldIssue[]} issues @param {string} field @param {string} [hint] */
function errorAttributes(issues, field, hint) {
  const invalid = issues.some(({ path }) => path === field);
  return {
    'aria-invalid': invalid,
    'aria-describedby':
      [hint, invalid && `onboarding-error-${field}`]
        .filter(Boolean)
        .join(' ') || undefined,
  };
}

/** @param {{saved: SavedSettings}} props */
function SavedSummary({ saved }) {
  const { user, pendingTimezone } = saved;
  return (
    <section aria-label="Saved settings" className="space-y-2 border p-4">
      <p className="font-semibold">Settings saved.</p>
      <dl>
        <dt>Display name</dt>
        <dd>{user.displayName}</dd>
        <dt>Current timezone</dt>
        <dd>{user.timezone}</dd>
        <dt>Goals</dt>
        <dd>
          {user.goals.length ? (
            <ul>
              {user.goals.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          ) : (
            <ScreenState state="empty" />
          )}
        </dd>
      </dl>
      {pendingTimezone && (
        <p>
          Pending timezone: {pendingTimezone.timezone} on{' '}
          <time dateTime={pendingTimezone.effectiveDate}>
            {pendingTimezone.effectiveDate}
          </time>
          .
        </p>
      )}
    </section>
  );
}

/** @param {{profile: Profile, session: Session, scope: Scope, unavailable: boolean, expire: () => void}} props */
function OnboardingForm({ profile, session, scope, unavailable, expire }) {
  const [goals, setGoals] = useState(profile.user.goals);
  const [saved, setSaved] = useState(
    /** @type {SavedSettings | null} */ (null),
  );
  const [quest, setQuest] = useState(/** @type {Quest | null} */ (null));
  const [issues, setIssues] = useState(/** @type {FieldIssue[]} */ ([]));
  const [pending, setPending] = useState(null);
  const [failure, setFailure] = useState(null);
  const lifetime = useRef(null);
  const busy = useRef(false);
  const clientId = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = AbortSignal.any([controller.signal, scope.signal]);
    return () => controller.abort();
  }, [scope.signal]);

  /** @param {import('react').FormEvent<HTMLFormElement>} event */
  async function submit(event) {
    event.preventDefault();
    const signal = lifetime.current;
    if (!signal || signal.aborted || busy.current || unavailable || quest)
      return;
    const form = new FormData(event.currentTarget);
    const starter = createQuestSchema.safeParse({
      title: form.get('title'),
      category: form.get('category'),
      effectiveFrom: form.get('effectiveFrom'),
      difficulty: 'EASY',
      target: STARTER_TARGET,
      recurrence: { kind: 'DAILY' },
    });
    const settings = saved
      ? null
      : settingsSchema.safeParse({
          displayName: form.get('displayName'),
          timezone: form.get('timezone'),
          goals,
        });
    const invalid = [
      ...(settings && !settings.success ? settings.error.issues : []),
      ...(!starter.success ? starter.error.issues : []),
    ];
    setIssues(
      invalid.map(({ path, message }) => ({ path: path.join('.'), message })),
    );
    setFailure(null);
    if (!starter.success || settings?.success === false) return;

    const options = { csrfToken: session.csrfToken, signal };
    let settingsCommitted = Boolean(saved);
    busy.current = true;
    try {
      if (settings?.success) {
        setPending('settings');
        const result = await saveSettings(settings.data, options);
        if (signal.aborted) return;
        if (result.validation) {
          setIssues(
            result.validation.details.map((issue) => ({
              path: issue.path.join('.'),
              message: settingsIssue(issue),
            })),
          );
          return;
        }
        settingsCommitted = true;
        setSaved(result.saved);
      }
      setPending('quest');
      clientId.current ??= crypto.randomUUID();
      const created = await screenApi.createQuest(
        { ...starter.data, clientId: clientId.current },
        options,
      );
      if (!signal.aborted) setQuest(created);
    } catch (error) {
      if (signal.aborted) return;
      const state = readFailure(error);
      if (state === 'expired-session') expire();
      else
        setFailure({
          state,
          step: settingsCommitted ? 'quest' : 'settings',
          message: error instanceof ApiError ? error.message : null,
        });
    } finally {
      busy.current = false;
      if (!signal.aborted) setPending(null);
    }
  }

  const disabled = Boolean(pending) || unavailable;
  return (
    <div className="max-w-xl space-y-4">
      {saved && <SavedSummary saved={saved} />}
      {quest ? (
        <p role="status">Starter quest created: {quest.title}.</p>
      ) : (
        <form
          onSubmit={submit}
          aria-busy={Boolean(pending)}
          className="space-y-4"
        >
          {failure && (
            <div className="space-y-1">
              <ScreenState state={failure.state} />
              <p>
                {failure.step === 'quest'
                  ? 'Settings are saved. You can retry creating the starter quest here.'
                  : 'The settings save could not be confirmed.'}
              </p>
              {failure.message && <p>{failure.message}</p>}
            </div>
          )}
          <FieldErrors field="" issues={issues} />
          {!saved && (
            <fieldset disabled={disabled} className="space-y-3">
              <legend className="font-semibold">Your settings</legend>
              <label className="block">
                Display name
                <input
                  name="displayName"
                  className={inputStyle}
                  defaultValue={profile.user.displayName}
                  {...errorAttributes(issues, 'displayName')}
                />
              </label>
              <FieldErrors field="displayName" issues={issues} />
              <label className="block">
                Timezone
                <input
                  name="timezone"
                  className={inputStyle}
                  defaultValue={profile.user.timezone}
                  {...errorAttributes(
                    issues,
                    'timezone',
                    'onboarding-timezone-help',
                  )}
                />
              </label>
              <p id="onboarding-timezone-help">{timezoneHelp}</p>
              <FieldErrors field="timezone" issues={issues} />
              <fieldset
                className="space-y-2"
                {...errorAttributes(issues, 'goals')}
              >
                <legend>Goals</legend>
                {goals.map((goal, index) => {
                  const field = `goals.${index}`;
                  return (
                    <div key={index}>
                      <label className="block">
                        Goal {index + 1}
                        <input
                          className={inputStyle}
                          name={field}
                          value={goal}
                          {...errorAttributes(issues, field)}
                          onChange={(event) =>
                            setGoals((previous) =>
                              previous.map((value, i) =>
                                i === index ? event.target.value : value,
                              ),
                            )
                          }
                        />
                      </label>
                      <FieldErrors field={field} issues={issues} />
                      <button
                        type="button"
                        aria-label={`Remove goal ${index + 1}`}
                        className="underline"
                        onClick={() => {
                          setGoals((previous) =>
                            previous.filter((_, i) => i !== index),
                          );
                          setIssues((previous) =>
                            previous.filter(
                              ({ path }) => !path.startsWith('goals.'),
                            ),
                          );
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                <FieldErrors field="goals" issues={issues} />
                <button
                  type="button"
                  disabled={goals.length >= MAX_GOALS}
                  className="underline"
                  onClick={() => setGoals((previous) => [...previous, ''])}
                >
                  Add goal
                </button>
              </fieldset>
            </fieldset>
          )}
          <fieldset disabled={disabled} className="space-y-3">
            <legend className="font-semibold">Starter quest</legend>
            <label className="block">
              Quest title
              <input
                name="title"
                className={inputStyle}
                {...errorAttributes(issues, 'title')}
              />
            </label>
            <FieldErrors field="title" issues={issues} />
            <label className="block">
              Category
              <select
                name="category"
                className={inputStyle}
                {...errorAttributes(issues, 'category')}
              >
                {questCategorySchema.options.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
            <FieldErrors field="category" issues={issues} />
            <label className="block">
              Start date
              <input
                name="effectiveFrom"
                type="date"
                className={inputStyle}
                {...errorAttributes(issues, 'effectiveFrom')}
              />
            </label>
            <FieldErrors field="effectiveFrom" issues={issues} />
          </fieldset>
          <button className="auth-button" type="submit" disabled={disabled}>
            {pending === 'settings'
              ? 'Saving settings…'
              : pending === 'quest'
                ? 'Creating starter quest…'
                : saved
                  ? 'Retry starter quest'
                  : 'Save settings and create quest'}
          </button>
        </form>
      )}
    </div>
  );
}

/** @param {{session: Session, scope: Scope, revision: number, expire: () => void}} props */
function OnboardingRead({ session, scope, revision, expire }) {
  const { data, state, retry } = useCalendarRead(
    session,
    scope,
    revision,
    'onboarding:profile',
    screenApi.profile,
  );
  return (
    <>
      {state && (
        <ScreenNotice
          state={state}
          retry={state === 'loading' ? undefined : retry}
        />
      )}
      {data && (
        <OnboardingForm
          profile={data}
          session={session}
          scope={scope}
          unavailable={Boolean(state)}
          expire={expire}
        />
      )}
    </>
  );
}

/** @returns {import('react').ReactElement} */
export function OnboardingScreen() {
  const [expired, setExpired] = useState(false);
  return (
    <main className="space-y-6">
      <h1 className="text-4xl font-bold">Onboarding</h1>
      {expired ? (
        <ScreenNotice state="expired-session" />
      ) : (
        <SessionScreen>
          {(session, scope, revision) => (
            <OnboardingRead
              session={session}
              scope={scope}
              revision={revision}
              expire={() => setExpired(true)}
            />
          )}
        </SessionScreen>
      )}
    </main>
  );
}
