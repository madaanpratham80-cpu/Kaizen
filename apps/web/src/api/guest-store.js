/**
 * Instant Evaluation Guest Operator Data Store
 * Provides persistent in-memory / local-storage state for evaluating
 * the full Kaizen UI without requiring the Express / PostgreSQL backend.
 */

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

const STORAGE_KEY = 'kaizen_guest_state_v1';

function initialGuestState() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const occurrences = [
    {
      id: '00000000-0000-0000-0000-000000000101',
      userId: '00000000-0000-0000-0000-000000000001',
      questId: '00000000-0000-0000-0000-000000000201',
      dayPlanId: '00000000-0000-0000-0000-000000000010',
      title: 'Linear Algebra: Eigenvectors & SVD Drill',
      category: 'Academic',
      pillar: 'Cognitive',
      difficulty: 'MEDIUM',
      target: 1,
      ruleVersion: 1,
      planned: true,
      status: 'PENDING',
      completedAt: null,
      rewardXp: 120,
    },
    {
      id: '00000000-0000-0000-0000-000000000102',
      userId: '00000000-0000-0000-0000-000000000001',
      questId: '00000000-0000-0000-0000-000000000202',
      dayPlanId: '00000000-0000-0000-0000-000000000010',
      title: 'Discrete Math Induction Proofs',
      category: 'Academic',
      pillar: 'Cognitive',
      difficulty: 'HARD',
      target: 1,
      ruleVersion: 1,
      planned: true,
      status: 'PENDING',
      completedAt: null,
      rewardXp: 150,
    },
    {
      id: '00000000-0000-0000-0000-000000000103',
      userId: '00000000-0000-0000-0000-000000000001',
      questId: '00000000-0000-0000-0000-000000000203',
      dayPlanId: '00000000-0000-0000-0000-000000000010',
      title: 'Sprint 4 Pull Request Review',
      category: 'Productivity',
      pillar: 'Craft',
      difficulty: 'MEDIUM',
      target: 1,
      ruleVersion: 1,
      planned: true,
      status: 'PENDING',
      completedAt: null,
      rewardXp: 90,
    },
    {
      id: '00000000-0000-0000-0000-000000000104',
      userId: '00000000-0000-0000-0000-000000000001',
      questId: '00000000-0000-0000-0000-000000000204',
      dayPlanId: '00000000-0000-0000-0000-000000000010',
      title: 'Deep Sleep Cold Therapy Routine',
      category: 'Physical',
      pillar: 'Physical',
      difficulty: 'EASY',
      target: 1,
      ruleVersion: 1,
      planned: true,
      status: 'PENDING',
      completedAt: null,
      rewardXp: 60,
    },
  ];

  const quests = [
    {
      id: '00000000-0000-0000-0000-000000000201',
      userId: '00000000-0000-0000-0000-000000000001',
      title: 'Linear Algebra: Eigenvectors & SVD Drill',
      category: 'Academic',
      pillar: 'Cognitive',
      archivedAt: null,
      archiveEffectiveDate: null,
      version: 1,
      schedules: [
        {
          id: '00000000-0000-0000-0000-000000000301',
          userId: '00000000-0000-0000-0000-000000000001',
          questId: '00000000-0000-0000-0000-000000000201',
          title: 'Linear Algebra: Eigenvectors & SVD Drill',
          category: 'Academic',
          pillar: 'Cognitive',
          difficulty: 'MEDIUM',
          target: 1,
          ruleVersion: 1,
          effectiveFrom: now.toISOString(),
          effectiveTo: null,
          recurrence: 'DAILY',
          weekdays: [1, 2, 3, 4, 5, 6, 7],
        },
      ],
    },
    {
      id: '00000000-0000-0000-0000-000000000202',
      userId: '00000000-0000-0000-0000-000000000001',
      title: 'Discrete Math Induction Proofs',
      category: 'Academic',
      pillar: 'Cognitive',
      archivedAt: null,
      archiveEffectiveDate: null,
      version: 1,
      schedules: [
        {
          id: '00000000-0000-0000-0000-000000000302',
          userId: '00000000-0000-0000-0000-000000000001',
          questId: '00000000-0000-0000-0000-000000000202',
          title: 'Discrete Math Induction Proofs',
          category: 'Academic',
          pillar: 'Cognitive',
          difficulty: 'HARD',
          target: 1,
          ruleVersion: 1,
          effectiveFrom: now.toISOString(),
          effectiveTo: null,
          recurrence: 'WEEKLY',
          weekdays: [2, 4],
        },
      ],
    },
    {
      id: '00000000-0000-0000-0000-000000000203',
      userId: '00000000-0000-0000-0000-000000000001',
      title: 'Sprint 4 Pull Request Review',
      category: 'Productivity',
      pillar: 'Craft',
      archivedAt: null,
      archiveEffectiveDate: null,
      version: 1,
      schedules: [
        {
          id: '00000000-0000-0000-0000-000000000303',
          userId: '00000000-0000-0000-0000-000000000001',
          questId: '00000000-0000-0000-0000-000000000203',
          title: 'Sprint 4 Pull Request Review',
          category: 'Productivity',
          pillar: 'Craft',
          difficulty: 'MEDIUM',
          target: 1,
          ruleVersion: 1,
          effectiveFrom: now.toISOString(),
          effectiveTo: null,
          recurrence: 'DAILY',
          weekdays: [1, 2, 3, 4, 5],
        },
      ],
    },
    {
      id: '00000000-0000-0000-0000-000000000204',
      userId: '00000000-0000-0000-0000-000000000001',
      title: 'Deep Sleep Cold Therapy Routine',
      category: 'Physical',
      pillar: 'Physical',
      archivedAt: null,
      archiveEffectiveDate: null,
      version: 1,
      schedules: [
        {
          id: '00000000-0000-0000-0000-000000000304',
          userId: '00000000-0000-0000-0000-000000000001',
          questId: '00000000-0000-0000-0000-000000000204',
          title: 'Deep Sleep Cold Therapy Routine',
          category: 'Physical',
          pillar: 'Physical',
          difficulty: 'EASY',
          target: 1,
          ruleVersion: 1,
          effectiveFrom: now.toISOString(),
          effectiveTo: null,
          recurrence: 'DAILY',
          weekdays: [1, 2, 3, 4, 5, 6, 7],
        },
      ],
    },
    {
      id: '00000000-0000-0000-0000-000000000205',
      userId: '00000000-0000-0000-0000-000000000001',
      title: 'Network Packet Analysis Wireshark',
      category: 'Productivity',
      pillar: 'Craft',
      archivedAt: null,
      archiveEffectiveDate: null,
      version: 1,
      schedules: [
        {
          id: '00000000-0000-0000-0000-000000000305',
          userId: '00000000-0000-0000-0000-000000000001',
          questId: '00000000-0000-0000-0000-000000000205',
          title: 'Network Packet Analysis Wireshark',
          category: 'Productivity',
          pillar: 'Craft',
          difficulty: 'MEDIUM',
          target: 1,
          ruleVersion: 1,
          effectiveFrom: now.toISOString(),
          effectiveTo: null,
          recurrence: 'WEEKLY',
          weekdays: [1, 3, 5],
        },
      ],
    },
  ];

  return {
    health: 85,
    totalXp: 8420,
    currentStreak: 42,
    bestStreak: 42,
    stateVersion: 1,
    level: 12,
    xpIntoLevel: 420,
    occurrences,
    quests,
    goals: [
      'Master Spectral Theorems & SVD',
      'Maintain 42-day continuous streak',
      'Daily cold recovery cadence',
    ],
    displayName: 'DISCIPLE #042',
    timezone:
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
        : 'UTC',
  };
}

let memoryState = null;

export function loadGuestState() {
  if (memoryState) return memoryState;
  const storage = getStorage();
  if (storage) {
    try {
      const saved = storage.getItem(STORAGE_KEY);
      if (saved) {
        memoryState = JSON.parse(saved);
        return memoryState;
      }
    } catch {}
  }
  memoryState = initialGuestState();
  return memoryState;
}

export function saveGuestState(state) {
  memoryState = state;
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }
}

export function isGuestMode() {
  if (typeof document === 'undefined') return false;
  return (
    document.cookie.includes('kaizen_guest=true') ||
    (typeof window !== 'undefined' &&
      window.localStorage?.getItem('kaizen_guest_mode') === 'true')
  );
}

export function getGuestToday() {
  const state = loadGuestState();
  const now = new Date();
  const priority = state.occurrences[0] || null;

  return {
    status: 'ready',
    plan: {
      id: '00000000-0000-0000-0000-000000000010',
      userId: '00000000-0000-0000-0000-000000000001',
      localDate: now.toISOString(),
      timezoneSnapshot: state.timezone,
      startsAtUtc: now.toISOString(),
      deadlineUtc: new Date(now.getTime() + 86400000).toISOString(),
      status: 'ACTIVE',
      priorityId: priority ? priority.id : null,
      priorityLockedAt: null,
      plannedCount: state.occurrences.length,
      healthGainAccounted: 0,
      streakApplied: true,
      closedAt: null,
    },
    occurrences: state.occurrences,
    priority,
    health: state.health,
    totalXp: state.totalXp,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    stateVersion: state.stateVersion,
    recoveryHint: null,
  };
}

export function getGuestQuests(query = {}) {
  const state = loadGuestState();
  let list = [...state.quests];
  if (query.category) {
    list = list.filter((q) => q.category === query.category);
  }
  if (query.archived !== undefined) {
    list = list.filter((q) => (query.archived ? q.archivedAt : !q.archivedAt));
  }
  return {
    quests: list,
    nextCursor: null,
  };
}

export function completeGuestOccurrence(occurrenceId) {
  const state = loadGuestState();
  const index = state.occurrences.findIndex((o) => o.id === occurrenceId);
  if (index === -1) {
    throw new Error('Occurrence not found');
  }

  const occ = state.occurrences[index];
  const isAlready = occ.status === 'COMPLETED';

  if (!isAlready) {
    occ.status = 'COMPLETED';
    occ.completedAt = new Date().toISOString();
    state.totalXp += occ.rewardXp;
    state.health = Math.min(100, state.health + 5);
    state.stateVersion += 1;
    saveGuestState(state);
  }

  return {
    status: isAlready ? 'alreadyCompleted' : 'completed',
    occurrence: {
      id: occ.id,
      status: 'COMPLETED',
      completedAt: occ.completedAt || new Date().toISOString(),
    },
    xpDelta: isAlready ? 0 : occ.rewardXp,
    healthDelta: isAlready ? 0 : 5,
    eventIds: ['00000000-0000-0000-0000-000000000999'],
    seals: [],
    health: state.health,
    totalXp: state.totalXp,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    stateVersion: state.stateVersion,
  };
}

export function getGuestHabits(week) {
  const now = new Date();
  const weekStart = week || now.toISOString().slice(0, 10);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - (6 - i) * 86400000);
    days.push({
      date: d.toISOString().slice(0, 10),
      id: `00000000-0000-0000-0000-00000000090${i}`,
      status: i === 6 ? 'ACTIVE' : i === 2 ? 'REST' : 'OPEN',
      timing: i === 6 ? 'today' : 'elapsed',
      occurrences: [
        {
          id: `00000000-0000-0000-0000-00000000080${i}`,
          questId: '00000000-0000-0000-0000-000000000201',
          title: 'Linear Algebra: Eigenvectors & SVD Drill',
          target: 1,
          status: i < 5 ? 'COMPLETED' : 'PENDING',
        },
      ],
    });
  }

  return {
    week: weekStart,
    habits: [
      {
        questId: '00000000-0000-0000-0000-000000000201',
        title: 'Linear Algebra: Eigenvectors & SVD Drill',
        streak: { current: 42, best: 42 },
        completionRate: 0.92,
        cells: [
          { date: days[0].date, label: 'Completed' },
          { date: days[1].date, label: 'Completed' },
          { date: days[2].date, label: 'Rest' },
          { date: days[3].date, label: 'Completed' },
          { date: days[4].date, label: 'Completed' },
          { date: days[5].date, label: 'Completed' },
          { date: days[6].date, label: 'Pending' },
        ],
      },
      {
        questId: '00000000-0000-0000-0000-000000000204',
        title: 'Deep Sleep Cold Therapy Routine',
        streak: { current: 18, best: 24 },
        completionRate: 0.85,
        cells: [
          { date: days[0].date, label: 'Completed' },
          { date: days[1].date, label: 'Completed' },
          { date: days[2].date, label: 'Completed' },
          { date: days[3].date, label: 'Completed' },
          { date: days[4].date, label: 'Missed' },
          { date: days[5].date, label: 'Completed' },
          { date: days[6].date, label: 'Pending' },
        ],
      },
    ],
    days,
    scheduled: 28,
    completed: 24,
    compliance: 0.857,
  };
}

export function getGuestProgress() {
  const state = loadGuestState();
  const now = new Date();
  const heatmap = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date(now.getTime() - (364 - i) * 86400000);
    const hasCompletions = i % 7 !== 2 && Math.random() > 0.15;
    heatmap.push({
      localDate: d.toISOString().slice(0, 10),
      status: hasCompletions ? 'ACTIVE' : i % 7 === 2 ? 'REST' : 'OPEN',
      completions: hasCompletions ? Math.floor(Math.random() * 3) + 1 : 0,
    });
  }

  return {
    window: {
      from: heatmap[0].localDate,
      to: heatmap[heatmap.length - 1].localDate,
    },
    aggregates: [
      {
        localDate: now.toISOString().slice(0, 10),
        xpDelta: 450,
        healthDelta: 5,
        completions: 3,
      },
    ],
    heatmap,
    ledger: [
      {
        id: '00000000-0000-0000-0000-000000000701',
        sequence: 1,
        kind: 'COMPLETION',
        xpDelta: 120,
        healthDelta: 5,
        ruleVersion: 1,
        recordedAt: now.toISOString(),
        dayId: '00000000-0000-0000-0000-000000000010',
        occurrenceId: '00000000-0000-0000-0000-000000000101',
        sealCode: null,
        title: 'Linear Algebra: Eigenvectors & SVD Drill',
        pillar: 'Cognitive',
        localDate: now.toISOString().slice(0, 10),
      },
      {
        id: '00000000-0000-0000-0000-000000000702',
        sequence: 2,
        kind: 'SEAL_UNLOCK',
        xpDelta: 500,
        healthDelta: 0,
        ruleVersion: 1,
        recordedAt: now.toISOString(),
        dayId: null,
        occurrenceId: null,
        sealCode: 'SEAL_SPECTRAL_FOCUS',
        title: 'Seal of Spectral Focus',
        pillar: 'Cognitive',
        localDate: now.toISOString().slice(0, 10),
      },
    ],
    nextCursor: null,
    seals: [
      {
        achievementCode: 'SEAL_DISCIPLINE_INITIATE',
        ruleVersion: 1,
        unlockedAt: new Date(now.getTime() - 86400000 * 30).toISOString(),
        qualifyingOccurrenceId: null,
        qualifyingDayId: null,
        bonusXp: 250,
      },
      {
        achievementCode: 'SEAL_SPECTRAL_FOCUS',
        ruleVersion: 1,
        unlockedAt: new Date(now.getTime() - 86400000 * 14).toISOString(),
        qualifyingOccurrenceId: null,
        qualifyingDayId: null,
        bonusXp: 500,
      },
      {
        achievementCode: 'SEAL_40_DAY_CADENCE',
        ruleVersion: 1,
        unlockedAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
        qualifyingOccurrenceId: null,
        qualifyingDayId: null,
        bonusXp: 1000,
      },
    ],
    rank: {
      title: 'DISCIPLE',
      minimumLevel: 12,
      ruleVersion: 1,
    },
    stateVersion: state.stateVersion,
    pillarTotals: [
      { pillar: 'Cognitive', xp: 3850 },
      { pillar: 'Physical', xp: 2420 },
      { pillar: 'Craft', xp: 2150 },
    ],
  };
}

export function getGuestProfile() {
  const state = loadGuestState();
  const progress = getGuestProgress();

  return {
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'guest@kaizen.local',
      displayName: state.displayName,
      gender: 'male',
      timezone: state.timezone,
      goals: state.goals,
    },
    health: state.health,
    totalXp: state.totalXp,
    currentStreak: state.currentStreak,
    bestStreak: state.bestStreak,
    stateVersion: state.stateVersion,
    level: state.level,
    xpIntoLevel: state.xpIntoLevel,
    rank: progress.rank,
    seals: progress.seals,
    pillarTotals: progress.pillarTotals,
  };
}

export function createGuestQuest(input) {
  const state = loadGuestState();
  const id = '00000000-0000-0000-0000-' + Math.random().toString(16).slice(2, 14).padStart(12, '0');
  const now = new Date();

  const newQuest = {
    id,
    userId: '00000000-0000-0000-0000-000000000001',
    title: input.title,
    category: input.category,
    pillar: input.category === 'Academic' || input.category === 'Language' ? 'Cognitive' : input.category === 'Physical' ? 'Physical' : 'Craft',
    archivedAt: null,
    archiveEffectiveDate: null,
    version: 1,
    schedules: [
      {
        id: '00000000-0000-0000-0000-' + Math.random().toString(16).slice(2, 14).padStart(12, '0'),
        userId: '00000000-0000-0000-0000-000000000001',
        questId: id,
        title: input.title,
        category: input.category,
        pillar: input.category === 'Academic' || input.category === 'Language' ? 'Cognitive' : input.category === 'Physical' ? 'Physical' : 'Craft',
        difficulty: input.difficulty,
        target: input.target,
        ruleVersion: 1,
        effectiveFrom: now.toISOString(),
        effectiveTo: null,
        recurrence: input.recurrence?.kind || 'DAILY',
        weekdays: input.recurrence?.weekdays || [1, 2, 3, 4, 5, 6, 7],
      },
    ],
  };

  state.quests.unshift(newQuest);
  state.stateVersion += 1;
  saveGuestState(state);

  return newQuest;
}

export function editGuestQuest(id, input) {
  const state = loadGuestState();
  const quest = state.quests.find((q) => q.id === id);
  if (!quest) throw new Error('Quest not found');

  quest.title = input.title;
  quest.category = input.category;
  quest.version += 1;
  if (quest.schedules[0]) {
    quest.schedules[0].title = input.title;
    quest.schedules[0].category = input.category;
    quest.schedules[0].difficulty = input.difficulty;
    quest.schedules[0].target = input.target;
    quest.schedules[0].recurrence = input.recurrence?.kind || 'DAILY';
    quest.schedules[0].weekdays = input.recurrence?.weekdays || [1, 2, 3, 4, 5, 6, 7];
  }
  state.stateVersion += 1;
  saveGuestState(state);
  return quest;
}
