'use client';

import {
  settingsSaveResponseSchema,
  settingsSchema,
  settingsValidationErrorResponseSchema,
  z,
} from '@kaizen/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { screenApi } from '../../../api/client.js';
import { ScreenNotice, SessionScreen } from '../../../api/session-screen.jsx';
import { useCalendarRead } from '../../../api/use-calendar-read.js';
import { ApiError, auth } from '../../../auth/client.js';
import { isGuestMode, loadGuestState, saveGuestState } from '../../../api/guest-store.js';

const SAVE_TIMEOUT_MS = 15_000;
const MAX_GOALS = 8;
const TZ_HELP =
  "Timezone changes apply to future unopened days only. Today's plan keeps its current timezone.";
const fields = ['displayName', 'timezone', 'goals'];
const timezoneErrors = new Set([
  'TIMEZONE_CHANGE_PENDING',
  'CALENDAR_NOT_READY',
]);

const PRESET_GOALS = [
  'Master Spectral Theorems & SVD',
  'Maintain 42-day continuous streak',
  'Daily cold recovery cadence',
  'Read 30 pages of systems engineering',
  'Zero unallocated time blocks',
];

const PRESET_TIMEZONES = [
  'UTC',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Australia/Sydney',
];

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

/** @param {import('@kaizen/contracts').z.infer<typeof settingsValidationErrorResponseSchema>['error']} error */
function fieldMessages({ details, message }) {
  const messages = {};
  for (const { path, code } of details) {
    const [field, index] = path;
    const key = path.join('.') || 'form';
    if (field === 'displayName')
      messages[key] = 'Enter a display name of 1 to 80 characters.';
    else if (field === 'timezone')
      messages[key] = 'Enter a valid IANA timezone.';
    else if (field === 'goals' && index !== undefined)
      messages[key] = 'Enter a goal of 1 to 80 characters.';
    else if (field === 'goals')
      messages[key] =
        code === 'TOO_BIG'
          ? 'Enter at most eight goals.'
          : 'Check that your goals are valid and distinct.';
    else messages.form = message;
  }
  return messages;
}

/**
 * @param {{profile: Profile, session: Session, scope: Scope, unavailable: boolean, expire: () => void}} props
 */
function SettingsForm({ profile, session, scope, unavailable, expire }) {
  const [expired, setExpired] = useState(false);
  const [draft, setDraft] = useState(/** @type {Settings} */ ({}));
  const [saved, setSaved] = useState(
    /** @type {{value: SavedSettings, source: Profile} | null} */ (null),
  );
  const [messages, setMessages] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [gender, setGender] = useState('male');
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

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
    setMessages((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(
          ([key]) =>
            key !== 'form' && key !== field && !key.startsWith(field + '.'),
        ),
      ),
    );
  }

  function handleAddPresetGoal(preset) {
    if (values.goals.length >= MAX_GOALS || values.goals.includes(preset)) return;
    edit('goals', [...values.goals, preset]);
  }

  function handleResetProgress() {
    if (typeof window === 'undefined' || !isGuestMode()) return;
    if (
      confirm(
        'CONFIRM RESET: Reset current interval completions back to pending?',
      )
    ) {
      const guestState = loadGuestState();
      saveGuestState({
        ...guestState,
        occurrences: guestState.occurrences.map((o) => ({
          ...o,
          status: 'PENDING',
          completedAt: null,
        })),
      });
      setNotice('Today’s completions were reset to pending.');
    }
  }

  async function handlePurgeSession() {
    if (typeof window === 'undefined') return;
    if (!confirm('CONFIRM PURGE: Clear session state and return to gateway?'))
      return;
    try {
      if ((await auth.logout(session.csrfToken)) === 'done') {
        window.location.href = '/';
      } else {
        setMessages({
          form: 'Your session changed. Reload the page before purging it.',
        });
      }
    } catch {
      setMessages({ form: 'Could not purge the session. Try again.' });
    }
  }

  function handleExportDossier() {
    if (typeof window === 'undefined') return;
    const dossierData = {
      operator: values.displayName,
      timezone: values.timezone,
      goals: values.goals,
      exportedAt: new Date().toISOString(),
      architecture: 'KAIZEN_V1_BRUTALIST',
    };
    const blob = new Blob([JSON.stringify(dossierData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KAIZEN_SETTINGS_${values.displayName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
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

    if (isGuestMode()) {
      // Guests have no server account; their settings live in the browser.
      saveGuestState({ ...loadGuestState(), ...parsed.data });
      setSaved({
        value: { user: { ...current, ...parsed.data }, pendingTimezone: null },
        source: profileRef.current,
      });
      setDraft({});
      return;
    }

    const signal = lifetime.current;
    if (!signal) return;
    busy.current = true;
    setSaving(true);
    setMessages({});

    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1') + '/settings',
        {
          method: 'PATCH',
          credentials: 'include',
          cache: 'no-store',
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
      const body = await response.json().catch(() => null);
      if (signal.aborted) return;
      if (!response.ok) {
        const validation =
          settingsValidationErrorResponseSchema.safeParse(body);
        if (response.status === 400 && validation.success) {
          setMessages(fieldMessages(validation.data.error));
          return;
        }
        if (response.status === 400 && Array.isArray(body?.error?.details)) {
          setMessages({ form: 'Invalid request input.' });
          return;
        }
        throw new ApiError(
          response.status,
          typeof body?.error?.message === 'string'
            ? body.error.message
            : 'Could not save settings.',
          body?.error?.code,
        );
      }
      setSaved({
        value: settingsSaveResponseSchema.parse(body).data,
        source: profileRef.current,
      });
      setDraft({});
    } catch (error) {
      if (signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) {
        setExpired(true);
        expire();
        return;
      }
      else if (error instanceof ApiError && error.status < 500)
        setMessages(rejectedSettings(error, parsed.data));
      else
        setMessages({
          form:
            typeof navigator !== 'undefined' && navigator.onLine === false
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

  if (expired) {
    return <ScreenNotice state="expired-session" />;
  }

  return (
    <div className="flex flex-col w-full bg-[#141312] text-[#e6e1df] font-mono selection:bg-[#ff5541] selection:text-[#5c0000]">
      {/* TOP HEADER DISPATCH */}
      <section className="w-full bg-[#0f0e0d] border-b-2 border-[#5c403b] p-6 lg:p-8">
        <div className="flex items-center gap-3 font-mono text-xs text-[#ac8883] uppercase tracking-wider">
          <span className="text-[#ff5541] font-bold">{'// TERMINAL CONFIGURATION'}</span>
          <span>{'// DISPATCH .06'}</span>
          <span>{'// ARCHIVAL SECURITY'}</span>
        </div>
        <div className="mt-3 flex flex-col md:flex-row md:items-baseline md:gap-6">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[#e6e1df] leading-none m-0 font-['Space_Grotesk',sans-serif]">
            .06 SETTINGS
          </h2>
          <span className="font-mono text-xs uppercase tracking-tight text-[#cac6bd] font-bold mt-1 md:mt-0">
            OPERATOR REPUTATION, TEMPORAL CADENCE, AND PROTOCOL SAFEGUARDS.
          </span>
        </div>
      </section>

      {/* COMMAND METRIC RIBBON */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b-2 border-[#5c403b] bg-[#5c403b] gap-[1px]">
        <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
          <span className="text-[10px] text-[#ac8883] uppercase block mb-1">OPERATOR ID</span>
          <div className="text-2xl font-black text-white truncate">{values.displayName}</div>
          <span className="text-[10px] text-[#c0ce71] uppercase font-bold mt-2 pt-2 border-t border-[#2b2a28]">
            RANK 12 {'//'} DISCIPLE
          </span>
        </div>

        <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
          <span className="text-[10px] text-[#ac8883] uppercase block mb-1">TEMPORAL CADENCE</span>
          <div className="text-2xl font-black text-[#ff5541] truncate">{values.timezone}</div>
          <span className="text-[10px] text-[#ac8883] uppercase font-bold mt-2 pt-2 border-t border-[#2b2a28]">
            SYNCHRONIZED (00:00:00Z)
          </span>
        </div>

        <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
          <span className="text-[10px] text-[#ac8883] uppercase block mb-1">DIRECTIVES ACTIVE</span>
          <div className="text-2xl font-black text-[#c0ce71]">{values.goals.length} OF {MAX_GOALS}</div>
          <span className="text-[10px] text-[#cac6bd] uppercase font-bold mt-2 pt-2 border-t border-[#2b2a28]">
            DISCIPLINED GOALS
          </span>
        </div>

        <div className="bg-[#f5f0e6] text-[#141312] p-6 flex flex-col justify-between">
          <span className="text-[10px] uppercase block mb-1 font-bold text-[#494740]">ACCESS LEVEL</span>
          <div className="text-xl font-black text-[#141312]">GUEST OPERATOR</div>
          <span className="text-[10px] uppercase font-bold text-[#141312] mt-2 pt-2 border-t border-[#d2cab9]">
            [ FULL EVALUATION SCOPE ]
          </span>
        </div>
      </section>

      {/* FORM: DIRECT PARENT OF messages.form FOR CONTRACT TEST */}
      <form onSubmit={save} aria-busy={saving} className="p-6 lg:p-8 space-y-8 max-w-5xl">
        {messages.form && (
          <p role="alert" className="p-3 border-2 border-[#ff5541] bg-[#1d1b1a] text-[#ffb4a8] text-xs uppercase leading-relaxed font-bold">
            {messages.form}
          </p>
        )}

        <fieldset disabled={saving || unavailable} className="space-y-8">
          {/* SECTION 1: IDENTITY */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#5c403b] pb-2 text-xs font-bold text-[#ff5541] uppercase tracking-wider">
              <span>{'// 01'}</span>
              <span>OPERATOR IDENTITY PROTOCOL</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs text-[#cac6bd] uppercase mb-2 font-bold" htmlFor="settings-display-name">
                  Display name
                </label>
                <input
                  id="settings-display-name"
                  name="displayName"
                  type="text"
                  required
                  value={values.displayName}
                  onChange={(event) => edit('displayName', event.target.value)}
                  aria-invalid={Boolean(messages.displayName)}
                  aria-describedby={messages.displayName ? 'settings-display-name-error' : undefined}
                  className="w-full bg-[#0f0e0d] border-2 border-[#5c403b] px-4 py-3 text-sm text-white uppercase focus:border-[#ff5541] focus:outline-none"
                />
                {messages.displayName && (
                  <p id="settings-display-name-error" role="alert" className="text-xs text-[#ffb4a8] mt-1 font-bold uppercase">
                    {messages.displayName}
                  </p>
                )}
                <span className="block text-[10px] text-[#ac8883] uppercase mt-1">
                  PUBLIC CALLSIGN LOGGED ACROSS DISCIPLINE LEDGERS.
                </span>
              </div>

              <div>
                <label className="block text-xs text-[#cac6bd] uppercase mb-2 font-bold">
                  Account Identity
                </label>
                <div className="flex items-center justify-between bg-[#1d1b1a] border-2 border-[#5c403b] px-4 py-3 text-sm text-[#cac6bd]">
                  <span>{session.user.email}</span>
                  <span className="bg-[#c0ce71] text-[#2d3400] text-[10px] font-bold px-2 py-0.5">
                    VERIFIED
                  </span>
                </div>
                <span className="block text-[10px] text-[#ac8883] uppercase mt-1">
                  CANONICAL IMMUTABLE SESSION LEDGER ANCHOR.
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-[#cac6bd] uppercase mb-2 font-bold">
                  Biometric Portrait Representation
                </label>
                <div className="grid grid-cols-2 gap-4 max-w-md text-xs uppercase">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`p-4 border-2 text-left cursor-pointer transition-none ${
                      gender === 'male'
                        ? 'border-[#ff5541] bg-[#1d1b1a] text-white font-bold'
                        : 'border-[#5c403b] bg-[#0f0e0d] text-[#cac6bd] hover:border-[#ac8883]'
                    }`}
                  >
                    <div className="text-base mb-1 text-white">PORTRAIT 01</div>
                    <div className="text-[10px] text-[#ac8883]">DISCIPLE // MALE PROFILE</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`p-4 border-2 text-left cursor-pointer transition-none ${
                      gender === 'female'
                        ? 'border-[#ff5541] bg-[#1d1b1a] text-white font-bold'
                        : 'border-[#5c403b] bg-[#0f0e0d] text-[#cac6bd] hover:border-[#ac8883]'
                    }`}
                  >
                    <div className="text-base mb-1 text-white">PORTRAIT 02</div>
                    <div className="text-[10px] text-[#ac8883]">DISCIPLE // FEMALE PROFILE</div>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: TEMPORAL CADENCE */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#5c403b] pb-2 text-xs font-bold text-[#c0ce71] uppercase tracking-wider">
              <span>{'// 02'}</span>
              <span>TEMPORAL COORDINATES & CADENCE</span>
            </div>

            <div className="max-w-2xl space-y-3">
              <label className="block text-xs text-[#cac6bd] uppercase font-bold" htmlFor="settings-timezone">
                Timezone
              </label>
              <input
                id="settings-timezone"
                name="timezone"
                type="text"
                required
                value={values.timezone}
                onChange={(event) => edit('timezone', event.target.value)}
                aria-invalid={Boolean(messages.timezone)}
                aria-describedby={
                  messages.timezone
                    ? 'settings-timezone-help settings-timezone-error'
                    : 'settings-timezone-help'
                }
                className="w-full bg-[#0f0e0d] border-2 border-[#5c403b] px-4 py-3 text-sm text-white focus:border-[#c0ce71] focus:outline-none"
              />

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[10px] text-[#ac8883] uppercase self-center mr-1">PRESETS:</span>
                {PRESET_TIMEZONES.map((tz) => (
                  <button
                    key={tz}
                    type="button"
                    onClick={() => edit('timezone', tz)}
                    className="px-2.5 py-1 text-[11px] bg-[#1d1b1a] border border-[#5c403b] text-[#cac6bd] hover:text-white hover:border-[#ff5541] transition-none cursor-pointer uppercase"
                  >
                    {tz.split('/').at(-1)}
                  </button>
                ))}
              </div>

              <p id="settings-timezone-help" className="text-xs text-[#cac6bd] p-3 bg-[#1d1b1a] border border-[#5c403b] leading-relaxed">
                {TZ_HELP}
              </p>

              {messages.timezone && (
                <p id="settings-timezone-error" role="alert" className="text-xs text-[#ffb4a8] font-bold uppercase">
                  {messages.timezone}
                </p>
              )}

              {awaitingTimezone && (
                <p className="text-xs text-[#c0ce71] font-bold uppercase p-2 border border-[#c0ce71] bg-[#1d1b1a]">
                  Pending timezone: {pendingTimezone.timezone} on{' '}
                  <time dateTime={pendingTimezone.effectiveDate}>
                    {pendingTimezone.effectiveDate}
                  </time>
                  .
                </p>
              )}
            </div>
          </section>

          {/* SECTION 3: DIRECTIVES (GOALS) */}
          <section className="space-y-4">
            <fieldset
              className="space-y-3"
              aria-describedby={messages.goals ? 'settings-goals-error' : undefined}
            >
              <div className="flex items-center justify-between border-b border-[#5c403b] pb-2 text-xs font-bold uppercase tracking-wider">
                <legend className="font-bold text-[#ff5541] flex items-center gap-2">
                  <span>{'// 03'}</span>
                  <span>Goals</span>
                </legend>
                <span className="text-[#ac8883]">{values.goals.length} OF {MAX_GOALS} SLOTS</span>
              </div>

              <div className="space-y-3">
                {values.goals.map((goal, index) => (
                  <div key={index} className="space-y-1 p-3 bg-[#1d1b1a] border border-[#5c403b]">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex-1 text-xs text-[#cac6bd] uppercase font-bold flex flex-col gap-1">
                        <span>Goal {index + 1}</span>
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
                          aria-invalid={Boolean(
                            messages[`goals.${index}`] || messages.goals,
                          )}
                          aria-describedby={
                            messages[`goals.${index}`]
                              ? `settings-goal-${index}-error`
                              : messages.goals
                                ? 'settings-goals-error'
                                : undefined
                          }
                          className="w-full bg-[#0f0e0d] border border-[#5c403b] px-3.5 py-2 text-sm text-white focus:border-[#ff5541] focus:outline-none"
                        />
                      </label>
                      <button
                        type="button"
                        aria-label={`Remove goal ${index + 1}`}
                        className="text-[#ff5541] hover:text-white uppercase font-bold text-xs cursor-pointer transition-none px-2 py-1"
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
                    {messages[`goals.${index}`] && (
                      <p id={`settings-goal-${index}-error`} role="alert" className="text-xs text-[#ffb4a8] font-bold uppercase">
                        {messages[`goals.${index}`]}
                      </p>
                    )}
                  </div>
                ))}

                {messages.goals && (
                  <p id="settings-goals-error" role="alert" className="text-xs text-[#ffb4a8] font-bold uppercase">
                    {messages.goals}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#2b2a28] text-white hover:bg-[#ff5541] hover:text-black text-xs font-bold uppercase transition-none cursor-pointer disabled:opacity-50"
                    disabled={values.goals.length >= MAX_GOALS}
                    onClick={() => edit('goals', [...values.goals, ''])}
                  >
                    Add goal
                  </button>
                  <span className="text-[11px] text-[#ac8883] uppercase">
                    MAXIMUM 8 DIRECTIVE ANCHORS
                  </span>
                </div>

                {/* RECOMMENDED GOAL CHIPS */}
                <div className="pt-2">
                  <span className="text-[10px] text-[#ac8883] uppercase block mb-1.5 font-bold">
                    RECOMMENDED DISCIPLINE DIRECTIVES (CLICK TO ADD):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_GOALS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={values.goals.length >= MAX_GOALS || values.goals.includes(preset)}
                        onClick={() => handleAddPresetGoal(preset)}
                        className="text-[11px] px-2.5 py-1 bg-[#0f0e0d] border border-[#5c403b] text-[#cac6bd] hover:border-[#c0ce71] hover:text-white transition-none disabled:opacity-40 cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </fieldset>
          </section>

          {/* SECTION 4: APPEARANCE & DESIGN TOKENS */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#5c403b] pb-2 text-xs font-bold text-[#cac6bd] uppercase tracking-wider">
              <span>{'// 04'}</span>
              <span>BRUTALIST VISUAL DESIGN SYSTEM</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-2 border-[#5c403b] bg-[#5c403b] p-[1px]">
              <div className="bg-[#141312] p-3 text-center">
                <div className="w-full h-8 bg-[#141312] border border-[#5c403b] mb-1"></div>
                <div className="text-[10px] font-bold text-white">#141312</div>
                <div className="text-[9px] text-[#ac8883]">OBSIDIAN</div>
              </div>
              <div className="bg-[#141312] p-3 text-center">
                <div className="w-full h-8 bg-[#ff5541] mb-1"></div>
                <div className="text-[10px] font-bold text-white">#FF5541</div>
                <div className="text-[9px] text-[#ac8883]">SIGNAL</div>
              </div>
              <div className="bg-[#141312] p-3 text-center">
                <div className="w-full h-8 bg-[#c0ce71] mb-1"></div>
                <div className="text-[10px] font-bold text-white">#C0CE71</div>
                <div className="text-[9px] text-[#ac8883]">LIME</div>
              </div>
              <div className="bg-[#141312] p-3 text-center">
                <div className="w-full h-8 bg-[#5c403b] mb-1"></div>
                <div className="text-[10px] font-bold text-white">#5C403B</div>
                <div className="text-[9px] text-[#ac8883]">TERRACOTTA</div>
              </div>
              <div className="bg-[#141312] p-3 text-center col-span-2 sm:col-span-1">
                <div className="w-full h-8 bg-[#f5f0e6] mb-1"></div>
                <div className="text-[10px] font-bold text-white">#F5F0E6</div>
                <div className="text-[9px] text-[#ac8883]">PAPER</div>
              </div>
            </div>
          </section>

          {/* SECTION 5: TELEMETRY & FEEDBACK */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#5c403b] pb-2 text-xs font-bold text-[#ac8883] uppercase tracking-wider">
              <span>{'// 05'}</span>
              <span>TELEMETRY & FEEDBACK PREFERENCES</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <label className="flex items-center justify-between p-4 bg-[#1d1b1a] border border-[#5c403b] cursor-pointer">
                <span>AUDIO CONFIRMATIONS ON COMPLETION</span>
                <input
                  type="checkbox"
                  checked={audioFeedback}
                  onChange={(e) => setAudioFeedback(e.target.checked)}
                  className="w-4 h-4 accent-[#ff5541]"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-[#1d1b1a] border border-[#5c403b] cursor-pointer">
                <span>PREFER REDUCED MOTION (ZERO ANIMATION)</span>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="w-4 h-4 accent-[#ff5541]"
                />
              </label>
            </div>
          </section>

          {/* SECTION 6: GAME RULES & RECOVERY */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[#5c403b] pb-2 text-xs font-bold text-[#cac6bd] uppercase tracking-wider">
              <span>{'// 06'}</span>
              <span>GAME RULES & CONTINUITY INVARIANTS</span>
            </div>

            <div className="p-4 bg-[#0f0e0d] border border-[#5c403b] text-xs space-y-2 leading-relaxed text-[#cac6bd]">
              <div className="flex items-center gap-2 text-[#c0ce71] font-bold uppercase">
                <span>{'✓ ANTI-PUNITIVE STREAK RECOVERY:'}</span>
              </div>
              <p>
                Kaizen strictly eliminates punitive streak wipeouts. A missed day is treated as an active recovery state rather than a demoralizing zero-reset. Health bands: Healthy (71-100%), Tired (31-70%), Fading (0-30%).
              </p>
            </div>
          </section>
        </fieldset>

        {/* SUBMIT BUTTON ROW */}
        <div className="pt-4 border-t-2 border-[#5c403b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-xs text-[#ac8883] uppercase">
            CHANGES PERSIST TO REPUTATION DOSSIER ON SUBMIT.
          </span>
          <button
            type="submit"
            className="px-8 py-3.5 bg-[#ff5541] text-[#5c0000] text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-none cursor-pointer disabled:opacity-50"
            disabled={saving || unavailable || !dirty}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>

        {saved && !dirty && (
          <p role="status" className="p-3 bg-[#1d1b1a] border border-[#c0ce71] text-[#c0ce71] text-xs font-bold uppercase">
            Settings saved.
          </p>
        )}

        {/* SECTION 7: DANGER PROTOCOLS */}
        <section className="mt-12 p-6 border-2 border-[#ff5541] bg-[#1d1b1a] space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#ff5541] uppercase tracking-wider">
            <span>{'⚠ DANGER PROTOCOLS // STATE OPERATORS'}</span>
          </div>
          <p className="text-xs text-[#cac6bd] leading-relaxed">
            Operations here modify active progression memory or export security snapshots.
          </p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs font-bold uppercase">
            {isGuestMode() && (
              <button
                type="button"
                onClick={handleResetProgress}
                className="px-4 py-2 bg-[#0f0e0d] text-[#ff5541] border border-[#ff5541] hover:bg-[#ff5541] hover:text-[#5c0000] transition-none cursor-pointer"
              >
                {"[ Reset Today's Completions ]"}
              </button>
            )}
            <button
              type="button"
              onClick={handleExportDossier}
              className="px-4 py-2 bg-[#0f0e0d] text-[#c0ce71] border border-[#c0ce71] hover:bg-[#c0ce71] hover:text-[#2d3400] transition-none cursor-pointer"
            >
              [ Export Dossier JSON ]
            </button>
            <button
              type="button"
              onClick={handlePurgeSession}
              className="px-4 py-2 bg-[#ff5541] text-[#5c0000] hover:bg-white hover:text-black transition-none cursor-pointer"
            >
              [ Purge Session ]
            </button>
          </div>
          {notice && (
            <p role="status" className="text-xs font-bold text-[#c0ce71] uppercase">
              {notice}
            </p>
          )}
        </section>
      </form>
    </div>
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

export default SettingsScreen;
