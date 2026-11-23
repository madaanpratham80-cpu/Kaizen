'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../../auth/client.js';
import { SessionScreen } from '../../../api/session-screen.jsx';
import { loadGuestState, saveGuestState } from '../../../api/guest-store.js';

export function SettingsScreen() {
  return (
    <SessionScreen>
      {(session, scope, revision) => (
        <SettingsDossierContent session={session} scope={scope} revision={revision} />
      )}
    </SessionScreen>
  );
}

export default SettingsScreen;

function SettingsDossierContent({ session }) {
  const router = useRouter();
  const [guestState, setGuestState] = useState(() => loadGuestState());
  const [displayName, setDisplayName] = useState(guestState.displayName || 'DISCIPLE #042');
  const [timezone, setTimezone] = useState(guestState.timezone || 'UTC');
  const [gender, setGender] = useState('male');
  const [goals, setGoals] = useState(
    guestState.goals || [
      'Master Spectral Theorems & SVD',
      'Maintain 42-day continuous streak',
      'Daily cold recovery cadence',
    ],
  );
  const [newGoal, setNewGoal] = useState('');
  const [audioFeedback, setAudioFeedback] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  function triggerNotice(msg) {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(''), 3500);
  }

  function handleAddGoal(e) {
    e.preventDefault();
    if (!newGoal.trim() || goals.length >= 8) return;
    setGoals([...goals, newGoal.trim()]);
    setNewGoal('');
  }

  function handleRemoveGoal(index) {
    setGoals(goals.filter((_, i) => i !== index));
  }

  function handleSave(e) {
    e.preventDefault();
    const updated = {
      ...guestState,
      displayName: displayName.trim() || 'DISCIPLE #042',
      timezone,
      goals,
    };
    saveGuestState(updated);
    setGuestState(updated);
    triggerNotice('CONFIGURATION PERSISTED // DOSSIER PROTOCOLS SYNCHRONIZED');
  }

  async function handlePurgeSession() {
    if (confirm('CONFIRM PURGE: Clear guest session state and return to terminal?')) {
      await auth.logout('kaizen-guest-operator-csrf-token');
      router.push('/');
    }
  }

  function handleResetProgress() {
    if (confirm('CONFIRM RESET: Reset current interval completions back to pending?')) {
      const updated = {
        ...guestState,
        occurrences: guestState.occurrences.map((o) => ({
          ...o,
          status: 'PENDING',
          completedAt: null,
        })),
      };
      saveGuestState(updated);
      setGuestState(updated);
      triggerNotice('INTERVAL RESET // ALL TODAY OCCURRENCES SET TO PENDING');
    }
  }

  return (
    <div className="flex flex-col w-full bg-[#141312] text-[#e6e1df] font-['DM_Sans',sans-serif] selection:bg-[#ff5541] selection:text-[#5c0000]">
      {/* TOAST NOTICE */}
      {savedNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#c0ce71] text-[#2d3400] px-4 py-2 font-mono text-xs font-bold tracking-wider uppercase border border-[#2d3400] shadow-2xl animate-bounce">
          {savedNotice}
        </div>
      )}

      {/* TOP HEADER DISPATCH */}
      <section className="w-full bg-[#0f0e0d] border-b-2 border-[#5c403b] p-6 lg:p-8">
        <div className="flex items-center gap-3 font-mono text-xs text-[#ac8883] uppercase tracking-wider">
          <span className="text-[#ff5541] font-bold">// TERMINAL CONFIGURATION</span>
          <span>// DISPATCH .06</span>
          <span>// ARCHIVAL SECURITY</span>
        </div>
        <div className="mt-3 flex flex-col md:flex-row md:items-baseline md:gap-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[#e6e1df] leading-none m-0 font-['Space_Grotesk',sans-serif]">
            .06 SETTINGS
          </h1>
          <span className="font-mono text-xs uppercase tracking-tight text-[#cac6bd] font-bold mt-1 md:mt-0">
            OPERATOR REPUTATION, TEMPORAL CADENCE, AND PROTOCOL SAFEGUARDS.
          </span>
        </div>
      </section>

      {/* COMMAND METRIC RIBBON */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b-2 border-[#5c403b] bg-[#5c403b] gap-[1px] font-mono">
        <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
          <span className="text-[10px] text-[#ac8883] uppercase block mb-1">OPERATOR ID</span>
          <div className="text-2xl font-black text-white">{displayName}</div>
          <span className="text-[10px] text-[#c0ce71] uppercase font-bold mt-2 pt-2 border-t border-[#2b2a28]">
            RANK 12 // DISCIPLE
          </span>
        </div>

        <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
          <span className="text-[10px] text-[#ac8883] uppercase block mb-1">TEMPORAL CADENCE</span>
          <div className="text-2xl font-black text-[#ff5541] truncate">{timezone}</div>
          <span className="text-[10px] text-[#ac8883] uppercase font-bold mt-2 pt-2 border-t border-[#2b2a28]">
            SYNCHRONIZED (00:00:00Z)
          </span>
        </div>

        <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
          <span className="text-[10px] text-[#ac8883] uppercase block mb-1">DIRECTIVES ACTIVE</span>
          <div className="text-2xl font-black text-[#c0ce71]">{goals.length} OF 8</div>
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

      {/* SETTINGS FORM */}
      <form onSubmit={handleSave} className="p-6 lg:p-8 space-y-10 max-w-5xl">
        {/* SECTION 1: IDENTITY */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#5c403b] pb-2 font-mono text-xs font-bold text-[#ff5541] uppercase tracking-wider">
            <span>// 01</span>
            <span>OPERATOR IDENTITY PROTOCOL</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                Callsign / Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#0f0e0d] border-2 border-[#5c403b] px-4 py-3 font-mono text-sm text-white uppercase focus:border-[#ff5541] focus:outline-none"
              />
              <span className="block font-mono text-[10px] text-[#ac8883] uppercase mt-1">
                PUBLIC IDENTIFIER SHOWN ACROSS OPERATIONAL LEDGERS.
              </span>
            </div>

            <div>
              <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                Account Identity
              </label>
              <div className="flex items-center justify-between bg-[#1d1b1a] border-2 border-[#5c403b] px-4 py-3 font-mono text-sm text-[#cac6bd]">
                <span>{session.user.email}</span>
                <span className="bg-[#c0ce71] text-[#2d3400] text-[10px] font-bold px-2 py-0.5">
                  AUTHENTICATED
                </span>
              </div>
              <span className="block font-mono text-[10px] text-[#ac8883] uppercase mt-1">
                SESSION ANCHOR. IMMUTABLE WITHOUT OPERATOR DISCONNECTION.
              </span>
            </div>

            <div className="md:col-span-2">
              <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                Biometric Portrait Representation
              </label>
              <div className="grid grid-cols-2 gap-4 max-w-md font-mono text-xs uppercase">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`p-4 border-2 text-left cursor-pointer transition-none ${
                    gender === 'male'
                      ? 'border-[#ff5541] bg-[#1d1b1a] text-white font-bold'
                      : 'border-[#5c403b] bg-[#0f0e0d] text-[#cac6bd] hover:border-[#ac8883]'
                  }`}
                >
                  <div className="text-lg mb-1">PORTRAIT 01</div>
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
                  <div className="text-lg mb-1">PORTRAIT 02</div>
                  <div className="text-[10px] text-[#ac8883]">DISCIPLE // FEMALE PROFILE</div>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: TEMPORAL CADENCE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#5c403b] pb-2 font-mono text-xs font-bold text-[#c0ce71] uppercase tracking-wider">
            <span>// 02</span>
            <span>TEMPORAL COORDINATES & CADENCE</span>
          </div>

          <div className="max-w-xl">
            <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
              Operational Timezone (IANA)
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-[#0f0e0d] border-2 border-[#5c403b] px-4 py-3 font-mono text-sm text-white uppercase focus:border-[#c0ce71] focus:outline-none"
            >
              <option value="UTC">UTC // Greenwich Mean Time</option>
              <option value="America/New_York">America/New_York (EST / EDT)</option>
              <option value="America/Chicago">America/Chicago (CST / CDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST / PDT)</option>
              <option value="Europe/London">Europe/London (GMT / BST)</option>
              <option value="Europe/Berlin">Europe/Berlin (CET / CEST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST // 改善)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
            </select>
            <div className="mt-3 p-3 bg-[#1d1b1a] border border-[#5c403b] font-mono text-xs text-[#cac6bd] leading-relaxed">
              <span className="text-[#c0ce71] font-bold block mb-1">
                // CADENCE PROTECTION PROTOCOL:
              </span>
              Timezone adjustments apply to future unopened days only. Today’s plan preserves its current timezone snapshot to maintain continuous streak validity.
            </div>
          </div>
        </section>

        {/* SECTION 3: DIRECTIVES (GOALS) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#5c403b] pb-2 font-mono text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2 text-[#ff5541]">
              <span>// 03</span>
              <span>DISCIPLINED DIRECTIVES (GOALS)</span>
            </div>
            <span className="text-[#ac8883]">{goals.length} OF 8 SLOTS</span>
          </div>

          <div className="space-y-2">
            {goals.map((goal, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-[#1d1b1a] border border-[#5c403b] p-3 font-mono text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[#ac8883] font-bold">.0{idx + 1}</span>
                  <span className="text-[#e6e1df] uppercase">{goal}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveGoal(idx)}
                  className="text-[#ff5541] hover:text-white uppercase font-bold cursor-pointer transition-none"
                >
                  [ PURGE ]
                </button>
              </div>
            ))}
          </div>

          {goals.length < 8 && (
            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="E.G. COMPLETE COMPILERS TEXTBOOK CHAPTER 4"
                className="flex-1 bg-[#0f0e0d] border border-[#5c403b] px-4 py-2 font-mono text-xs text-white uppercase focus:border-[#ff5541] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddGoal}
                className="px-6 py-2 bg-[#2b2a28] text-white hover:bg-[#ff5541] hover:text-black font-mono text-xs font-bold uppercase transition-none cursor-pointer"
              >
                + ADD DIRECTIVE
              </button>
            </div>
          )}
        </section>

        {/* SECTION 4: TELEMETRY & FEEDBACK */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-[#5c403b] pb-2 font-mono text-xs font-bold text-[#cac6bd] uppercase tracking-wider">
            <span>// 04</span>
            <span>TELEMETRY & FEEDBACK PREFERENCES</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
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

        {/* SAVE SUBMIT */}
        <div className="pt-4 border-t-2 border-[#5c403b] flex items-center justify-between">
          <span className="font-mono text-xs text-[#ac8883] uppercase">
            CHANGES APPLY IMMEDIATELY ACROSS DOSSIER.
          </span>
          <button
            type="submit"
            className="px-8 py-3.5 bg-[#ff5541] text-[#5c0000] font-mono text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-none cursor-pointer shadow-lg"
          >
            COMMIT CONFIGURATION CHANGES →
          </button>
        </div>

        {/* SECTION 5: DANGER ZONE */}
        <section className="mt-12 p-6 border-2 border-[#ff5541] bg-[#1d1b1a] space-y-4">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#ff5541] uppercase tracking-wider">
            <span>⚠ DANGER PROTOCOLS // IRREVERSIBLE ACTIONS</span>
          </div>
          <p className="font-mono text-xs text-[#cac6bd] leading-relaxed">
            These operations alter the historical state of the active evaluation dossier.
          </p>

          <div className="flex flex-wrap gap-4 pt-2 font-mono text-xs font-bold uppercase">
            <button
              type="button"
              onClick={handleResetProgress}
              className="px-4 py-2.5 bg-[#0f0e0d] text-[#ff5541] border border-[#ff5541] hover:bg-[#ff5541] hover:text-[#5c0000] transition-none cursor-pointer"
            >
              [ RESET TODAY'S COMPLETIONS ]
            </button>
            <button
              type="button"
              onClick={handlePurgeSession}
              className="px-4 py-2.5 bg-[#ff5541] text-[#5c0000] hover:bg-white hover:text-black transition-none cursor-pointer"
            >
              [ PURGE GUEST OPERATOR SESSION ]
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
