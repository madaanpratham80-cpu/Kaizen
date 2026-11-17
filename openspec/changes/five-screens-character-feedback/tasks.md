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
