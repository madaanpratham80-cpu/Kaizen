'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionScreen } from '../../../api/session-screen.jsx';
import { loadGuestState, saveGuestState } from '../../../api/guest-store.js';

export function OnboardingScreen() {
  return (
    <SessionScreen>
      {(session, scope, revision) => (
        <OnboardingDossierContent session={session} scope={scope} revision={revision} />
      )}
    </SessionScreen>
  );
}

export default OnboardingScreen;

function OnboardingDossierContent({ session }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [guestState] = useState(() => loadGuestState());

  // Step 1: Identity
  const [displayName, setDisplayName] = useState(guestState.displayName || 'DISCIPLE #042');
  const [gender, setGender] = useState('male');
  const [timezone, setTimezone] = useState(guestState.timezone || 'UTC');

  // Step 2: Pillar Focus & Directives
  const [primaryPillar, setPrimaryPillar] = useState('Cognitive');
  const [selectedGoals, setSelectedGoals] = useState([
    'Master Spectral Theorems & SVD',
    'Maintain 42-day continuous streak',
    'Daily cold recovery cadence',
  ]);
  const [customGoal, setCustomGoal] = useState('');

  // Step 3: Starter Quest
  const [starterTitle, setStarterTitle] = useState('LINEAR ALGEBRA: EIGENVECTORS & SVD DRILL');
  const [starterCategory, setStarterCategory] = useState('Academic');
  const [starterDifficulty, setStarterDifficulty] = useState('MEDIUM');
  const [starterRecurrence, setStarterRecurrence] = useState('DAILY');

  function toggleGoal(goal) {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else {
      if (selectedGoals.length < 5) {
        setSelectedGoals([...selectedGoals, goal]);
      }
    }
  }

  function addCustomGoal(e) {
    e.preventDefault();
    if (!customGoal.trim() || selectedGoals.length >= 5) return;
    setSelectedGoals([...selectedGoals, customGoal.trim()]);
    setCustomGoal('');
  }

  function handleCompleteOnboarding() {
    const updated = {
      ...guestState,
      displayName: displayName.trim() || 'DISCIPLE #042',
      timezone,
      goals: selectedGoals,
    };
    saveGuestState(updated);
    router.push('/today');
  }

  return (
    <div className="flex flex-col w-full bg-[#141312] text-[#e6e1df] font-['DM_Sans',sans-serif] selection:bg-[#ff5541] selection:text-[#5c0000]">
      {/* TOP HEADER DISPATCH */}
      <section className="w-full bg-[#0f0e0d] border-b-2 border-[#5c403b] p-6 lg:p-8">
        <div className="flex items-center gap-3 font-mono text-xs text-[#ac8883] uppercase tracking-wider">
          <span className="text-[#ff5541] font-bold">// COMMISSIONING PROTOCOL</span>
          <span>// CADENCE 2026</span>
          <span>// ONBOARDING WIZARD</span>
        </div>
        <div className="mt-3 flex flex-col md:flex-row md:items-baseline md:gap-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[#e6e1df] leading-none m-0 font-['Space_Grotesk',sans-serif]">
            DISCIPLE COMMISSIONING
          </h1>
          <span className="font-mono text-xs uppercase tracking-tight text-[#cac6bd] font-bold mt-1 md:mt-0">
            ESTABLISH IDENTITY, DIRECTIVES, AND YOUR INITIAL EXECUTION TARGET.
          </span>
        </div>
      </section>

      {/* 3-STEP PROGRESSION TABS (ABUTTING BLOCKS) */}
      <section className="w-full grid grid-cols-3 border-b-2 border-[#5c403b] bg-[#5c403b] gap-[1px] font-mono text-xs uppercase font-bold">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`p-4 flex items-center justify-between transition-none cursor-pointer ${
            step === 1
              ? 'bg-[#ff5541] text-[#5c0000]'
              : 'bg-[#0f0e0d] text-[#cac6bd] hover:bg-[#1d1b1a]'
          }`}
        >
          <span>.01 IDENTITY</span>
          <span className="text-[10px] opacity-75">{step > 1 ? '✓' : '[01]'}</span>
        </button>

        <button
          type="button"
          onClick={() => setStep(2)}
          className={`p-4 flex items-center justify-between transition-none cursor-pointer ${
            step === 2
              ? 'bg-[#ff5541] text-[#5c0000]'
              : 'bg-[#0f0e0d] text-[#cac6bd] hover:bg-[#1d1b1a]'
          }`}
        >
          <span>.02 DIRECTIVES</span>
          <span className="text-[10px] opacity-75">{step > 2 ? '✓' : '[02]'}</span>
        </button>

        <button
          type="button"
          onClick={() => setStep(3)}
          className={`p-4 flex items-center justify-between transition-none cursor-pointer ${
            step === 3
              ? 'bg-[#ff5541] text-[#5c0000]'
              : 'bg-[#0f0e0d] text-[#cac6bd] hover:bg-[#1d1b1a]'
          }`}
        >
          <span>.03 FIRST TARGET</span>
          <span className="text-[10px] opacity-75">[03]</span>
        </button>
      </section>

      {/* STEP CONTAINER */}
      <div className="p-6 lg:p-8 max-w-4xl">
        {/* STEP 1: IDENTITY */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-b border-[#5c403b] pb-3">
              <span className="font-mono text-xs text-[#ff5541] uppercase tracking-wider font-bold block mb-1">
                STEP 01 // 03
              </span>
              <h2 className="text-2xl font-black text-white uppercase font-['Space_Grotesk',sans-serif] m-0">
                OPERATOR CALLSIGN & TEMPORAL ANCHOR
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                  Operator Callsign / Moniker
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#0f0e0d] border-2 border-[#5c403b] px-4 py-3 font-mono text-sm text-white uppercase focus:border-[#ff5541] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                  Biometric Portrait
                </label>
                <div className="grid grid-cols-2 gap-4 font-mono text-xs uppercase">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`p-4 border-2 text-left cursor-pointer transition-none ${
                      gender === 'male'
                        ? 'border-[#ff5541] bg-[#1d1b1a] text-white font-bold'
                        : 'border-[#5c403b] bg-[#0f0e0d] text-[#cac6bd]'
                    }`}
                  >
                    <div className="text-base mb-1">PROFILE 01</div>
                    <div className="text-[10px] text-[#ac8883]">DISCIPLE // MALE AVATAR</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`p-4 border-2 text-left cursor-pointer transition-none ${
                      gender === 'female'
                        ? 'border-[#ff5541] bg-[#1d1b1a] text-white font-bold'
                        : 'border-[#5c403b] bg-[#0f0e0d] text-[#cac6bd]'
                    }`}
                  >
                    <div className="text-base mb-1">PROFILE 02</div>
                    <div className="text-[10px] text-[#ac8883]">DISCIPLE // FEMALE AVATAR</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                  Timezone Synchronization
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-[#0f0e0d] border-2 border-[#5c403b] px-4 py-3 font-mono text-sm text-white uppercase focus:border-[#ff5541] focus:outline-none"
                >
                  <option value="UTC">UTC // Greenwich Mean Time</option>
                  <option value="America/New_York">America/New_York (EST / EDT)</option>
                  <option value="America/Chicago">America/Chicago (CST / CDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST / PDT)</option>
                  <option value="Europe/London">Europe/London (GMT / BST)</option>
                  <option value="Europe/Berlin">Europe/Berlin (CET / CEST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-[#5c403b] flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-8 py-3 bg-[#ff5541] text-[#5c0000] font-mono text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-none cursor-pointer"
              >
                PROCEED TO DIRECTIVES →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DIRECTIVES */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="border-b border-[#5c403b] pb-3">
              <span className="font-mono text-xs text-[#c0ce71] uppercase tracking-wider font-bold block mb-1">
                STEP 02 // 03
              </span>
              <h2 className="text-2xl font-black text-white uppercase font-['Space_Grotesk',sans-serif] m-0">
                PILLAR FOCUS & DISCIPLINED GOALS
              </h2>
            </div>

            {/* THREE PILLARS SELECTION */}
            <div>
              <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                Primary Developmental Pillar
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
                {[
                  {
                    name: 'Cognitive',
                    sub: 'ACADEMICS & STUDY',
                    desc: 'Rigorous deep work, algorithms, mathematics, and linguistics.',
                  },
                  {
                    name: 'Physical',
                    sub: 'CONDITIONING & RECOVERY',
                    desc: 'Endurance, structural strength, sleep architecture, and nutrition.',
                  },
                  {
                    name: 'Craft',
                    sub: 'DELIBERATE PRACTICE',
                    desc: 'Systems engineering, software architecture, and technical writing.',
                  },
                ].map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setPrimaryPillar(p.name)}
                    className={`p-4 border-2 text-left cursor-pointer transition-none flex flex-col justify-between ${
                      primaryPillar === p.name
                        ? 'border-[#c0ce71] bg-[#1d1b1a] text-white'
                        : 'border-[#5c403b] bg-[#0f0e0d] text-[#cac6bd] hover:border-[#ac8883]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold uppercase text-[#c0ce71]">{p.name}</div>
                      <div className="text-[10px] text-[#ac8883] uppercase mt-0.5">{p.sub}</div>
                      <p className="text-xs text-[#cac6bd] mt-2 font-['DM_Sans',sans-serif]">
                        {p.desc}
                      </p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-[#2b2a28] text-[10px] text-[#c0ce71]">
                      {primaryPillar === p.name ? '[ SELECTED PRIMARY ]' : '[ SELECT ]'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* STARTER GOALS */}
            <div>
              <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                Select Up to 5 Core Directives
              </label>
              <div className="space-y-2">
                {[
                  'Master Spectral Theorems & SVD',
                  'Maintain 42-day continuous streak',
                  'Daily cold recovery cadence',
                  'Build distributed systems prototype',
                  'Read 1 academic paper per week',
                  'Complete 10km endurance training',
                ].map((g) => {
                  const active = selectedGoals.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGoal(g)}
                      className={`w-full p-3 border text-left font-mono text-xs uppercase flex items-center justify-between cursor-pointer transition-none ${
                        active
                          ? 'border-[#ff5541] bg-[#1d1b1a] text-white font-bold'
                          : 'border-[#5c403b] bg-[#0f0e0d] text-[#cac6bd] hover:border-[#ac8883]'
                      }`}
                    >
                      <span>{g}</span>
                      <span className="text-[10px]">{active ? '[ ACTIVE ]' : '+ ADD'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t border-[#5c403b] flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-[#5c403b] text-[#cac6bd] font-mono text-xs font-bold uppercase hover:bg-[#1d1b1a] cursor-pointer"
              >
                ← BACK
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-8 py-3 bg-[#ff5541] text-[#5c0000] font-mono text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-none cursor-pointer"
              >
                PROCEED TO FIRST TARGET →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FIRST QUEST */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="border-b border-[#5c403b] pb-3">
              <span className="font-mono text-xs text-[#ff5541] uppercase tracking-wider font-bold block mb-1">
                STEP 03 // 03
              </span>
              <h2 className="text-2xl font-black text-white uppercase font-['Space_Grotesk',sans-serif] m-0">
                DEPLOY INITIAL EXECUTION TARGET
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                  Initial Quest Directive Title
                </label>
                <input
                  type="text"
                  value={starterTitle}
                  onChange={(e) => setStarterTitle(e.target.value)}
                  className="w-full bg-[#0f0e0d] border-2 border-[#5c403b] px-4 py-3 font-mono text-sm text-white uppercase focus:border-[#ff5541] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                    Category
                  </label>
                  <select
                    value={starterCategory}
                    onChange={(e) => setStarterCategory(e.target.value)}
                    className="w-full bg-[#0f0e0d] border-2 border-[#5c403b] px-4 py-3 font-mono text-xs text-white uppercase focus:border-[#ff5541] focus:outline-none"
                  >
                    <option value="Academic">Cognitive // Academic</option>
                    <option value="Physical">Physical // Health</option>
                    <option value="Productivity">Craft // Engineering</option>
                    <option value="Language">Cognitive // Language</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={starterDifficulty}
                    onChange={(e) => setStarterDifficulty(e.target.value)}
                    className="w-full bg-[#0f0e0d] border-2 border-[#5c403b] px-4 py-3 font-mono text-xs text-white uppercase focus:border-[#ff5541] focus:outline-none"
                  >
                    <option value="EASY">EASY (+60 XP)</option>
                    <option value="MEDIUM">MEDIUM (+120 XP)</option>
                    <option value="HARD">HARD (+180 XP)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs text-[#cac6bd] uppercase mb-2">
                    Recurrence Cadence
                  </label>
                  <select
                    value={starterRecurrence}
                    onChange={(e) => setStarterRecurrence(e.target.value)}
                    className="w-full bg-[#0f0e0d] border-2 border-[#5c403b] px-4 py-3 font-mono text-xs text-white uppercase focus:border-[#ff5541] focus:outline-none"
                  >
                    <option value="DAILY">DAILY RECURRENCE</option>
                    <option value="WEEKLY">WEEKLY CADENCE</option>
                  </select>
                </div>
              </div>

              {/* SUMMARY CARD */}
              <div className="p-6 bg-[#f5f0e6] text-[#141312] border-2 border-[#5c403b] mt-4 font-mono">
                <div className="text-[10px] uppercase font-bold text-[#494740] mb-1">
                  // COMMISSIONING SUMMARY
                </div>
                <div className="text-xl font-black uppercase text-[#141312]">{displayName}</div>
                <div className="text-xs text-[#32302a] mt-1">
                  PILLAR: {primaryPillar.toUpperCase()} // CADENCE: {timezone} // GOALS: {selectedGoals.length}
                </div>
                <div className="mt-3 pt-3 border-t border-[#d2cab9] text-xs text-[#141312]">
                  FIRST DIRECTIVE: <span className="font-bold">{starterTitle}</span> ({starterDifficulty})
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#5c403b] flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-[#5c403b] text-[#cac6bd] font-mono text-xs font-bold uppercase hover:bg-[#1d1b1a] cursor-pointer"
              >
                ← BACK
              </button>
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                className="px-8 py-3.5 bg-[#ff5541] text-[#5c0000] font-mono text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-none cursor-pointer shadow-lg"
              >
                COMMIT DOSSIER AND ENTER TODAY'S LEDGER →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
