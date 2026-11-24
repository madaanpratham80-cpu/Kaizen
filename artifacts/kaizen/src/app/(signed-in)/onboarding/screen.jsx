'use client';

import {
  createQuestSchema,
  questCategorySchema,
  settingsSaveResponseSchema,
  settingsSchema,
  settingsValidationErrorResponseSchema,
} from '@kaizen/contracts';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { apiBase } from '../../../api/base-url.js';
import { screenApi } from '../../../api/client.js';
import { ScreenState } from '../../../api/screen-state.jsx';
import {
  readFailure,
  ScreenNotice,
  SessionScreen,
} from '../../../api/session-screen.jsx';
import { useCalendarRead } from '../../../api/use-calendar-read.js';
import { ApiError, auth } from '../../../auth/client.js';
import { isGuestMode, loadGuestState, saveGuestState, createGuestQuest } from '../../../api/guest-store.js';

const SAVE_TIMEOUT_MS = 15_000;
const MAX_GOALS = 8;
const STARTER_TARGET = 1;
const timezoneHelp =
  "Timezone changes apply to future unopened days only. Today's plan keeps its current timezone.";
const inputStyle =
  'block w-full border-2 border-[#5c403b] bg-[#0f0e0d] px-4 py-2.5 font-mono text-sm text-[#e6e1df] focus:border-[#ff5541] focus:outline-none';

const PRESET_GOALS = [
  'Master Spectral Theorems & SVD',
  'Maintain 42-day continuous streak',
  'Daily cold recovery cadence',
  'Deep Sleep Cold Therapy Routine',
];

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
    <ul id={`onboarding-error-${field}`} role="alert" className="text-xs text-[#ffb4a8] font-mono font-bold uppercase space-y-0.5 mt-1">
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
    <section aria-label="Saved settings" className="p-4 border-2 border-[#c0ce71] bg-[#1d1b1a] space-y-2 font-mono text-xs text-[#e6e1df]">
      <p className="font-bold text-[#c0ce71] uppercase">✓ Settings saved.</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#2b2a28]">
        <div>
          <dt className="text-[10px] text-[#ac8883] uppercase">Display name</dt>
          <dd className="font-bold text-white uppercase">{user.displayName}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-[#ac8883] uppercase">Current timezone</dt>
          <dd className="font-bold text-white">{user.timezone}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-[10px] text-[#ac8883] uppercase">Goals</dt>
          <dd>
            {user.goals.length ? (
              <ul className="list-disc list-inside space-y-0.5 text-xs text-[#cac6bd]">
                {user.goals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            ) : (
              <ScreenState state="empty" />
            )}
          </dd>
        </div>
      </dl>
      {pendingTimezone && (
        <p className="text-xs text-[#c0ce71] uppercase font-bold pt-1 border-t border-[#2b2a28]">
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
  const [activeTab, setActiveTab] = useState('wizard');
  const [wizardStep, setWizardStep] = useState(1);
  const [goals, setGoals] = useState(profile.user.goals);
  const [saved, setSaved] = useState(
    /** @type {SavedSettings | null} */ (null),
  );
  const [quest, setQuest] = useState(/** @type {Quest | null} */ (null));
  const [issues, setIssues] = useState(/** @type {FieldIssue[]} */ ([]));
  const [pending, setPending] = useState(null);
  const [failure, setFailure] = useState(null);
  const [gender, setGender] = useState('male');

  // Quick Auth tab states
  const [loginEmail, setLoginEmail] = useState('disciple42@kaizen.local');
  const [loginPassword, setLoginPassword] = useState('KaizenDisciple2026!');
  const [authError, setAuthError] = useState('');
  const [authPending, setAuthPending] = useState(false);

  const lifetime = useRef(null);
  const busy = useRef(false);
  const clientId = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = AbortSignal.any([controller.signal, scope.signal]);
    return () => controller.abort();
  }, [scope.signal]);

  function handleInstantGuestMode() {
    try {
      document.cookie = 'kaizen_guest=true; path=/; max-age=86400; SameSite=Lax';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('kaizen_guest_mode', 'true');
        window.location.href = '/today';
      }
    } catch {
      setAuthError('Could not initialize guest mode.');
    }
  }

  async function handleQuickLogin(e) {
    e.preventDefault();
    setAuthError('');
    setAuthPending(true);
    try {
      await auth.login({ email: loginEmail, password: loginPassword });
      if (typeof window !== 'undefined') window.location.href = '/today';
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Login failed');
      setAuthPending(false);
    }
  }

  function handleAddPresetGoal(preset) {
    if (goals.length >= MAX_GOALS || goals.includes(preset)) return;
    setGoals((prev) => [...prev, preset]);
  }

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
    <div className="flex flex-col w-full bg-[#141312] text-[#e6e1df] font-mono selection:bg-[#ff5541] selection:text-[#5c0000]">
      {/* TOP HEADER DISPATCH */}
      <section className="w-full bg-[#0f0e0d] border-b-2 border-[#5c403b] p-6 lg:p-8">
        <div className="flex items-center gap-3 text-xs text-[#ac8883] uppercase tracking-wider">
          <span className="text-[#ff5541] font-bold">{'// COMMISSIONING PROTOCOL'}</span>
          <span>{'// CADENCE 2026'}</span>
          <span>{'// GATEWAY WIZARD'}</span>
        </div>
        <div className="mt-3 flex flex-col md:flex-row md:items-baseline md:gap-6">
          <p className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[#e6e1df] leading-none m-0 font-['Space_Grotesk',sans-serif]">
            DISCIPLE ONBOARDING
          </p>
          <span className="text-xs uppercase tracking-tight text-[#cac6bd] font-bold mt-1 md:mt-0">
            CHOOSE ACCESS PATHWAY: COMMISSION PROTOCOL, LOG IN, OR LAUNCH INSTANT GUEST MODE.
          </span>
        </div>
      </section>

      {/* 4-OPTION PATHWAY TABS (COMMISSION, LOGIN, SIGN UP, GUEST) */}
      <section className="w-full grid grid-cols-2 lg:grid-cols-4 border-b-2 border-[#5c403b] bg-[#5c403b] gap-[1px] text-xs uppercase font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('wizard')}
          className={`p-4 flex items-center justify-between transition-none cursor-pointer ${
            activeTab === 'wizard'
              ? 'bg-[#ff5541] text-[#5c0000]'
              : 'bg-[#0f0e0d] text-[#cac6bd] hover:bg-[#1d1b1a]'
          }`}
        >
          <span>.01 COMMISSION PROTOCOL</span>
          <span className="text-[10px] opacity-75">[ACTIVE]</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('login')}
          className={`p-4 flex items-center justify-between transition-none cursor-pointer ${
            activeTab === 'login'
              ? 'bg-[#ff5541] text-[#5c0000]'
              : 'bg-[#0f0e0d] text-[#cac6bd] hover:bg-[#1d1b1a]'
          }`}
        >
          <span>.02 LOG IN OPTION</span>
          <span className="text-[10px] opacity-75">[SIGN IN]</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('signup')}
          className={`p-4 flex items-center justify-between transition-none cursor-pointer ${
            activeTab === 'signup'
              ? 'bg-[#ff5541] text-[#5c0000]'
              : 'bg-[#0f0e0d] text-[#cac6bd] hover:bg-[#1d1b1a]'
          }`}
        >
          <span>.03 SIGN UP OPTION</span>
          <span className="text-[10px] opacity-75">[REGISTER]</span>
        </button>

        <button
          type="button"
          onClick={handleInstantGuestMode}
          className="p-4 flex items-center justify-between bg-[#f5f0e6] text-[#141312] hover:bg-white transition-none cursor-pointer"
        >
          <span>⚡ INSTANT GUEST ACCESS</span>
          <span className="text-[10px] font-bold">[1-CLICK]</span>
        </button>
      </section>

      {/* TAB CONTENT: QUICK LOG IN OPTION */}
      {activeTab === 'login' && (
        <div className="p-6 lg:p-8 max-w-xl space-y-6">
          <div className="border-b border-[#5c403b] pb-3">
            <span className="text-xs text-[#ff5541] uppercase tracking-wider font-bold block mb-1">
              {'OPTION 02 // LOG IN'}
            </span>
            <p className="text-2xl font-black text-white uppercase font-['Space_Grotesk',sans-serif] m-0">
              AUTHENTICATE EXISTING OPERATOR
            </p>
          </div>

          {authError && (
            <div role="alert" className="p-3 border-2 border-[#ff5541] bg-[#1d1b1a] text-[#ffb4a8] text-xs uppercase font-bold">
              ⚠ {authError}
            </div>
          )}

          <form onSubmit={handleQuickLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-[#cac6bd] uppercase mb-1 font-bold">
                Operator Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs text-[#cac6bd] uppercase mb-1 font-bold">
                Access Passphrase
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={authPending}
              className="w-full py-3 bg-[#ff5541] text-[#5c0000] font-bold text-xs uppercase hover:bg-white hover:text-black transition-none cursor-pointer"
            >
              {authPending ? 'Authenticating…' : 'Log In & Open Terminal →'}
            </button>
          </form>
        </div>
      )}

      {/* TAB CONTENT: QUICK SIGN UP OPTION */}
      {activeTab === 'signup' && (
        <div className="p-6 lg:p-8 max-w-xl space-y-6">
          <div className="border-b border-[#5c403b] pb-3">
            <span className="text-xs text-[#ff5541] uppercase tracking-wider font-bold block mb-1">
              {'OPTION 03 // SIGN UP'}
            </span>
            <p className="text-2xl font-black text-white uppercase font-['Space_Grotesk',sans-serif] m-0">
              REGISTER NEW OPERATOR CALLSIGN
            </p>
          </div>
          <p className="text-xs text-[#cac6bd] leading-relaxed">
            Initialize an immutable discipline ledger with server-side streak preservation.
          </p>
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-block px-6 py-3 bg-[#ff5541] text-[#5c0000] font-bold text-xs uppercase hover:bg-white hover:text-black transition-none"
            >
              Open Full Registration Terminal →
            </Link>
          </div>
        </div>
      )}

      {/* TAB CONTENT: WIZARD & MAIN COMMISSIONING FORM */}
      {activeTab === 'wizard' && (
        <div className="p-6 lg:p-8 max-w-4xl space-y-6">
          {saved && <SavedSummary saved={saved} />}
          {quest ? (
            <div className="p-6 border-2 border-[#c0ce71] bg-[#1d1b1a] space-y-3">
              <p role="status" className="text-sm font-bold text-[#c0ce71] uppercase">
                Starter quest created: {quest.title}.
              </p>
              <p className="text-xs text-[#cac6bd]">
                Your discipline framework is now active. Open the Today screen to begin your daily execution cadence.
              </p>
              <div className="pt-2">
                <Link
                  href="/today"
                  className="inline-block px-6 py-3 bg-[#c0ce71] text-[#2d3400] font-bold text-xs uppercase hover:bg-white transition-none"
                >
                  Enter Operational Dashboard (/today) →
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={submit}
              aria-busy={Boolean(pending)}
              className="space-y-8"
            >
              {failure && (
                <div className="p-4 border-2 border-[#ff5541] bg-[#1d1b1a] text-[#ffb4a8] text-xs uppercase font-bold space-y-2">
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
                <fieldset disabled={disabled} className="space-y-6">
                  {/* STEP 1: IDENTITY */}
                  <div className="border-b border-[#5c403b] pb-2">
                    <span className="text-xs text-[#ff5541] uppercase tracking-wider font-bold block mb-1">
                      {'PHASE 01 // IDENTITY ANCHOR'}
                    </span>
                    <legend className="text-xl font-bold text-white uppercase font-['Space_Grotesk',sans-serif]">
                      Your settings
                    </legend>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs text-[#cac6bd] uppercase mb-1 font-bold">
                        Display name
                        <input
                          name="displayName"
                          className={inputStyle}
                          defaultValue={profile.user.displayName}
                          {...errorAttributes(issues, 'displayName')}
                        />
                      </label>
                      <FieldErrors field="displayName" issues={issues} />
                      <span className="block text-[10px] text-[#ac8883] uppercase mt-1">
                        CALLSIGN FOR THE DISCIPLINE DOSSIER.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs text-[#cac6bd] uppercase mb-1 font-bold">
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
                      <p id="onboarding-timezone-help" className="text-[11px] text-[#cac6bd] p-2 bg-[#0f0e0d] border border-[#5c403b] mt-1 leading-relaxed">
                        {timezoneHelp}
                      </p>
                      <FieldErrors field="timezone" issues={issues} />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs text-[#cac6bd] uppercase mb-2 font-bold">
                        Biometric Avatar Profile
                      </label>
                      <div className="grid grid-cols-2 gap-4 max-w-md text-xs uppercase">
                        <button
                          type="button"
                          onClick={() => setGender('male')}
                          className={`p-3 border-2 text-left cursor-pointer transition-none ${
                            gender === 'male'
                              ? 'border-[#ff5541] bg-[#1d1b1a] text-white font-bold'
                              : 'border-[#5c403b] bg-[#0f0e0d] text-[#cac6bd]'
                          }`}
                        >
                          <div className="text-sm font-bold text-white">PORTRAIT 01</div>
                          <div className="text-[10px] text-[#ac8883]">DISCIPLE // MALE</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGender('female')}
                          className={`p-3 border-2 text-left cursor-pointer transition-none ${
                            gender === 'female'
                              ? 'border-[#ff5541] bg-[#1d1b1a] text-white font-bold'
                              : 'border-[#5c403b] bg-[#0f0e0d] text-[#cac6bd]'
                          }`}
                        >
                          <div className="text-sm font-bold text-white">PORTRAIT 02</div>
                          <div className="text-[10px] text-[#ac8883]">DISCIPLE // FEMALE</div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: GOALS */}
                  <fieldset
                    className="space-y-4 pt-4 border-t border-[#5c403b]"
                    {...errorAttributes(issues, 'goals')}
                  >
                    <div className="flex items-center justify-between border-b border-[#5c403b] pb-2">
                      <legend className="text-lg font-bold text-[#c0ce71] uppercase">
                        Goals
                      </legend>
                      <span className="text-xs text-[#ac8883]">{goals.length} OF {MAX_GOALS} SLOTS</span>
                    </div>

                    <div className="space-y-3">
                      {goals.map((goal, index) => {
                        const field = `goals.${index}`;
                        return (
                          <div key={index} className="p-3 bg-[#0f0e0d] border border-[#5c403b] space-y-2">
                            <label className="block text-xs text-[#cac6bd] uppercase font-bold">
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
                              className="text-[#ff5541] hover:text-white uppercase font-bold text-xs cursor-pointer transition-none underline"
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

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          type="button"
                          disabled={goals.length >= MAX_GOALS}
                          className="px-4 py-2 bg-[#2b2a28] text-white hover:bg-[#ff5541] hover:text-black text-xs font-bold uppercase transition-none cursor-pointer disabled:opacity-50"
                          onClick={() => setGoals((previous) => [...previous, ''])}
                        >
                          + Add goal
                        </button>
                      </div>

                      {/* QUICK GOAL CHIPS */}
                      <div className="pt-2">
                        <span className="text-[10px] text-[#ac8883] uppercase block mb-1 font-bold">
                          SUGGESTED DISCIPLINE DIRECTIVES (CLICK TO ADD):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_GOALS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              disabled={goals.length >= MAX_GOALS || goals.includes(preset)}
                              onClick={() => handleAddPresetGoal(preset)}
                              className="text-[11px] px-2.5 py-1 bg-[#1d1b1a] border border-[#5c403b] text-[#cac6bd] hover:border-[#c0ce71] hover:text-white transition-none disabled:opacity-40 cursor-pointer"
                            >
                              + {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </fieldset>
              )}

              {/* STEP 3: STARTER QUEST */}
              <fieldset disabled={disabled} className="space-y-4 pt-4 border-t border-[#5c403b]">
                <div className="border-b border-[#5c403b] pb-2">
                  <span className="text-xs text-[#ff5541] uppercase tracking-wider font-bold block mb-1">
                    {'PHASE 02 // INITIAL EXECUTION TARGET'}
                  </span>
                  <legend className="text-xl font-bold text-white uppercase font-['Space_Grotesk',sans-serif]">
                    Starter quest
                  </legend>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#cac6bd] uppercase mb-1 font-bold">
                      Quest title
                      <input
                        name="title"
                        defaultValue="LINEAR ALGEBRA: EIGENVECTORS & SVD DRILL"
                        className={inputStyle}
                        {...errorAttributes(issues, 'title')}
                      />
                    </label>
                    <FieldErrors field="title" issues={issues} />
                  </div>

                  <div>
                    <label className="block text-xs text-[#cac6bd] uppercase mb-1 font-bold">
                      Category
                      <select
                        name="category"
                        className={inputStyle}
                        {...errorAttributes(issues, 'category')}
                      >
                        {questCategorySchema.options.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                    <FieldErrors field="category" issues={issues} />
                  </div>

                  <div>
                    <label className="block text-xs text-[#cac6bd] uppercase mb-1 font-bold">
                      Start date
                      <input
                        name="effectiveFrom"
                        type="date"
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        className={inputStyle}
                        {...errorAttributes(issues, 'effectiveFrom')}
                      />
                    </label>
                    <FieldErrors field="effectiveFrom" issues={issues} />
                  </div>
                </div>
              </fieldset>

              {/* ACTION SUBMIT */}
              <div className="pt-4 border-t-2 border-[#5c403b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-xs text-[#ac8883] uppercase">
                  CONFIRM COMMISSIONING TO INITIALIZE CADENCE LEDGER.
                </span>
                <button
                  type="submit"
                  disabled={disabled}
                  className="px-8 py-3.5 bg-[#ff5541] text-[#5c0000] text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-none cursor-pointer disabled:opacity-50"
                >
                  {pending === 'settings'
                    ? 'Saving settings…'
                    : pending === 'quest'
                      ? 'Creating starter quest…'
                      : saved
                        ? 'Retry starter quest'
                        : 'Save settings and create quest'}
                </button>
              </div>
            </form>
          )}
        </div>
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
      <h1 className="text-4xl font-bold sr-only">Onboarding</h1>
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

export default OnboardingScreen;
