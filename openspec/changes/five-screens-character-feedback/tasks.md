# Tasks

## 1. Read models and remaining routes

- [x] 1.1 After Slice 2 is available and Slice 3 concurrency tests pass, add owned `GET /api/v1/habits?week=YYYY-MM-DD`. Verify `habits-week-routes` covers seven local dates, invalid week input, historical schedules, future and elapsed dates, zero-denominator compliance, and absence of write side effects.
- [x] 1.2 Add owned `GET /api/v1/progress` with bounded aggregates, a 365-day local heatmap, cursor-paginated ledger, seals, rank, and pillar totals. Verify `progress-routes` covers range and page limits, empty history, DST and year boundaries, tied timestamps, concurrent inserts between pages, historical snapshots, and seal bonuses excluded from pillar totals.
- [x] 1.3 Add `GET /api/v1/profile` and `PATCH /api/v1/settings`. Verify `profile-settings-routes` covers public profile fields, committed state, invalid and unexpected settings fields, effective timezone dates, repeated-change restrictions, and unchanged historical plans.
- [x] 1.4 Add `DELETE /api/v1/account` with recent reauthentication, Origin and CSRF checks, and transactional deletion. Under the shared owner lock delete all sessions first, clear owned dependent records in foreign-key order, and delete the user last. Verify `account-deletion-postgres` covers incorrect password, full rollback after session deletion, revoked cookies, concurrent session or progression writes, preserved global definitions, and an untouched second account.
- [x] 1.5 Run Supertest with two real PostgreSQL accounts across all five routes. Verify private, no-store responses, owner-scoped reads/cursors, rejected owner overrides, and no foreign writes. Run the root verification commands in `AGENTS.md` section 4. Record results and commit Step 1 separately.


## 2. Shared token system

- [x] 2.1 Extend the Tailwind theme with semantic Healthy, Tired, and Fading colors, spacing, and typography. Review threshold boundaries, focus visibility, and contrast against the design sources.
- [x] 2.2 Build `HealthBar`, `XPMeter`, `StreakBadge`, `SealBadge`, and `QuestCard`. Give each a visible text label and a percentage with a named meaning alongside color. Respect `prefers-reduced-motion`. Verify each component with Vitest and Testing Library, covering labels, percentage boundaries or unavailable values, and reduced motion. Commit Step 2 separately.

## 3. Five screens

- [ ] 3.1 Extend the typed API client and shared account-scoped cache. Verify loading, empty, error, offline, expired-session, and catch-up states on each screen, bounded Retry-After polling with cleanup, and cache isolation across account changes.
- [ ] 3.2 Build Today and Quests. Today shows character state, health, streak, daily priority, remaining quests, committed completion feedback, and recovery guidance. Quests shows personal quests, filters, difficulty, and XP. Verify pending actions, operation ID reuse, older response rejection, and coordinated refresh after completion. Manually check both screens and record each result in this group's commit body.
- [ ] 3.3 Build Habits with the seven-day grid, per-habit streaks, and completion rate. Build Progress with heatmap, sequence-paginated ledger, seals, and pillar growth. Verify historical rendering, unavailable compliance, and paging. Manually check both screens and record each result in this group's commit body.
- [ ] 3.4 Build Profile with character, level, rank, goals, and achievement archive. Verify committed values and empty archive behavior. Manually check Profile and record the result in its separate commit body.
- [ ] 3.5 Verify all five screens in the browser, covering the required screen states, keyboard navigation, reduced motion, refresh, and account switching. Record the relevant checks in each screen group's commit body. Run all five root scripts, including the real PostgreSQL suite against an empty disposable database.

## 4. GSAP character feedback

- [x] 4.1 Add one GSAP presentation component for Healthy, Tired, and Fading posture, expression, and color, and 400 ms XP and health bar transitions after accepted committed completions. Verify health band boundaries in both directions, committed values at rest, repeated or stale responses, overlapping updates, cleanup on unmount or session replacement, and immediate motion-free updates when reduced motion is enabled or toggled mid-transition.
- [x] 4.2 Show seal title and awarded XP once per committed event ID per authenticated session. Verify that receipt replay, navigation, and reload do not repeat a shown event, that multiple distinct events each appear once, and that reduced motion still shows the seal text immediately.
- [x] 4.3 Check Step 4 in the browser with motion enabled and reduced, run the root verification scripts in `AGENTS.md` section 4 including the disposable PostgreSQL suite, and record results. Justify GSAP's purpose and rough installed size if added. Commit Step 4 separately.
