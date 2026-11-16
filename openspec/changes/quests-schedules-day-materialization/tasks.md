# Tasks

## 1. Schema and migration

- [x] 1.1 Add `PlayerState`, `Quest`, `ScheduleVersion`, `DayPlan`, `QuestOccurrence`, and `DayPreferenceVersion` with one additive migration and an existing-account PlayerState backfill. Verify `slice-2-migration` on both empty PostgreSQL and a Slice 1 database with existing accounts. Check lookup indexes, account/session preservation, one baseline per account, nonempty ordered ranges, overlap rejection per owned quest or rest preference owner, overlapping dates allowed for distinct owned quests, owner-consistent foreign keys, unique owner/date and quest/day pairs, deadlines after starts, and priority references limited to the same owned day. The later day service checks that priority is planned. Commit schema and migration separately from services.

## 2. Quest catalog service

- [x] 2.1 Implement owned quest create, read, edit, and effective-date archive with shared Zod inputs and atomic `expectedVersion` checks. Verify `quest-catalog-postgres` covers create, read, edit, archive, concurrent edit conflict, missing PlayerState with no writes, stale and repeated archives with no side effects, and separate foreign read, edit, and archive cases that return the missing-resource result without changing foreign data.
- [x] 2.2 Append schedules atomically with catalog changes and reject dates that are today, past, opened, or at or before an already queued start. Verify `quest-schedule-history` covers adjacent ranges, overlapping ranges rejected within a quest, distinct owned quests allowed on the same dates, concurrent changes, rollback of the prior range and version bump on rejection, and exact archive cutoff behavior including queued rules and preserved history. Commit the catalog service and its tests together.

Apply each step only after its review and approval. Keep the schema, catalog, calendar, and route commits separate.

## 3. Calendar service

- [ ] 3.1 Initialize PlayerState in the registration transaction with the architecture's defaults. Verify `player-state-registration` covers existing-account backfill, reconciliation of registrations between staged changes, one state row per new account, and full rollback if initialization fails.
- [ ] 3.2 Add the owned planned-rest preference service. Verify `day-preference-history` covers effective boundaries, overlap rejection, and unchanged rules for earlier and opened dates.

- [ ] 3.3 Resolve IANA day boundaries and select historical schedule and rest rules. Verify `day-materialization-calendar` covers UTC, Asia/Kolkata, 23- and 25-hour DST days, REST, EMPTY, archive cutoffs, and schedule edits before and after opening.
- [ ] 3.4 Snapshot N planned occurrences atomically with deterministic priority. Backfill elapsed dates chronologically and open today. Verify `day-materialization-postgres` covers seven-day absence, no future day opening, same-day planned priority, retries and concurrent calls, midnight races, immutable snapshots, and resuming bounded work without gaps or duplicates.
- [ ] 3.5 Persist and apply pending timezone transitions at the next unopened boundary. Verify `calendar-timezone-transition` covers east and west changes, previous deadlines, no reopening of completed dates, excused gaps across multiple catch-up batches and restart, no plans or penalties for skipped dates, race-safe transition activation, and migration of any added storage. Commit Step 3 with its tests.

## 4. Routes

- [ ] 4.1 Wire `POST /calendar/sync` and `GET /today`. Verify `calendar-routes` via Supertest covers 200, 202 with Retry-After, continuation to readiness, and a read-only Today response with plan, priority, health, XP, streak and recovery hint.
- [ ] 4.2 Wire `GET /quests`, `POST /quests`, and `PATCH /quests/:id`. Verify `quest-routes` via Supertest covers each endpoint, query and body validation, stale versions, and effective-date archive.
- [ ] 4.3 Wire `POST /quick-quests` with client-generated IDs. Verify `quick-quest-routes` via Supertest covers first creation, concurrent and repeated matching requests, replay across midnight, changed-input and cross-owner ID conflicts, and unchanged XP, health, streak and planned count.
- [ ] 4.4 Wire `PATCH /day-plans/:id/priority` before priority lock. Verify `priority-routes` via Supertest covers valid selection, expired or locked days, unplanned occurrences, and wrong-day references.
- [ ] 4.5 Verify `slice-2-routes-two-accounts` via Supertest and real PostgreSQL covers every endpoint, foreign IDs and unchanged foreign state, owner isolation for collection reads and calendar sync, and existing session, Origin and CSRF enforcement. Run all five root checks against the supported disposable database setup and commit Step 4 separately.
