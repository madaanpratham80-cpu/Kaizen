'use client';

import {
  settingsSaveResponseSchema,
  settingsSchema,
  z,
} from '@kaizen/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { screenApi } from '../../../api/client.js';
import { ScreenNotice, SessionScreen } from '../../../api/session-screen.jsx';
import { useCalendarRead } from '../../../api/use-calendar-read.js';
import { ApiError, requestApi } from '../../../auth/client.js';

const SAVE_TIMEOUT_MS = 15_000;
const MAX_GOALS = 8;
const TZ_HELP =
  "Timezone changes apply to future unopened days only. Today's plan keeps its current timezone.";
const fields = ['displayName', 'timezone', 'goals'];
const timezoneErrors = new Set([
  'TIMEZONE_CHANGE_PENDING',
  'CALENDAR_NOT_READY',
]);

/** @typedef {import('../../../api/session-screen.jsx').ScreenSession} Session */
/** @typedef {import('../../../api/session-screen.jsx').SessionScope} Scope */
/** @typedef {Awaited<ReturnType<typeof screenApi.profile>>} Profile */
/** @typedef {z.infer<typeof settingsSchema>} Settings */
/** @typedef {z.infer<typeof settingsSaveResponseSchema>['data']} SavedSettings */

/** @param {z.ZodError['issues']} issues */
function validationMessages(issues) {
  return Object.fromEntries(
    issues.map(({ path, message }) => [path[0] ?? 'form', message]),
  );
}

/** @param {ApiError} error @param {Settings} changes */
function rejectedSettings(error, changes) {
  if (timezoneErrors.has(error.code)) return { timezone: error.message };
  const submitted = Object.keys(changes);
  if (error.code === 'INVALID_INPUT' && submitted.length === 1)
    return { [submitted[0]]: error.message };
  return { form: error.message };
}

/**
 * @param {{profile: Profile, session: Session, scope: Scope, unavailable: boolean, expire: () => void}} props
 */
function SettingsForm({ profile, session, scope, unavailable, expire }) {
  const [draft, setDraft] = useState(/** @type {Settings} */ ({}));
  const [saved, setSaved] = useState(
    /** @type {{value: SavedSettings, source: Profile} | null} */ (null),
  );
  const [messages, setMessages] = useState({});
  const [saving, setSaving] = useState(false);
  const lifetime = useRef(null);
  const busy = useRef(false);
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = AbortSignal.any([scope.signal, controller.signal]);
    return () => controller.abort();
  }, [scope.signal]);

  const current = saved?.source === profile ? saved.value.user : profile.user;
  const pendingTimezone = saved?.value.pendingTimezone;
  const awaitingTimezone =
    pendingTimezone && pendingTimezone.timezone !== current.timezone;
  const values = { ...current, ...draft };
  const changedFields = fields.filter((field) => {
    if (field !== 'goals') return values[field] !== current[field];
    return JSON.stringify(values.goals) !== JSON.stringify(current.goals);
  });
  const dirty = changedFields.length > 0;

  /** @param {keyof Settings} field @param {string | string[]} value */
  function edit(field, value) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setMessages((previous) => ({
      ...previous,
      [field]: undefined,
      form: undefined,
    }));
  }

  /** @param {import('react').FormEvent<HTMLFormElement>} event */
  async function save(event) {
    event.preventDefault();
    if (busy.current || unavailable || !dirty || lifetime.current?.aborted)
      return;
    const changes = Object.fromEntries(
      changedFields.map((field) => [field, values[field]]),
    );
    const parsed = settingsSchema.safeParse(changes);
    if (!parsed.success) {
      setMessages(validationMessages(parsed.error.issues));
      return;
    }

    const signal = lifetime.current;
    if (!signal) return;
    busy.current = true;
    setSaving(true);
    setMessages({});
    try {
      const { body } = await requestApi(
        'settings',
        settingsSaveResponseSchema,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': session.csrfToken,
          },
          body: JSON.stringify(parsed.data),
          signal: AbortSignal.any([
            signal,
            AbortSignal.timeout(SAVE_TIMEOUT_MS),
          ]),
        },
      );
      if (signal.aborted) return;
      setSaved({ value: body.data, source: profileRef.current });
      setDraft({});
    } catch (error) {
      if (signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) expire();
      else if (error instanceof ApiError && error.status < 500)
        setMessages(rejectedSettings(error, parsed.data));
      else
        setMessages({
          form:
            navigator.onLine === false
              ? 'You’re offline. Reconnect to try again.'
              : error instanceof z.ZodError
                ? 'The server returned an invalid settings response.'
                : 'Could not save settings. Try again.',
        });
    } finally {
      busy.current = false;
      if (!signal.aborted) setSaving(false);
    }
  }

  return (
    <form onSubmit={save} aria-busy={saving} className="max-w-xl space-y-4">
      {messages.form && <p role="alert">{messages.form}</p>}
      <fieldset disabled={saving || unavailable} className="space-y-4">
        <div>
          <label className="auth-label" htmlFor="settings-display-name">
            Display name
          </label>
          <input
            id="settings-display-name"
            name="displayName"
            className="block w-full border p-2"
            value={values.displayName}
            onChange={(event) => edit('displayName', event.target.value)}
            aria-invalid={Boolean(messages.displayName)}
            aria-describedby={
              messages.displayName ? 'settings-display-name-error' : undefined
            }
          />
          {messages.displayName && (
            <p id="settings-display-name-error" role="alert">
              {messages.displayName}
            </p>
          )}
        </div>
        <div>
          <label className="auth-label" htmlFor="settings-timezone">
            Timezone
          </label>
          <input
            id="settings-timezone"
            name="timezone"
            className="block w-full border p-2"
            value={values.timezone}
            onChange={(event) => edit('timezone', event.target.value)}
            aria-invalid={Boolean(messages.timezone)}
            aria-describedby={
              messages.timezone
                ? 'settings-timezone-help settings-timezone-error'
                : 'settings-timezone-help'
            }
          />
          <p id="settings-timezone-help">{TZ_HELP}</p>
          {messages.timezone && (
            <p id="settings-timezone-error" role="alert">
              {messages.timezone}
            </p>
          )}
          {awaitingTimezone && (
            <p>
              Pending timezone: {pendingTimezone.timezone} on{' '}
              <time dateTime={pendingTimezone.effectiveDate}>
                {pendingTimezone.effectiveDate}
              </time>
              .
            </p>
          )}
        </div>
        <fieldset
          className="space-y-2"
          aria-describedby={messages.goals ? 'settings-goals-error' : undefined}
        >
          <legend className="font-semibold">Goals</legend>
          {values.goals.map((goal, index) => (
            <div key={index} className="space-y-1">
              <label className="auth-label">
                Goal {index + 1}
                <input
                  value={goal}
                  onChange={(event) =>
                    edit(
                      'goals',
                      values.goals.map((item, position) =>
                        position === index ? event.target.value : item,
                      ),
                    )
                  }
                  aria-invalid={Boolean(messages.goals)}
                  aria-describedby={
                    messages.goals ? 'settings-goals-error' : undefined
                  }
                />
              </label>
              <button
                type="button"
                aria-label={`Remove goal ${index + 1}`}
                className="underline"
                onClick={() =>
                  edit(
                    'goals',
                    values.goals.filter((_, position) => position !== index),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          {messages.goals && (
            <p id="settings-goals-error" role="alert">
              {messages.goals}
            </p>
          )}
          <button
            type="button"
            className="underline"
            disabled={values.goals.length >= MAX_GOALS}
            onClick={() => edit('goals', [...values.goals, ''])}
          >
            Add goal
          </button>
        </fieldset>
        <button
          type="submit"
          className="auth-button"
          disabled={saving || unavailable || !dirty}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </fieldset>
      {saved && !dirty && <p role="status">Settings saved.</p>}
    </form>
  );
}

/** @param {{session: Session, scope: Scope, revision: number, expire: () => void}} props */
function SettingsRead({ session, scope, revision, expire }) {
  const read = useCallback(
    async (signal) => {
      try {
        return await screenApi.profile(signal);
      } catch (error) {
        if (
          !signal.aborted &&
          error instanceof ApiError &&
          error.status === 401
        )
          expire();
        throw error;
      }
    },
    [expire],
  );
  const { data, state, retry } = useCalendarRead(
    session,
    scope,
    revision,
    'settings:profile',
    read,
  );

  if (state === 'expired-session') return <ScreenNotice state={state} />;
  return (
    <>
      {state && (
        <ScreenNotice
          state={state}
          retry={state === 'loading' ? undefined : retry}
        />
      )}
      {data && (
        <SettingsForm
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
export function SettingsScreen() {
  const [expired, setExpired] = useState(false);
  const expire = useCallback(() => setExpired(true), []);
  return (
    <main className="space-y-6">
      <h1 className="text-4xl font-bold">Settings</h1>
      {expired ? (
        <ScreenNotice state="expired-session" />
      ) : (
        <SessionScreen>
          {(session, scope, revision) => (
            <SettingsRead
              session={session}
              scope={scope}
              revision={revision}
              expire={expire}
            />
          )}
        </SessionScreen>
      )}
    </main>
  );
}
