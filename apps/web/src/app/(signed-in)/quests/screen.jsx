'use client';

import { useState } from 'react';
import { screenApi } from '../../../api/client.js';
import { SessionScreen } from '../../../api/session-screen.jsx';

export function QuestsScreen() {
  return (
    <SessionScreen>
      {(session, scope, revision) => (
        <QuestsStitchContent session={session} scope={scope} revision={revision} />
      )}
    </SessionScreen>
  );
}

export default QuestsScreen;

function QuestsStitchContent({ session }) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [completedQuests, setCompletedQuests] = useState(new Set(['q-essay']));
  const [toastMessage, setToastMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Academic');
  const [newDifficulty, setNewDifficulty] = useState('MEDIUM');
  const [newMinutes, setNewMinutes] = useState('30');

  function triggerToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }

  function toggleComplete(id, xp, title) {
    setCompletedQuests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        triggerToast(`REVERTED // ${title} RETURNED TO PENDING`);
      } else {
        next.add(id);
        triggerToast(`VERIFIED SECURE // +${xp} XP ACCRUED FOR ${title}`);
      }
      return next;
    });
  }

  function handleCreateQuest(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    triggerToast(`INITIALIZED // NEW QUEST "${newTitle.toUpperCase()}" ADDED TO LEDGER`);
    setNewTitle('');
    setIsCreating(false);
  }

  return (
    <div className="flex flex-col w-full bg-[#141312] text-[#e6e1df] font-['DM_Sans',sans-serif] selection:bg-[#ff5541] selection:text-[#5c0000]">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#ff5541] text-[#5c0000] px-4 py-2 font-mono text-xs font-bold tracking-wider uppercase border border-[#5c0000] shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* TOP SYSTEM / FILTER BANNER */}
      <section className="w-full bg-[#0f0e0d] border-b-2 border-[#5c403b]">
        <div className="flex flex-col lg:flex-row lg:items-stretch justify-between">
          {/* Dominant Header Block */}
          <div className="p-6 lg:border-r-2 lg:border-[#5c403b] flex-1">
            <div className="flex items-center gap-3 font-mono text-xs text-[#ac8883] uppercase tracking-wider">
              <span className="text-[#ff5541] font-bold">// OPERATIONAL DISPATCH</span>
              <span>// CADENCE 2026</span>
              <span>// CYCLE SEC.02</span>
            </div>
            <div className="mt-3 flex flex-col md:flex-row md:items-baseline md:gap-6">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[#e6e1df] leading-none m-0 font-['Space_Grotesk',sans-serif]">
                .02 QUESTS
              </h1>
              <span className="font-mono text-xs uppercase tracking-tight text-[#cac6bd] font-bold mt-1 md:mt-0">
                EXECUTION TARGETS AND KNOWLEDGE DRILLS.
              </span>
            </div>
          </div>

          {/* Right-Aligned Filter Bar (Abutting Rectangular Blocks) */}
          <div className="flex flex-wrap lg:flex-nowrap border-t-2 lg:border-t-0 border-[#5c403b] items-stretch font-mono text-xs font-bold uppercase">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`flex-1 lg:flex-none px-6 py-4 border-r border-[#5c403b] flex items-center justify-center gap-2 transition-none cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-[#ff5541] text-[#5c0000]'
                  : 'bg-[#1d1b1a] text-[#cac6bd] hover:bg-[#2b2a28] hover:text-white'
              }`}
            >
              <span>ALL</span>
              <span className="text-[10px] opacity-75">(6)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('DAILY')}
              className={`flex-1 lg:flex-none px-6 py-4 border-r border-[#5c403b] flex items-center justify-center gap-2 transition-none cursor-pointer ${
                activeFilter === 'DAILY'
                  ? 'bg-[#ff5541] text-[#5c0000]'
                  : 'bg-[#1d1b1a] text-[#cac6bd] hover:bg-[#2b2a28] hover:text-white'
              }`}
            >
              <span>DAILY</span>
              <span className="text-[10px] opacity-75">(4)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('WEEKLY')}
              className={`flex-1 lg:flex-none px-6 py-4 border-r border-[#5c403b] flex items-center justify-center gap-2 transition-none cursor-pointer ${
                activeFilter === 'WEEKLY'
                  ? 'bg-[#ff5541] text-[#5c0000]'
                  : 'bg-[#1d1b1a] text-[#cac6bd] hover:bg-[#2b2a28] hover:text-white'
              }`}
            >
              <span>WEEKLY</span>
              <span className="text-[10px] opacity-75">(2)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('COMPLETED')}
              className={`flex-1 lg:flex-none px-6 py-4 flex items-center justify-center gap-2 transition-none cursor-pointer ${
                activeFilter === 'COMPLETED'
                  ? 'bg-[#c0ce71] text-[#2d3400]'
                  : 'bg-[#1d1b1a] text-[#cac6bd] hover:bg-[#2b2a28] hover:text-white'
              }`}
            >
              <span>COMPLETED</span>
              <span className="text-[10px] opacity-75">({completedQuests.size})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex-1 lg:flex-none px-6 py-4 bg-[#c0ce71] text-[#2d3400] hover:bg-white hover:text-black flex items-center justify-center gap-2 transition-none cursor-pointer border-l border-[#5c403b]"
            >
              <span>+ NEW QUEST</span>
            </button>
          </div>
        </div>
      </section>

      {/* CREATE QUEST DRAWER */}
      {isCreating && (
        <section className="bg-[#1d1b1a] border-b-2 border-[#ff5541] p-6 font-mono">
          <div className="flex items-center justify-between pb-4 border-b border-[#5c403b]">
            <h2 className="text-sm font-bold uppercase text-[#ff5541] tracking-wider">
              // INITIALIZE NEW TARGET DIRECTIVE
            </h2>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-[#ac8883] hover:text-white uppercase cursor-pointer"
            >
              [ CANCEL ]
            </button>
          </div>
          <form onSubmit={handleCreateQuest} className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] text-[#ac8883] uppercase mb-1">
                Directive / Title
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="E.G. REAL ANALYSIS: LEBESGUE INTEGRALS"
                className="w-full bg-[#0f0e0d] border border-[#5c403b] px-3 py-2 text-sm text-white uppercase focus:border-[#ff5541] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#ac8883] uppercase mb-1">
                Pillar Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-[#0f0e0d] border border-[#5c403b] px-3 py-2 text-sm text-white uppercase focus:border-[#ff5541] focus:outline-none"
              >
                <option value="Academic">Cognitive // Academic</option>
                <option value="Physical">Physical // Conditioning</option>
                <option value="Productivity">Craft // Engineering</option>
                <option value="Language">Cognitive // Language</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[#ac8883] uppercase mb-1">
                Difficulty / Yield
              </label>
              <select
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(e.target.value)}
                className="w-full bg-[#0f0e0d] border border-[#5c403b] px-3 py-2 text-sm text-white uppercase focus:border-[#ff5541] focus:outline-none"
              >
                <option value="EASY">EASY (+60 XP)</option>
                <option value="MEDIUM">MEDIUM (+120 XP)</option>
                <option value="HARD">HARD (+180 XP)</option>
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end gap-3 mt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-[#ff5541] text-[#5c0000] font-bold text-xs uppercase hover:bg-white transition-none cursor-pointer"
              >
                COMMIT TARGET TO LEDGER →
              </button>
            </div>
          </form>
        </section>
      )}

      {/* COMMAND METRIC RIBBON (4 zero-gap butted modules) */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b-2 border-[#5c403b] bg-[#5c403b] gap-[1px]">
        {/* Module 1 */}
        <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
          <div className="font-mono text-[10px] text-[#ac8883] uppercase flex items-center justify-between">
            <span>AVAILABLE TODAY</span>
            <span>// 04</span>
          </div>
          <div className="my-3 font-mono text-5xl font-black text-[#e6e1df] leading-none tracking-tighter">
            04
          </div>
          <div className="font-mono text-[10px] uppercase text-[#cac6bd] font-bold border-t border-[#2b2a28] pt-2">
            SCHEDULED EXECUTION
          </div>
        </div>

        {/* Module 2 */}
        <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
          <div className="font-mono text-[10px] text-[#ac8883] uppercase flex items-center justify-between">
            <span>DISCIPLINE RATIO</span>
            <span className="text-[#c0ce71]">75% DONE</span>
          </div>
          <div className="my-3 font-mono text-5xl font-black text-[#c0ce71] leading-none tracking-tighter">
            75%
          </div>
          <div className="font-mono text-[10px] uppercase text-[#cac6bd] font-bold border-t border-[#2b2a28] pt-2">
            3 OF 4 TARGETS CLEARED
          </div>
        </div>

        {/* Module 3 */}
        <div className="bg-[#0f0e0d] p-6 flex flex-col justify-between">
          <div className="font-mono text-[10px] text-[#ac8883] uppercase flex items-center justify-between">
            <span>PERSEVERANCE MATRIX</span>
            <span className="text-[#ff5541] font-bold">ACTIVE STREAK</span>
          </div>
          <div className="my-3 font-mono text-5xl font-black text-[#ff5541] leading-none tracking-tighter">
            42D
          </div>
          <div className="font-mono text-[10px] uppercase text-[#cac6bd] font-bold border-t border-[#2b2a28] pt-2">
            CONTINUOUS ACCRUAL
          </div>
        </div>

        {/* Module 4 (Inverted Cream High-Contrast Block) */}
        <div className="bg-[#f5f0e6] text-[#141312] p-6 flex flex-col justify-between">
          <div className="font-mono text-[10px] uppercase flex items-center justify-between font-bold text-[#494740]">
            <span>TOTAL YIELD</span>
            <span className="bg-[#141312] text-[#f5f0e6] px-1 py-0.5 text-[9px]">EST. DAY</span>
          </div>
          <div className="my-3 font-mono text-5xl font-black text-[#141312] leading-none tracking-tighter">
            +450<span className="text-xl tracking-normal ml-1">XP</span>
          </div>
          <div className="font-mono text-[10px] uppercase font-bold text-[#141312] border-t border-[#d2cab9] pt-2 flex justify-between items-center">
            <span>LVL 12 // 2,450 / 3,000 XP</span>
            <span>[ 81.6% ]</span>
          </div>
        </div>
      </section>

      {/* ASYMMETRIC QUEST ROSTER (Stitch Layout Zero-Gap Grid) */}
      <section className="w-full grid grid-cols-1 lg:grid-cols-12 bg-[#5c403b] gap-[1px] border-b-2 border-[#5c403b]">
        {/* HERO QUEST MODULE (7 Columns) */}
        <article className="lg:col-span-7 bg-[#0f0e0d] flex flex-col justify-between p-0">
          <div>
            {/* Accent Header Block */}
            <div className="bg-[#ff5541] text-[#5c0000] p-4 flex flex-wrap items-center justify-between gap-2 font-mono text-xs font-bold uppercase">
              <div className="flex items-center gap-2">
                <span className="bg-[#141312] text-[#ff5541] px-1.5 py-0.5">PRIORITY 01</span>
                <span>ACTIVE FOCUS // .01 ACADEMICS</span>
              </div>
              <div className="flex items-center gap-4">
                <span>45 MIN</span>
                <span>//</span>
                <span>MEDIUM</span>
                <span className="bg-[#5c0000] text-[#ffdad4] px-2 py-0.5">+120 XP</span>
              </div>
            </div>

            {/* Quest Content */}
            <div className="p-8">
              <div className="font-mono text-xs text-[#ac8883] uppercase tracking-wider mb-2">
                REF // MAT-408-SPECTRAL
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-[#e6e1df] uppercase tracking-tight leading-tight font-['Space_Grotesk',sans-serif] m-0">
                LINEAR ALGEBRA: EIGENVECTORS & SVD DRILL
              </h2>
              <p className="text-sm text-[#cac6bd] mt-4 leading-relaxed max-w-2xl">
                Rigorous matrix factorization drill covering coordinate transforms, rank nullity, and spectral theorems. 12 problems without calculator assistance. Focus on geometric intuition of singular value decomposition.
              </p>

              {/* Telemetry Specs Micro-Grid */}
              <div className="grid grid-cols-3 gap-[1px] bg-[#5c403b] border border-[#5c403b] mt-6 max-w-xl font-mono">
                <div className="bg-[#1d1b1a] p-3">
                  <span className="text-[10px] text-[#ac8883] uppercase block">DIFFICULTY</span>
                  <span className="text-xs text-white font-bold uppercase">TIER 03</span>
                </div>
                <div className="bg-[#1d1b1a] p-3">
                  <span className="text-[10px] text-[#ac8883] uppercase block">COMPLETION RATE</span>
                  <span className="text-xs text-[#c0ce71] font-bold uppercase">92.4%</span>
                </div>
                <div className="bg-[#1d1b1a] p-3">
                  <span className="text-[10px] text-[#ac8883] uppercase block">ALLOCATED</span>
                  <span className="text-xs text-[#ff5541] font-bold uppercase">45:00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="border-t-2 border-[#5c403b] p-4 bg-[#1d1b1a] flex items-center justify-between font-mono">
            <div className="text-xs text-[#ac8883] uppercase">
              STATUS:{' '}
              {completedQuests.has('q-svd') ? (
                <span className="text-[#c0ce71] font-bold">[ COMPLETED // BANKED ]</span>
              ) : (
                <span className="text-[#ff5541] font-bold">[ PENDING VALIDATION ]</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => toggleComplete('q-svd', 120, 'Linear Algebra SVD')}
              className={`px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-none cursor-pointer ${
                completedQuests.has('q-svd')
                  ? 'bg-[#141312] text-[#c0ce71] border border-[#c0ce71] hover:bg-[#c0ce71] hover:text-black'
                  : 'bg-[#ff5541] text-[#5c0000] hover:bg-white hover:text-black'
              }`}
            >
              {completedQuests.has('q-svd') ? 'REVERT STATUS' : 'COMPLETE DIRECTIVE'}
            </button>
          </div>
        </article>

        {/* SECONDARY QUEST MODULE (5 Columns) */}
        <article className="lg:col-span-5 bg-[#1d1b1a] flex flex-col justify-between p-0">
          <div>
            <div className="border-b border-[#5c403b] p-4 flex items-center justify-between font-mono text-xs uppercase text-[#ac8883]">
              <div className="flex items-center gap-2 text-[#e6e1df] font-bold">
                <span className="w-2 h-2 bg-[#ff5541] inline-block"></span>
                <span>ACADEMICS // 60 MIN</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#ffb4ab] font-bold">HARD</span>
                <span className="text-[#c0ce71] font-bold bg-[#0f0e0d] px-1.5 py-0.5 border border-[#5c403b]">
                  +150 XP
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="font-mono text-[10px] text-[#ac8883] uppercase">REF // CS-201-INDCT</div>
              <h3 className="text-xl font-bold text-[#e6e1df] uppercase tracking-tight mt-1 font-['Space_Grotesk',sans-serif]">
                DISCRETE MATH INDUCTION PROOFS
              </h3>
              <p className="text-xs text-[#cac6bd] mt-2 leading-relaxed">
                Formulate complete structural and strong induction proofs across recursively defined graphs and summation sequences. Verify base cases and inductive steps rigorously.
              </p>
              <div className="mt-4 p-3 bg-[#0f0e0d] border border-[#5c403b] flex items-center justify-between font-mono">
                <span className="text-[10px] text-[#ac8883] uppercase">PROOF REQUIREMENTS</span>
                <span className="text-[10px] text-white font-bold uppercase">5 LEMMAS ENUMERATED</span>
              </div>
            </div>
          </div>
          <div className="border-t border-[#5c403b] p-4 bg-[#0f0e0d] flex items-center justify-between font-mono">
            <span className="text-[10px] text-[#ac8883] uppercase">EST: 60M // DISPATCH READY</span>
            <button
              type="button"
              onClick={() => toggleComplete('q-induction', 150, 'Discrete Math Proofs')}
              className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-none cursor-pointer ${
                completedQuests.has('q-induction')
                  ? 'bg-[#141312] text-[#c0ce71] border border-[#c0ce71]'
                  : 'bg-[#2b2a28] text-white border border-[#5c403b] hover:bg-white hover:text-black'
              }`}
            >
              {completedQuests.has('q-induction') ? 'REVERT' : 'COMPLETE'}
            </button>
          </div>
        </article>

        {/* THIRD QUEST MODULE (Engineering - 4 Columns) */}
        <article className="lg:col-span-4 bg-[#0f0e0d] flex flex-col justify-between p-0">
          <div>
            <div className="border-b border-[#5c403b] p-4 flex items-center justify-between font-mono text-xs uppercase text-[#ac8883]">
              <span className="text-[#e6e1df] font-bold">ENGINEERING // 30 MIN</span>
              <div className="flex items-center gap-3">
                <span>MEDIUM</span>
                <span className="text-[#c0ce71] font-bold">+90 XP</span>
              </div>
            </div>
            <div className="p-6">
              <div className="font-mono text-[10px] text-[#ac8883] uppercase">REF // ENG-4092-CR</div>
              <h3 className="text-lg font-bold text-[#e6e1df] uppercase tracking-tight mt-1 font-['Space_Grotesk',sans-serif]">
                SPRINT 4 PULL REQUEST REVIEW
              </h3>
              <p className="text-xs text-[#cac6bd] mt-2 leading-relaxed">
                Thorough architectural scrutiny of 3 backend services PRs. Verify concurrency safety, idempotency constraints, and comprehensive unit tests.
              </p>
            </div>
          </div>
          <div className="border-t border-[#5c403b] p-4 bg-[#1d1b1a] flex items-center justify-between font-mono">
            <span className="text-[10px] text-[#ac8883] uppercase">3 PRs QUEUED</span>
            <button
              type="button"
              onClick={() => toggleComplete('q-pr', 90, 'Sprint PR Review')}
              className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-none cursor-pointer ${
                completedQuests.has('q-pr')
                  ? 'bg-[#141312] text-[#c0ce71] border border-[#c0ce71]'
                  : 'bg-[#2b2a28] text-white border border-[#5c403b] hover:bg-white hover:text-black'
              }`}
            >
              {completedQuests.has('q-pr') ? 'REVERT' : 'COMPLETE'}
            </button>
          </div>
        </article>

        {/* FOURTH QUEST MODULE (Writing - COMPLETED TASK - 4 Columns) */}
        <article className="lg:col-span-4 bg-[#1d1b1a] flex flex-col justify-between p-0 opacity-80 hover:opacity-100 transition-opacity">
          <div>
            <div className="bg-[#2b2a28] p-4 flex items-center justify-between font-mono text-xs uppercase">
              <div className="flex items-center gap-2 text-[#c0ce71] font-bold">
                <span className="w-2.5 h-2.5 bg-[#c0ce71] inline-block"></span>
                <span>[ COMPLETED ]</span>
              </div>
              <span className="text-[#c0ce71] font-bold uppercase">+90 XP (BANKED)</span>
            </div>
            <div className="p-6">
              <div className="font-mono text-[10px] text-[#ac8883] uppercase">REF // WRT-104-ESSAY</div>
              <h3 className="text-lg font-bold text-[#ac8883] uppercase tracking-tight line-through mt-1 font-['Space_Grotesk',sans-serif]">
                WRITE 500-WORD ESSAY DRAFT
              </h3>
              <p className="text-xs text-[#ac8883] mt-2 leading-relaxed">
                Synthesize thesis arguments regarding automated state machines and distributed failure modes. Draft logged in dossier archives.
              </p>
              <div className="mt-4 font-mono text-[10px] text-[#ac8883] uppercase">
                CLEARED: 08:42:15Z // RECORDED
              </div>
            </div>
          </div>
          <div className="border-t border-[#5c403b] p-4 bg-[#0f0e0d] flex items-center justify-between font-mono">
            <span className="text-[10px] text-[#ac8883] uppercase">VERIFIED SECURE</span>
            <button
              type="button"
              onClick={() => toggleComplete('q-essay', 90, '500-Word Essay')}
              className="px-4 py-2 bg-[#141312] text-[#ac8883] border border-[#5c403b] font-mono text-xs font-bold uppercase tracking-wider hover:text-[#ff5541] hover:border-[#ff5541] transition-none cursor-pointer"
            >
              UNDO
            </button>
          </div>
        </article>

        {/* FIFTH QUEST MODULE (Health - 4 Columns) */}
        <article className="lg:col-span-4 bg-[#0f0e0d] flex flex-col justify-between p-0">
          <div>
            <div className="border-b border-[#5c403b] p-4 flex items-center justify-between font-mono text-xs uppercase text-[#ac8883]">
              <span className="text-[#e6e1df] font-bold">HEALTH // 20 MIN</span>
              <div className="flex items-center gap-3">
                <span className="text-[#c0ce71] font-bold">EASY</span>
                <span className="text-[#c0ce71] font-bold">+60 XP</span>
              </div>
            </div>
            <div className="p-6">
              <div className="font-mono text-[10px] text-[#ac8883] uppercase">REF // BIO-220-REC</div>
              <h3 className="text-lg font-bold text-[#e6e1df] uppercase tracking-tight mt-1 font-['Space_Grotesk',sans-serif]">
                DEEP SLEEP COLD THERAPY ROUTINE
              </h3>
              <p className="text-xs text-[#cac6bd] mt-2 leading-relaxed">
                Core temperature suppression protocol: cold immersion followed by complete blue-light isolation protocol prior to 22:00Z.
              </p>
            </div>
          </div>
          <div className="border-t border-[#5c403b] p-4 bg-[#1d1b1a] flex items-center justify-between font-mono">
            <span className="text-[10px] text-[#ac8883] uppercase">CADENCE // NOCTURNAL</span>
            <button
              type="button"
              onClick={() => toggleComplete('q-sleep', 60, 'Cold Therapy Routine')}
              className={`px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-none cursor-pointer ${
                completedQuests.has('q-sleep')
                  ? 'bg-[#141312] text-[#c0ce71] border border-[#c0ce71]'
                  : 'bg-[#2b2a28] text-white border border-[#5c403b] hover:bg-white hover:text-black'
              }`}
            >
              {completedQuests.has('q-sleep') ? 'REVERT' : 'COMPLETE'}
            </button>
          </div>
        </article>

        {/* SIXTH QUEST MODULE (Engineering / NetSec - Full Span 12 Columns Strip) */}
        <article className="lg:col-span-12 bg-[#1d1b1a] flex flex-col md:flex-row items-stretch justify-between p-0 border-t border-[#5c403b]">
          <div className="p-6 flex-1">
            <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase">
              <span className="bg-[#2b2a28] text-white px-2 py-0.5 font-bold">ENGINEERING / NETSEC</span>
              <span className="text-[#ac8883]">REF // SEC-889-WIRE</span>
              <span className="text-[#ac8883]">50 MIN // MEDIUM</span>
              <span className="text-[#c0ce71] font-bold">+140 XP</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-[#e6e1df] uppercase tracking-tight mt-2 font-['Space_Grotesk',sans-serif]">
              NETWORK PACKET ANALYSIS WIRESHARK
            </h3>
            <p className="text-xs text-[#cac6bd] mt-1 max-w-4xl leading-relaxed">
              Trace anomalies, asymmetric routing signatures, and handshakes within simulated TLS 1.3 degradation dumps. Map attack surfaces and export PCAP verification file.
            </p>
          </div>
          <div className="p-6 bg-[#0f0e0d] border-t md:border-t-0 md:border-l border-[#5c403b] flex flex-col justify-center items-end min-w-[240px]">
            <button
              type="button"
              onClick={() => toggleComplete('q-wireshark', 140, 'Wireshark NetSec Analysis')}
              className={`px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-none cursor-pointer w-full text-center ${
                completedQuests.has('q-wireshark')
                  ? 'bg-[#141312] text-[#c0ce71] border border-[#c0ce71]'
                  : 'bg-[#ff5541] text-[#5c0000] hover:bg-white hover:text-black'
              }`}
            >
              {completedQuests.has('q-wireshark') ? 'REVERT DIRECTIVE' : 'VALIDATE & COMPLETE'}
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
