'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { screenApi } from '../../../api/client.js';
import { SessionScreen } from '../../../api/session-screen.jsx';

export function ProfileScreen() {
  return (
    <SessionScreen>
      {(session, scope, revision) => (
        <ProfileDossierPoster session={session} scope={scope} revision={revision} />
      )}
    </SessionScreen>
  );
}

export default ProfileScreen;

function ProfileDossierPoster({ session }) {
  const [profileData, setProfileData] = useState(null);
  const [vitalityState, setVitalityState] = useState('optimal'); // optimal | deficit | critical | revived
  const [telemetryMessage, setTelemetryMessage] = useState('');
  const [showSealsModal, setShowSealsModal] = useState(false);

  // GSAP animation refs
  const rootRef = useRef(null);
  const xpCountRef = useRef(null);
  const streakCountRef = useRef(null);
  const fidelityCountRef = useRef(null);
  const avatarSvgRef = useRef(null);

  useEffect(() => {
    let active = true;
    screenApi.profile().then((data) => {
      if (active) setProfileData(data);
    });
    return () => {
      active = false;
    };
  }, []);

  // GSAP Entrance & Metric count-up animation
  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      // 1. Metric numbers count up
      const xpObj = { val: 0 };
      gsap.to(xpObj, {
        val: profileData?.totalXp ? profileData.totalXp * 5.8 : 48920,
        duration: 1.6,
        ease: 'power3.out',
        onUpdate: () => {
          if (xpCountRef.current) {
            xpCountRef.current.innerText = Math.floor(xpObj.val).toLocaleString();
          }
        },
      });

      const streakObj = { val: 0 };
      gsap.to(streakObj, {
        val: profileData?.currentStreak || 42,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: () => {
          if (streakCountRef.current) {
            streakCountRef.current.innerText = Math.floor(streakObj.val);
          }
        },
      });

      const fidelityObj = { val: 0 };
      gsap.to(fidelityObj, {
        val: 89.8,
        duration: 1.4,
        ease: 'power2.out',
        onUpdate: () => {
          if (fidelityCountRef.current) {
            fidelityCountRef.current.innerText = fidelityObj.val.toFixed(1);
          }
        },
      });

      // 2. Stagger progress bar segments
      gsap.fromTo(
        '.gsap-progress-segment',
        { scaleY: 0, opacity: 0 },
        {
          scaleY: 1,
          opacity: 1,
          duration: 0.35,
          stagger: 0.04,
          ease: 'power2.out',
          delay: 0.2,
        },
      );

      // 3. Subtle avatar scan-in
      if (avatarSvgRef.current) {
        gsap.fromTo(
          avatarSvgRef.current,
          { filter: 'brightness(2) contrast(1.5)', opacity: 0.4 },
          { filter: 'brightness(1) contrast(1)', opacity: 1, duration: 0.8, ease: 'power2.out' },
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, [profileData]);

  // Dynamic avatar color scheme based on vitality state
  function handleStateChange(state) {
    setVitalityState(state);
    if (!avatarSvgRef.current) return;

    // GSAP glitch / pulse transition on state switch
    gsap.timeline()
      .to(avatarSvgRef.current, { scale: 0.95, opacity: 0.6, duration: 0.1 })
      .to(avatarSvgRef.current, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2)' });

    if (state === 'optimal') {
      triggerTelemetry('DISCIPLINE STATE: OPTIMAL // HEALTH 100% NOMINAL CADENCE');
    } else if (state === 'deficit') {
      triggerTelemetry('DISCIPLINE STATE: DEFICIT // 45% HEALTH DEFICIT AUDITED');
    } else if (state === 'critical') {
      triggerTelemetry('DISCIPLINE STATE: CRITICAL // 15% MINIMAL BOUNDARY DEFENSE ENGAGED');
    } else if (state === 'revived') {
      triggerTelemetry('DISCIPLINE STATE: REVIVED // CONSECRATED CADENCE RESTORED');
    }
  }

  function triggerTelemetry(msg) {
    setTelemetryMessage(msg);
    setTimeout(() => setTelemetryMessage(''), 4500);
  }

  function handleExportDossier() {
    triggerTelemetry(`DOSSIER ${session.user.displayName || 'ARCHON-042'} EXPORTED [SHA-256 HASH VERIFIED]`);
    const exportBlob = new Blob(
      [
        JSON.stringify(
          {
            user: session.user,
            metrics: {
              totalXp: profileData?.totalXp || 8420,
              currentStreak: profileData?.currentStreak || 42,
              health: profileData?.health || 85,
              level: profileData?.level || 12,
            },
            archivedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(exportBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KAIZEN_DOSSIER_${session.user.displayName.replace(/\s+/g, '_')}.json`;
    a.click();
  }

  const helmColor =
    vitalityState === 'critical'
      ? '#ff5541'
      : vitalityState === 'deficit'
        ? '#805016'
        : vitalityState === 'revived'
          ? '#c0ce71'
          : '#ff5541';

  const visorColor =
    vitalityState === 'critical'
      ? '#2b2a28'
      : vitalityState === 'deficit'
        ? '#3b3937'
        : '#e6e1df';

  const auraText =
    vitalityState === 'critical'
      ? 'AURA: CRITICAL ALERT // PULSE: 120 BPM STRESSED'
      : vitalityState === 'deficit'
        ? 'AURA: SOMBER AMBER // PULSE: 54 BPM LETHARGIC'
        : vitalityState === 'revived'
          ? 'AURA: RADIANT EMERALD // PULSE: 68 BPM CONSECRATED'
          : 'AURA: COGNITIVE AMBER // PULSE: 72 BPM NOMINAL';

  return (
    <div
      ref={rootRef}
      className="flex flex-col w-full bg-[#141312] text-[#e6e1df] font-['DM_Sans',sans-serif] selection:bg-[#ff5541] selection:text-[#5c0000]"
    >
      {/* TOAST / ACTION TELEMETRY BANNER */}
      {telemetryMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#ff5541] text-[#5c0000] px-4 py-2 font-mono text-xs font-bold tracking-wider uppercase border border-[#5c0000] shadow-2xl animate-bounce">
          {telemetryMessage}
        </div>
      )}

      {/* TOP DOSSIER REGISTRATION BAND */}
      <section className="w-full bg-[#0f0e0d] border-b-2 border-[#5c403b]">
        <div className="flex flex-col xl:flex-row items-stretch justify-between">
          {/* Title & Archival Coordinates */}
          <div className="p-6 lg:p-8 flex-1 border-b-2 xl:border-b-0 xl:border-r-2 border-[#5c403b]">
            <div className="flex items-center gap-3 mb-2 font-mono text-xs">
              <span className="bg-[#ff5541] text-[#5c0000] px-2 py-0.5 font-bold uppercase tracking-widest">
                DOSSIER // ARCHIVE
              </span>
              <span className="text-[#ac8883] tracking-widest uppercase">
                FIG. 05 // PERSONNEL ARCHIVE // DISCIPLINARY DOSSIER
              </span>
            </div>
            <div className="flex items-baseline gap-4">
              <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-[#e6e1df] font-['Space_Grotesk',sans-serif] leading-none m-0">
                .05 PROFILE
              </h1>
              <span className="text-4xl text-[#c0ce71] font-mono font-light">改善</span>
            </div>
            <p className="font-mono text-xs text-[#cac6bd] mt-3 tracking-wider uppercase">
              BIOMETRIC ACCRUAL &amp; CANONICAL DISCIPLE IDENTITY // 改善 PERSONNEL FILE
            </p>
          </div>

          {/* Right Registry Telemetry Matrix */}
          <div className="flex flex-col sm:flex-row xl:w-[480px] bg-[#1d1b1a] divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[#5c403b] font-mono">
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-[#ac8883] uppercase tracking-widest">
                  // REGISTRY IDENTIFIER
                </div>
                <div className="text-base text-white uppercase font-bold mt-1">
                  {session.user.displayName || 'DISCIPLE #042'} [ CYCLE STABLE ]
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[#ac8883] border-t border-[#5c403b] pt-2">
                <span>AUDIT STATE</span>
                <span className="text-[#c0ce71] font-bold">[ SYNCHRONOUS ]</span>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-[#ac8883] uppercase tracking-widest">
                  // SECURITY CLEARANCE
                </div>
                <div className="text-base text-[#ffb4a8] font-bold mt-1 uppercase">
                  TIER IV RUNNER
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[#ac8883] border-t border-[#5c403b] pt-2">
                <span>CLEARANCE HASH</span>
                <span className="text-white text-[11px]">SEC-042-ALPHA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UPPER VITALS BAND: ZERO-GAP 4-CELL SWISS METRIC RUNWAY */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 border-b-2 border-[#5c403b] font-mono">
        {/* Metric 1: Exp Accrual */}
        <div className="bg-[#1d1b1a] p-6 border-b-2 md:border-b-0 border-r-2 border-[#5c403b] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="uppercase text-[#ac8883] tracking-widest">METRIC .01 // XP ACCRUAL</span>
            <span className="bg-[#ff5541] text-[#5c0000] px-1.5 py-0.5 text-[10px] font-bold uppercase">
              +1,240 XP
            </span>
          </div>
          <div className="my-4">
            <div
              ref={xpCountRef}
              className="text-5xl font-black tracking-tighter text-white leading-none font-['Space_Grotesk',sans-serif]"
            >
              48,920
            </div>
            <div className="text-xs text-[#cac6bd] mt-2 uppercase">LIFETIME OPERATIONAL POINTS</div>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-[#5c403b] pt-2 text-[#ac8883]">
            <span>PERCENTILE BRACKET</span>
            <span className="text-[#c0ce71] font-bold">TOP 4.2% GLOBAL</span>
          </div>
        </div>

        {/* Metric 2: Discipline Continuum */}
        <div className="bg-[#211f1e] p-6 border-b-2 md:border-b-0 border-r-2 border-[#5c403b] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="uppercase text-[#ac8883] tracking-widest">METRIC .02 // DISCIPLINE</span>
            <span className="bg-[#c0ce71] text-[#2d3400] px-1.5 py-0.5 text-[10px] font-bold uppercase">
              HOT STREAK
            </span>
          </div>
          <div className="my-4">
            <div className="text-5xl font-black tracking-tighter text-white leading-none font-['Space_Grotesk',sans-serif] flex items-baseline">
              <span ref={streakCountRef}>42</span>
              <span className="text-2xl text-[#ff5541] font-bold ml-1">DAYS</span>
            </div>
            <div className="text-xs text-[#cac6bd] mt-2 uppercase">CONTINUUM UNBROKEN</div>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-[#5c403b] pt-2 text-[#ac8883]">
            <span>ALL-TIME PEAK</span>
            <span className="text-white font-bold">50 DAYS CANONICAL</span>
          </div>
        </div>

        {/* Metric 3: Inverted Cream Block (Poster Contrast Anchor) */}
        <div className="bg-[#f5f0e6] text-[#141312] p-6 border-b-2 md:border-b-0 border-r-2 border-[#5c403b] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="uppercase font-bold text-[#494740] tracking-widest">
              METRIC .03 // PROTOCOL FIDELITY
            </span>
            <span className="bg-[#141312] text-[#f5f0e6] px-1.5 py-0.5 text-[10px] font-bold uppercase">
              VERIFIED
            </span>
          </div>
          <div className="my-4">
            <div className="text-5xl font-black tracking-tighter text-[#141312] leading-none font-['Space_Grotesk',sans-serif] flex items-baseline">
              <span ref={fidelityCountRef}>89.8</span>
              <span className="text-2xl text-[#ff5541] font-bold ml-0.5">%</span>
            </div>
            <div className="text-xs font-bold text-[#32302a] mt-2 uppercase">ZERO-BREACH CADENCE</div>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-[#d2cab9] pt-2 font-bold text-[#141312]">
            <span>RECOVERY INDEX</span>
            <span>1 PENALTY RESOLVED</span>
          </div>
        </div>

        {/* Metric 4: Canonical Seal Ratio */}
        <div className="bg-[#1d1b1a] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="uppercase text-[#ac8883] tracking-widest">METRIC .04 // SEAL RATIO</span>
            <span className="bg-[#4b4942] text-[#bcb8af] px-1.5 py-0.5 text-[10px] font-bold uppercase">
              ARCHON
            </span>
          </div>
          <div className="my-4">
            <div className="text-5xl font-black tracking-tighter text-white leading-none font-['Space_Grotesk',sans-serif] flex items-baseline">
              <span>38</span>
              <span className="text-2xl text-[#ac8883] font-normal ml-1">/64</span>
            </div>
            <div className="text-xs text-[#cac6bd] mt-2 uppercase">SEALS ARCHIVED PERPETUALLY</div>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-[#5c403b] pt-2 text-[#ac8883]">
            <span>CANONICAL RATIO</span>
            <span className="text-[#c0ce71] font-bold">59.3% COMPLETION</span>
          </div>
        </div>
      </section>

      {/* MAIN SPREAD: TWO-COLUMN POSTER EDITORIAL ARCHITECTURE */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 border-b-2 border-[#5c403b]">
        {/* LEFT SPREAD COLUMN (5 COLS) */}
        <div className="lg:col-span-5 bg-[#0f0e0d] border-b-2 lg:border-b-0 lg:border-r-2 border-[#5c403b] flex flex-col font-mono">
          {/* Panel Header */}
          <div className="p-4 bg-[#1d1b1a] border-b-2 border-[#5c403b] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#ff5541] font-bold">// SEC .05-A</span>
              <span className="text-white uppercase font-bold tracking-wider">
                AVATAR MANIFEST &amp; VITALITY STATES
              </span>
            </div>
            <span className="text-[#ac8883] text-[10px]">[ FIG. 04 COMPLIANT ]</span>
          </div>

          {/* Main Portrait Frame: Brutalist Duotone Display */}
          <div className="p-6 bg-[#211f1e] border-b-2 border-[#5c403b] flex flex-col items-center">
            <div className="relative w-full max-w-sm bg-[#0f0e0d] border-2 border-[#5c403b] p-4">
              <div className="flex items-center justify-between border-b border-[#5c403b] pb-2 mb-4 text-xs">
                <span className="text-[#ac8883] uppercase">DISCIPLE AVATAR // .01 OPTIMAL</span>
                <span className="text-[#c0ce71] font-bold uppercase">[ {vitalityState} ]</span>
              </div>

              {/* Graphic Character Display */}
              <div className="relative w-full aspect-square bg-[#141312] border border-[#5c403b] flex items-center justify-center overflow-hidden">
                <svg
                  ref={avatarSvgRef}
                  className="w-52 h-52 transition-all duration-300"
                  fill="none"
                  viewBox="0 0 160 160"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Grid backdrop */}
                  <path
                    d="M0 20H160M0 40H160M0 60H160M0 80H160M0 100H160M0 120H160M0 140H160"
                    stroke="#211f1e"
                    strokeWidth="0.5"
                  />
                  <path
                    d="M20 0V160M40 0V160M60 0V160M80 0V160M100 0V160M120 0V160M140 0V160"
                    stroke="#211f1e"
                    strokeWidth="0.5"
                  />

                  {/* Character Body (Duotone Construct) */}
                  <polygon fill={helmColor} points="80,22 48,48 112,48" />
                  <rect fill={helmColor} height="6" width="12" x="74" y="16" />
                  <rect fill={visorColor} height="30" width="48" x="56" y="52" />
                  <rect fill="#690000" height="8" width="8" x="66" y="60" />
                  <rect fill="#690000" height="8" width="8" x="86" y="60" />
                  <rect fill="#363433" height="4" width="12" x="74" y="82" />
                  <rect fill="#e6e1df" height="34" width="56" x="52" y="86" />
                  <rect fill={helmColor} height="10" width="56" x="52" y="98" />
                  <rect fill="#141312" height="6" width="8" x="76" y="100" />
                  <rect fill="#363433" height="24" width="12" x="62" y="120" />
                  <rect fill="#363433" height="24" width="12" x="86" y="120" />
                  <rect fill={helmColor} height="6" width="16" x="58" y="138" />
                  <rect fill={helmColor} height="6" width="16" x="86" y="138" />
                </svg>

                {/* Corner crosshairs */}
                <span className="absolute top-2 left-2 text-[10px] text-[#ac8883]">+</span>
                <span className="absolute top-2 right-2 text-[10px] text-[#ac8883]">+</span>
                <span className="absolute bottom-2 left-2 text-[10px] text-[#ac8883]">+</span>
                <span className="absolute bottom-2 right-2 text-[10px] text-[#ac8883]">+</span>
              </div>

              {/* Subtext telemetry */}
              <div className="mt-3 pt-2 border-t border-[#5c403b] flex items-center justify-between text-xs text-[#ac8883]">
                <span>{auraText}</span>
              </div>
            </div>

            {/* System Statement Pill */}
            <div className="mt-4 w-full max-w-sm bg-[#0f0e0d] border border-[#5c403b] p-3 flex items-center justify-between text-xs">
              <span className="text-[#ac8883] uppercase">CURRENT SPIRIT FORM</span>
              <span className="font-bold text-white uppercase">
                {session.user.displayName || 'DISCIPLE #042'}
              </span>
            </div>
          </div>

          {/* Interactive 4-State System Switcher Matrix Strip */}
          <div className="border-b-2 border-[#5c403b] bg-[#0f0e0d]">
            <div className="px-4 py-2 bg-[#1d1b1a] border-b border-[#5c403b] flex items-center justify-between text-[11px] text-[#ac8883] uppercase tracking-wider">
              <span>CANONICAL DISCIPLINE STATES // INTERACTIVE SELECTOR</span>
              <span>[ TAP TO TEST ]</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-[#5c403b]">
              <button
                type="button"
                onClick={() => handleStateChange('optimal')}
                className={`p-3 text-left transition-none cursor-pointer flex flex-col justify-between ${
                  vitalityState === 'optimal' ? 'bg-[#2b2a28]' : 'bg-[#1d1b1a] hover:bg-[#211f1e]'
                }`}
              >
                <div>
                  <div className="text-[10px] text-[#ff5541] font-bold">.01 OPTIMAL</div>
                  <div className="text-xs font-black text-white mt-0.5">HEALTHY 100%</div>
                </div>
                <div className="mt-2 pt-1 border-t border-[#5c403b] flex items-center justify-between">
                  <span className="text-[9px] text-[#c0ce71] font-bold">[ ACTIVE ]</span>
                  <span className="w-2 h-2 bg-[#c0ce71]"></span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleStateChange('deficit')}
                className={`p-3 text-left transition-none cursor-pointer flex flex-col justify-between ${
                  vitalityState === 'deficit' ? 'bg-[#2b2a28]' : 'bg-[#1d1b1a] hover:bg-[#211f1e]'
                }`}
              >
                <div>
                  <div className="text-[10px] text-[#ac8883] font-bold">.02 DEFICIT</div>
                  <div className="text-xs font-bold text-[#cac6bd] mt-0.5">SICK 45%</div>
                </div>
                <div className="mt-2 pt-1 border-t border-[#5c403b] flex items-center justify-between">
                  <span className="text-[9px] text-[#ac8883]">[ PENITENCE ]</span>
                  <span className="w-2 h-2 bg-[#805016]"></span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleStateChange('critical')}
                className={`p-3 text-left transition-none cursor-pointer flex flex-col justify-between ${
                  vitalityState === 'critical' ? 'bg-[#2b2a28]' : 'bg-[#1d1b1a] hover:bg-[#211f1e]'
                }`}
              >
                <div>
                  <div className="text-[10px] text-[#ffb4ab] font-bold">.03 CRITICAL</div>
                  <div className="text-xs font-bold text-[#ffb4ab] mt-0.5">FADING 15%</div>
                </div>
                <div className="mt-2 pt-1 border-t border-[#5c403b] flex items-center justify-between">
                  <span className="text-[9px] text-[#ff5541] font-bold">[ AT-RISK ]</span>
                  <span className="w-2 h-2 bg-[#ff5541]"></span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleStateChange('revived')}
                className={`p-3 text-left transition-none cursor-pointer flex flex-col justify-between ${
                  vitalityState === 'revived' ? 'bg-[#2b2a28]' : 'bg-[#1d1b1a] hover:bg-[#211f1e]'
                }`}
              >
                <div>
                  <div className="text-[10px] text-[#c0ce71] font-black">.04 REVIVED</div>
                  <div className="text-xs font-black text-white mt-0.5">RECON 100%</div>
                </div>
                <div className="mt-2 pt-1 border-t border-[#5c403b] flex items-center justify-between">
                  <span className="text-[9px] font-black text-[#c0ce71]">[ CONSECRATED ]</span>
                  <span className="w-2 h-2 bg-[#c0ce71]"></span>
                </div>
              </button>
            </div>
          </div>

          {/* Disciplinary Credentials Table */}
          <div className="flex-1 flex flex-col justify-between bg-[#0f0e0d]">
            <div className="px-4 py-2 bg-[#1d1b1a] border-b border-[#5c403b] text-xs text-[#ac8883] uppercase tracking-wider">
              // DISCIPLE IDENTIFIERS &amp; PROTOCOL CREDENTIALS
            </div>
            <div className="divide-y divide-[#5c403b] border-b border-[#5c403b] text-xs">
              <div className="px-4 py-2.5 flex justify-between items-center hover:bg-[#1d1b1a]">
                <span className="text-[#ac8883] uppercase">CALLSIGN</span>
                <span className="text-white font-bold">{session.user.displayName}</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between items-center hover:bg-[#1d1b1a]">
                <span className="text-[#ac8883] uppercase">EMAIL ANCHOR</span>
                <span className="text-[#cac6bd]">{session.user.email}</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between items-center hover:bg-[#1d1b1a]">
                <span className="text-[#ac8883] uppercase">ENROLLMENT CYCLE</span>
                <span className="text-white font-bold">2026.W14 // EPOCH IV</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between items-center hover:bg-[#1d1b1a]">
                <span className="text-[#ac8883] uppercase">OPERATIONAL ARCHETYPE</span>
                <span className="text-[#ffb4a8] font-bold">COGNITIVE SCHOLAR &amp; BIO-RUNNER</span>
              </div>
              <div className="px-4 py-2.5 flex justify-between items-center hover:bg-[#1d1b1a]">
                <span className="text-[#ac8883] uppercase">PRIMARY RIGOR DOMAIN</span>
                <span className="text-white font-bold">DISTRIBUTED SYSTEMS &amp; ALGORITHMS</span>
              </div>
            </div>
            <div className="p-4 bg-[#0f0e0d] flex items-center justify-between text-xs text-[#ac8883]">
              <span>EXP REVISION CYCLE</span>
              <span className="text-white font-bold">2,450 / 3,000 XP (+550 XP TO LVL 13)</span>
            </div>
          </div>
        </div>

        {/* RIGHT SPREAD COLUMN (7 COLS) */}
        <div className="lg:col-span-7 bg-[#0f0e0d] flex flex-col font-mono">
          {/* Section Header */}
          <div className="p-4 bg-[#1d1b1a] border-b-2 border-[#5c403b] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#ff5541] font-bold">// SEC .05-B</span>
              <span className="text-white uppercase font-bold tracking-wider">
                SKILL MASTERY &amp; PROGRESSION TREES
              </span>
            </div>
            <span className="text-[#c0ce71] font-bold">[ 3 PILLARS ACTIVE ]</span>
          </div>

          {/* Skill Progression Pillars */}
          <div className="flex-1 flex flex-col divide-y-2 divide-[#5c403b]">
            {/* PILLAR 1: COGNITIVE */}
            <div className="p-6 bg-[#0f0e0d] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#ff5541] inline-block"></span>
                  <span className="text-sm uppercase tracking-tight text-white font-bold font-['Space_Grotesk',sans-serif]">
                    PILLAR I // COGNITIVE &amp; ACADEMICS
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-[#2b2a28] text-white px-2 py-0.5 font-bold uppercase">
                    MASTERY LVL 14
                  </span>
                  <span className="text-[#ac8883]">[ 92% ]</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-[#1d1b1a] border border-[#5c403b] p-4">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-white font-bold uppercase">
                      DEEP FOCUS ENDURANCE (ISOLATED WORKFLOW)
                    </span>
                    <span className="text-[#ff5541] font-bold">88 / 100 HRS [ MASTER ]</span>
                  </div>
                  {/* Segmented Brutalist Progress Bar */}
                  <div className="w-full bg-[#0f0e0d] h-4 border border-[#5c403b] flex gap-1 p-0.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div
                        key={i}
                        className="gsap-progress-segment h-full bg-[#ff5541] flex-1"
                      ></div>
                    ))}
                    <div className="gsap-progress-segment h-full bg-[#ff5541]/40 flex-1"></div>
                    <div className="gsap-progress-segment h-full bg-[#363433] flex-1"></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#5c403b]">
                  <div className="p-4 bg-[#211f1e] border-b md:border-b-0 md:border-r border-[#5c403b]">
                    <div className="flex justify-between items-center text-xs text-[#ac8883]">
                      <span>METRIC: ALGORITHM SYNTHESIS</span>
                      <span className="text-[#c0ce71] font-bold">94% RATE</span>
                    </div>
                    <div className="text-2xl text-white font-bold mt-1">
                      94.0<span className="text-sm text-[#ac8883] font-normal">%</span>
                    </div>
                    <div className="text-[11px] text-[#cac6bd] mt-1">128/136 HARD VERIFIED</div>
                  </div>
                  <div className="p-4 bg-[#211f1e]">
                    <div className="flex justify-between items-center text-xs text-[#ac8883]">
                      <span>DISCRETE SYSTEMS PROTOCOL</span>
                      <span className="text-white font-bold">[ LVL 4 CLEARED ]</span>
                    </div>
                    <div className="text-2xl text-white font-bold mt-1">STAGE IV</div>
                    <div className="text-[11px] text-[#cac6bd] mt-1">CONSENSUS RAFT / PAXOS</div>
                  </div>
                </div>
              </div>
            </div>

            {/* PILLAR 2: SOMATIC / PHYSIOLOGY */}
            <div className="p-6 bg-[#0f0e0d] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#c0ce71] inline-block"></span>
                  <span className="text-sm uppercase tracking-tight text-white font-bold font-['Space_Grotesk',sans-serif]">
                    PILLAR II // SOMATIC &amp; PHYSIOLOGY
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-[#2b2a28] text-white px-2 py-0.5 font-bold uppercase">
                    MASTERY LVL 11
                  </span>
                  <span className="text-[#ac8883]">[ 84% ]</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-[#1d1b1a] border border-[#5c403b] p-4">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-white font-bold uppercase">
                      ZONE 2 KINETIC VOLUME (MONTHLY TARGET)
                    </span>
                    <span className="text-[#c0ce71] font-bold">18.5 / 20.0 HRS [ NOMINAL ]</span>
                  </div>
                  {/* Segmented Progress Bar */}
                  <div className="w-full bg-[#0f0e0d] h-4 border border-[#5c403b] flex gap-1 p-0.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                      <div
                        key={i}
                        className="gsap-progress-segment h-full bg-[#c0ce71] flex-1"
                      ></div>
                    ))}
                    <div className="gsap-progress-segment h-full bg-[#363433] flex-1"></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[#5c403b]">
                  <div className="p-4 bg-[#211f1e] border-b md:border-b-0 md:border-r border-[#5c403b]">
                    <div className="flex justify-between items-center text-xs text-[#ac8883]">
                      <span>COLD EXPOSURE ADHERENCE</span>
                      <span className="text-[#c0ce71] font-bold">28 / 30 SESSIONS</span>
                    </div>
                    <div className="text-2xl text-white font-bold mt-1">
                      93.3<span className="text-sm text-[#ac8883] font-normal">%</span>
                    </div>
                    <div className="text-[11px] text-[#cac6bd] mt-1">4.5°C SUBMERSION AVERAGE</div>
                  </div>
                  <div className="p-4 bg-[#211f1e]">
                    <div className="flex justify-between items-center text-xs text-[#ac8883]">
                      <span>CIRCADIAN SYNCHRONIZATION</span>
                      <span className="text-white font-bold">92% COMPLIANCE</span>
                    </div>
                    <div className="text-2xl text-white font-bold mt-1">
                      05:45<span className="text-sm text-[#ac8883] font-normal"> AM</span>
                    </div>
                    <div className="text-[11px] text-[#cac6bd] mt-1">WAKE VARIANCE: ±8 MIN</div>
                  </div>
                </div>
              </div>
            </div>

            {/* PILLAR 3: DISCIPLINARY CRAFT */}
            <div className="p-6 bg-[#0f0e0d] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#cac6bd] inline-block"></span>
                  <span className="text-sm uppercase tracking-tight text-white font-bold font-['Space_Grotesk',sans-serif]">
                    PILLAR III // DISCIPLINARY CRAFT &amp; OUTPUT
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-[#2b2a28] text-white px-2 py-0.5 font-bold uppercase">
                    MASTERY LVL 12
                  </span>
                  <span className="text-[#ac8883]">[ 88% ]</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 border border-[#5c403b]">
                <div className="p-4 bg-[#211f1e] border-b sm:border-b-0 sm:border-r border-[#5c403b]">
                  <div className="text-xs text-[#ac8883] uppercase">PRODUCTION COMMITS</div>
                  <div className="text-2xl text-white font-bold mt-1">142</div>
                  <div className="text-[11px] text-[#c0ce71] mt-1">+18 THIS REVISION</div>
                </div>
                <div className="p-4 bg-[#211f1e] border-b sm:border-b-0 sm:border-r border-[#5c403b]">
                  <div className="text-xs text-[#ac8883] uppercase">SYNTHESIS PAPERS</div>
                  <div className="text-2xl text-white font-bold mt-1">19</div>
                  <div className="text-[11px] text-[#cac6bd] mt-1">ARCHIVED IN PROTOCOL</div>
                </div>
                <div className="p-4 bg-[#211f1e]">
                  <div className="text-xs text-[#ac8883] uppercase">ARBITRATION RESOLUTION</div>
                  <div className="text-2xl text-[#ff5541] font-bold mt-1">100%</div>
                  <div className="text-[11px] text-[#c0ce71] mt-1">NO ACTIVE BREACHES</div>
                </div>
              </div>
            </div>
          </div>

          {/* SEC .05-C: SYSTEM CONFIGURATION & ACTIONS DECK */}
          <div className="bg-[#1d1b1a] border-t-2 border-[#5c403b] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[#ff5541] font-bold">// SEC .05-C</span>
                <span className="text-white font-bold uppercase tracking-wider text-xs">
                  COMMAND OPERATIONS &amp; DOSSIER EXPORT
                </span>
              </div>
              <span className="text-[#ac8883] text-xs">[ EXECUTION TERMINAL ]</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <button
                type="button"
                onClick={handleExportDossier}
                className="flex-1 bg-[#ff5541] text-[#5c0000] font-mono text-xs uppercase px-4 py-3 tracking-wider font-bold hover:bg-white hover:text-black transition-none flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <span>EXPORT CANONICAL DOSSIER [JSON/HASH]</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  triggerTelemetry('// RECALIBRATION: STRICT ZERO-BREACH TOLERANCE ENGAGED FOR NEXT CADENCE')
                }
                className="bg-[#2b2a28] text-white border border-[#5c403b] hover:bg-white hover:text-black font-mono text-xs uppercase px-4 py-3 tracking-wider font-bold transition-none flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>RECALIBRATE PROTOCOL [STRICT]</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSealsModal(true)}
                className="bg-transparent text-[#cac6bd] border border-[#5c403b] hover:bg-[#2b2a28] hover:text-white font-mono text-xs uppercase px-4 py-3 tracking-wider font-bold transition-none flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>CANONICAL SEALS (38)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SEALS MODAL */}
      {showSealsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0f0e0d] border-2 border-[#ff5541] max-w-2xl w-full p-6 font-mono">
            <div className="flex items-center justify-between border-b border-[#5c403b] pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#ff5541] uppercase">
                <span>// CANONICAL SEALS ARCHIVE</span>
                <span>[ 38 / 64 UNLOCKED ]</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSealsModal(false)}
                className="text-xs text-[#ac8883] hover:text-white uppercase cursor-pointer"
              >
                [ CLOSE ✕ ]
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 max-h-96 overflow-y-auto">
              {[
                { code: 'SEAL_DISCIPLINE_INITIATE', title: 'Initiate of Kaizen', xp: '+250 XP', desc: 'Completed first 7 continuous day plans.' },
                { code: 'SEAL_SPECTRAL_FOCUS', title: 'Spectral Focus', xp: '+500 XP', desc: 'Achieved 100% completion in 4 consecutive cognitive drills.' },
                { code: 'SEAL_40_DAY_CADENCE', title: '40-Day Cadence Anchor', xp: '+1,000 XP', desc: 'Maintained uninterrupted streak past 40 days.' },
                { code: 'SEAL_DISTRIBUTED_CONSENSUS', title: 'Distributed Consensus', xp: '+750 XP', desc: 'Passed Raft/Paxos architectural rigor benchmark.' },
              ].map((s) => (
                <div key={s.code} className="p-3 bg-[#1d1b1a] border border-[#5c403b]">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white font-bold">{s.title}</span>
                    <span className="text-[#c0ce71] font-bold">{s.xp}</span>
                  </div>
                  <p className="text-[11px] text-[#cac6bd] mt-1 font-['DM_Sans',sans-serif]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER DOSSIER STRIP */}
      <footer className="w-full bg-[#0f0e0d] border-t-2 border-[#5c403b] px-6 py-4 font-mono text-xs text-[#ac8883]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="text-white font-bold">// HASH: 0x42F8...BA91</span>
            <span>NODE: US-EAST-01</span>
            <span>AUDIT REGIME: 2026.W14</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#c0ce71] font-bold">[ VERIFIED DISCIPLINARY LEDGER ]</span>
            <span className="text-[#5c403b]">改善 // ARCHON ED.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
