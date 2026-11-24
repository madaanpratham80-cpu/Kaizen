# KAIZEN System Design (Earlier)

Source: `KAIZEN_System_Design.pdf`. Text transcribed from the PDF; page breaks are preserved below. Diagrams and visual layout remain in the source PDF.

## Page 1

KAIZEN | Proposed system design | 13 November 2026
1
 KAIZEN / System design
A practical college-project architecture
Version 1.1 | 13 November 2026 | Proposed implementation blueprint
KAIZEN translates completed real-world commitments into character health, XP, continuity and an
achievement archive. This design covers the five existing screens and the individual-user MVP.
The stack follows the project discussion. Numeric game rules, session expiry, day-finalization behavior and
deployment packaging below are proposed defaults for review. They have not been validated with users or
load tests.
System boundary
React + Vite renders Today, Quests, Habits, Progress and Profile. Tailwind handles layout and GSAP
handles optional character feedback. Express exposes a JSON REST API. Prisma accesses PostgreSQL.
Build the frontend into static files served by the same Express application. A single HTTPS origin simplifies
cookie sessions and deployment. During development, Vite proxies /api to Express.
One backend owns accounts, scheduling, completion and progression. A scheduled command from the
same codebase finalizes elapsed user days. Store character artwork as versioned static assets.
Browser / React / five screens
HTTPS / Express routes and session checks
Services / scheduling / completion / progression
Prisma / PostgreSQL / records and event ledger
Expected scale
Design target for a campus pilot: 100 registered users and 20 concurrent active sessions. These are
planning assumptions. Measure before increasing capacity. Standard database queries and a bounded
connection pool are sufficient starting choices.

## Page 2

KAIZEN | Proposed system design | 13 November 2026
2
 Modules and ownership
 Module
Responsibilities
Accounts
Registration, login/logout, session expiry, profile, timezone and onboarding
preferences.
Quests and schedules
Quest CRUD, recurrence, daily priority, Quick Quest, archive and future
schedule changes.
Day management
Materialize occurrences, snapshot plans, distinguish planned rest, finalize
missed days and catch up after downtime.
Completion and
progression
Validate a completion, award XP, recalculate health, advance streaks and
unlock seals atomically.
Read queries
Screen-specific Prisma queries assemble Today, habit grids, heatmap,
profile and ledger from shared records.
Request flow
Route -> session/validation middleware -> domain service -> Prisma -> PostgreSQL. Return a structured
result from the service. UI components animate the committed values returned by the API.
The completion service is the sole writer of task rewards. Day management and completion both lock the
same user state row before modifying progression. All code paths follow the same lock order.
Suggested project organization
client/src contains pages, shared components, API calls and character assets. server/src contains routes,
middleware and services. prisma contains schema, migrations and seed data. A jobs directory contains day
finalization commands.
Use small functions for reward calculation, schedule evaluation and streak calculation. Version reward rules
so old completions retain their original meaning.
Release boundary
MVP includes authentication, onboarding, quest CRUD, recurring habits, daily priority, XP, health,
scheduled-day streaks, recovery guidance, seals and all five screens. Add reminders, exports and optional
challenges after this flow is reliable. Social features belong to a later iteration.

## Page 3

KAIZEN | Proposed system design | 13 November 2026
3
 Database and relationships
 Record
Key fields and relationships
User
id, unique normalized email, passwordHash, displayName, timezone,
createdAt. Owns sessions, quests, days and progression.
Session
tokenHash, userId, expiresAt. Random opaque token in an HttpOnly cookie;
retain only its hash in storage.
PlayerState
userId primary key, totalXp, health, currentStreak, bestStreak,
lastFinalizedDate. One row per user is also the write-lock boundary.
Quest
id, userId, title, category, pillar, difficulty, recurrence, weekdays, start/end
date, archivedAt, version. A habit is a recurring quest.
DayPlan
id, userId, localDate, timezoneSnapshot, deadlineUtc, status,
priorityOccurrenceId, closedAt. Unique user/date.
QuestOccurrence
id, questId, dayPlanId, target/reward snapshot, planned flag, status,
completedAt. Unique quest/day.
ProgressEvent
id, userId, occurrenceId or sealId, kind, xpDelta, healthDelta, operationKey,
timestamp, ruleVersion. Unique source/kind award key.
Achievement +
UserAchievement
Definition code and condition; unique user/achievement unlock with
timestamp and qualifying event.
CompletionReceipt
userId, operationId, requestHash, storedResult. Unique user/operationId
makes completion retries deterministic.
Storage rules
Use foreign keys for every relationship and enforce ownership in service queries. Archive quests so
historical occurrences remain valid. Snapshot title, category, pillar and reward on occurrences to keep
historical displays stable.
Index Quest(userId, archivedAt), DayPlan(userId, localDate), QuestOccurrence(dayPlanId, status),
ProgressEvent(userId, timestamp, id) and Session(expiresAt). Require positive targets and bounded health.
Level and rank are derived from total XP.

## Page 4

KAIZEN | Proposed system design | 13 November 2026
4
 Rules for the first playable version
XP, levels and seals
Proposed rewards are Easy 10 XP, Medium 20 XP and Hard 35 XP. A completion earns its stored reward
once. Level = 1 + floor(totalXp / 100); progress within the level = totalXp modulo 100. Rank thresholds live in
a versioned configuration.
Seal eligibility is evaluated from committed activity. Unlock each seal once with its configured bonus. Seal
bonuses affect lifetime XP, while pillar XP comes from quest events. Inactivity never deducts XP.
Corrections to accidental awards would require a separate compensating-event policy before an undo
feature ships.
Proposed starter seals each award 25 XP once. Seven-Day Warrior requires seven ACTIVE scheduled days
in one streak; REST and EMPTY preserve but do not increase it. Iron Will requires the first ACTIVE
scheduled day after a MISSED day. Hundred Gates requires 100 distinct completed occurrences, including
Quick Quests. Record the triggering event.
Daily plans and streaks
Generate today on the first authenticated request using the account IANA timezone. Reconstruct intervening
scheduled dates from effective schedule history. A repeating quest has one occurrence per eligible date.
Persist future schedule versions or effective dates so catch-up uses the correct past plan.
The user can change priority until the first planned completion. That completion locks the selected priority, or
the displayed default if none was selected. The day becomes ACTIVE only when the locked priority is
complete.
At close, a scheduled day with planned occurrences and no priority completion becomes MISSED. ACTIVE
increments the streak once; MISSED resets it; REST preserves it. Planned rest is REST. An undesignated
day with N = 0 is EMPTY: preserve the streak without incrementing it and prompt routine setup. Timezone
and routine changes apply to future unopened days.
Health with a daily limit
Start at 70 health. When a plan opens, snapshot its planned occurrence count N. Proposed for testing:
Quick Quests earn XP without changing health or the denominator; show that effect before completion. If N
= 0, skip both formulas and apply no health change. If N > 0 and C planned occurrences are completed, the
cumulative positive health adjustment is floor(5 * C / N), capped at 5.
Apply only the difference from the previous cumulative adjustment. At close, a non-rest day applies -ceil(5 *
(N - C) / N). Clamp health to 0-100 and record the actual applied delta. REST has zero adjustment. Persist a
unique day-close event so retries cannot repeat the penalty.
Suggested visuals are Healthy 70-100, Tired 40-69 and Fading 0-39. Recovery is an animation when health
moves upward across a band. Every health state allows task completion. These values are game-balancing
defaults.
Recovery and rescheduling
After a miss, suggest an easy existing commitment and let the user simplify future plans. Retain the
historical miss. A reschedule before the day opens updates its future occurrence; after the day opens,
preserve its plan snapshot. Weekly completion rate excludes rest and uses planned occurrences only.

## Page 5

KAIZEN | Proposed system design | 13 November 2026
5
 APIs and atomic completion
 Method and path
Result
POST /api/auth/register, /login
Create account or authenticated session. POST
/logout revokes it.
GET /api/today
Current plan, priority, health, XP, streak and
recovery hint.
GET /api/quests
Paginated quests with independent category,
recurrence and status filters.
POST /api/quests
Create personal or recurring quest. Quick Quest
uses this endpoint.
PATCH /api/quests/:id
Validate owner and expected version; edit or archive
with defined effective date.
POST /api/occurrences/:id/complete
Commit completion and return progression
changes. Requires operationId.
PATCH /api/day-plans/:id/priority
Set the daily priority while the initial selection
remains open.
GET /api/habits?week=...
Date-bounded grid from the same occurrences used
by Today.
GET /api/progress?from=...&to;=...
Daily counts, rates, seals and cursor-paginated
ledger.
GET /api/profile; PATCH /api/settings
Identity, derived rank and pillar totals; validated user
settings.
Completion transaction
1. Authenticate and validate input. Start a database transaction and lock PlayerState for that user. Look up
the completion receipt. Reuse its result for an identical retry; reject reuse with a different request hash.
2. Load the occurrence with ownership and day-plan checks. If already complete, return its current state
without another award. Reject a closed-day completion under the initial policy and return today's recovery
action.
3. Mark complete, insert the unique XP event, apply any incremental health change, update day status and
streak, then evaluate seal eligibility and unique bonus events.
4. Store the response receipt and commit. The client refreshes Today, Habits, Profile and Progress together.
A failure rolls back the entire operation. Retry bounded transient transaction conflicts; never run network
calls inside the transaction.

## Page 6

KAIZEN | Proposed system design | 13 November 2026
6
 Operations and verification
Dates, downtime and concurrency
Run an hourly finalizer using stored UTC day deadlines. The next authenticated request also catches up
overdue days before accepting a mutation. Both paths acquire the same PlayerState lock and use unique
day-close events. Process one user in date order with bounded batches.
Deadline evaluation is server-side. At midnight, serialize finalization and completion through the user lock.
The initial policy accepts completion only before the stored deadline. If catch-up is unfinished, return an
explicit retry state rather than partially updated progression.
DayPlan stores the timezone and UTC deadline that were effective when it opened. Existing plans keep
those boundaries across timezone changes and daylight-saving transitions. Log system outages; a future
incident-repair action can append audited corrections.
Authentication and deployment
Use a standard password-hashing library with a salted adaptive hash. Set session cookies Secure, HttpOnly
and SameSite=Lax, rotate tokens on login and revoke them on logout. Seven-day expiry is a usability
choice; provide a visible logout for shared computers. Check request Origin or a CSRF token on mutations
and rate-limit authentication attempts.
Deploy the Express app with its static frontend to one Node-capable host and connect a managed
PostgreSQL database over TLS. Keep database credentials in server environment variables. Apply
reviewed migrations before releasing code that depends on them. Enable database backups and test
restoration with sample data.
Proportionate checks
Acceptance scenarios: duplicate clicks from two screens, concurrent different completions, failure after
event insertion, late midnight requests, a rest day between active days, a missed priority with other quests
complete, health at 0 and 100, schedule changes, seven-day catch-up and duplicate seal evaluation.
Verify ownership on every route using two test accounts. Reconcile cached XP and health with ledger
events. Verify heatmap and weekly-grid dates for two timezones. Character animation should respect
reduced-motion preferences.
Proposed pilot target: ordinary API requests under 500 ms at the 95th percentile with 20 active sessions,
excluding cold starts. Measure this target with seeded data; it is not a performance claim. Log request IDs,
latency, completion conflicts, job lag and errors without passwords or session tokens.

## Page 7

KAIZEN | Proposed system design | 13 November 2026
7
 Visual feedback and next steps
Character and feedback specification
Healthy (70-100) uses an upright, alert expression and olive indicator. Tired (40-69) softens posture with a
muted amber indicator. Fading (0-39) uses a subdued expression and red indicator. Include a text label and
percentage for every state.
On a successful committed completion, animate the XP and health bars over approximately 400 ms and
show the exact deltas. A seal reveal displays its title and earned XP once. Reduced motion replaces
movement with immediate value and label updates. Timing, artwork and colors are proposed defaults for
design review.
Build order and references
Build registration and quest CRUD first. Next implement one completion transaction and its cross-screen
refresh. Add recurrence and day finalization, then seals, charts and character animation. Finish with
responsive layouts, export and reminder work as scoped.
Product inputs: the project README and KAIZEN_Feature_List.pdf. The architecture and numeric rules in
this document are proposals. Prisma transaction syntax depends on the chosen major version; pin it when
implementation begins.
Prisma transaction documentation supports atomic writes and explicit handling of write conflicts. The design
specifies the invariant rather than a version-specific client method.
