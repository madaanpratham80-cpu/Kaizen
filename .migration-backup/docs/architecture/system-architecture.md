# KAIZEN System Architecture

Source: `KAIZEN_System_Architecture.pdf`. Text transcribed from the PDF; page breaks are preserved below. Diagrams and visual layout remain in the source PDF.

## Page 1

KAIZEN / System architecture / v1.0 / 13 Nov 2026
1
KAIZEN / ARCHITECTURE 01
System architecture
Version 1.0 | 13 November 2026 | Implementation blueprint
Next.js frontend / Node.js + Express backend / PostgreSQL / Prisma
Purpose
KAIZEN turns real-world commitments into visible character development. This architecture supports a reliable
daily loop: choose a priority, perform the task, record completion, see progress, and return or recover the next
day.
Architecture decision
Use a modular monolith for business logic, with a separate Next.js web process and a small scheduled worker
sharing the backend code. PostgreSQL is the durable source of truth. All domain writes go through Express
services or the same services invoked by the worker.
What is decided
The requested stack and bcrypt password hashing are confirmed choices. The architecture preserves the five
core screens, shared quest occurrences, atomic completion, permanent XP, bounded health, schedule-aware
streaks and automatic seals.
What this document proposes
Hosting topology, API contracts, detailed schema, operational targets and rule values are implementation
recommendations. They are not evidence of deployed code, tested performance or configured encryption. Pin
supported dependency versions when implementation starts.
Relationship to earlier documents
This architecture replaces the React/Vite and Express-served static frontend topology in the earlier system
design. Next.js requires its own build and web runtime in this proposal. Product rules are carried forward, with
ambiguities resolved explicitly in the following pages.
Reading map
Pages
System boundary, containers and frontend
2-4
Backend, data model and constraints
5-7
API, completion and calendar lifecycle
8-10
Progression, security and privacy
11-13
Deployment, reliability and verification
14-16
Decisions, delivery order and references
17-18

## Page 2

KAIZEN / System architecture / v1.0 / 13 Nov 2026
2
KAIZEN / ARCHITECTURE 02
Scope & design priorities
Build a complete individual-user experience with clear extension points.
Included in the first release
Deferred extension
Accounts, onboarding, timezone and starter routine
Email verification and automated password recovery before
opening public signup
Quest CRUD, habits, Quick Quests and daily priority
Shared quests, guilds, rankings and competitive leagues
XP, levels, health, scheduled-day streaks and recovery
Protection tokens, advanced avatars and alternate themes
Five screens, heatmap, event ledger, automatic seals
Weekly narrative summaries, downloadable reports, push/email
reminders
Rest days are part of the core calendar
Basic planned rest is included now because streak correctness depends on it. More elaborate rest planning
and absence protection remain later work. This resolves the earlier feature list placing rest planning in the next
phase while system rules already depend on REST.
Invariants the architecture must protect
A task occurrence rewards at most once, regardless of screen or request retries. A day affects the scheduled
streak at most once. XP never decreases for inactivity. Health remains between 0 and 100. Historical rewards
retain their original rule version. One user cannot read or mutate another user's records.
Planning targets, not measured claims
Campus pilot assumption: 100 accounts and 20 concurrently active sessions. Target ordinary API p95 below
500 ms in a warm environment; measure bcrypt endpoints and backlog recovery separately. Aim for 99%
monthly availability, daily encrypted backups, an RPO of 24 hours and an RTO of 4 hours. Validate recovery
before trusting these targets.
Conscious limits
Completion is self-reported, not independent proof of real-world work. Online submission is required; offline
timestamps cannot backdate rewards. No public profile is enabled by default. No microservices, message
broker, Redis or Kubernetes is required for the pilot.

## Page 3

KAIZEN / System architecture / v1.0 / 13 Nov 2026
3
KAIZEN / ARCHITECTURE 03
Containers & trust boundaries
Separate presentation from domain authority without distributing the business rules.
User browser
Five screens / session cookie / interactions
HTTPS ingress / reverse proxy
One public origin: kaizen.example
/api/v1/* to API; other paths to Next.js
HTTPS
Next.js web process
App Router / layouts / client interactions
Static character assets; no database credentials
Express API process
Authentication / scheduling / completion
Progression / reads / Prisma client
pages + assets
JSON API
Scheduled worker
Same backend domain services
Day finalization / session cleanup
PostgreSQL
Private database / encrypted storage
State, history, sessions and receipts
Prisma + TLS
Prisma
One origin, separate processes
A reverse proxy routes /api/v1/* to Express and everything else to Next.js. Browser API calls use relative
URLs. This avoids cross-origin cookies in production. Next.js is a presentation server, not a second business
API. Express and the worker are reachable only through approved internal paths.
Data authority
Only backend processes hold database credentials. Prisma runs inside the API and worker, never in the
browser or Next.js. PostgreSQL enforces relational integrity and award uniqueness. Character assets are
public static files; personal progress is private API data.
Transport boundary
TLS protects browser-to-ingress traffic and database connections. On a single host, ingress-to-process traffic
may use loopback; across hosts use authenticated private networking with TLS. Firewall database access to
backend workloads. See references [1], [2] and [5].

## Page 4

KAIZEN / System architecture / v1.0 / 13 Nov 2026
4
KAIZEN / ARCHITECTURE 04
Next.js frontend
App Router organizes the experience; Express remains the authority for every private action.
Area
Responsibility
Routes
/login, /register, /onboarding, /today, /quests, /habits, /progress, /profile and /settings. Shared app
layout provides navigation and loading/error boundaries.
Server Components
Render layouts, public information and static structure. Keep the initial implementation free of
authenticated server-side API fetching.
Client Components
Fetch private screen data, submit mutations, render interactive grids/charts and animate committed
character changes. Use one typed API client and shared query cache.
Visual system
Carry forward the editorial dossier palette, square borders and typography. Isolate character assets
and optional GSAP animation behind a small presentation component.
Authentication and caching
On private routes, the client calls GET /auth/session before loading personal data. Redirects improve the
experience; Express enforces actual access. Session tokens stay in an HttpOnly cookie. Send Cache-Control:
private, no-store on private API responses and bypass proxy caching. Do not persist personal query caches in
localStorage.
Mutation flow
Disable the relevant action while pending. Reuse its operation ID after a timeout. Render XP and health from
the committed response, then invalidate Today, Habits, Profile and Progress queries. Never optimistically
award XP. Include a monotonically increasing stateVersion; discard older responses so retries cannot move
the UI backward.
Refresh and accessibility
Refetch on focus and after mutations to converge across tabs. A repeated receipt must not replay the seal
animation: track revealed event IDs for the session. Provide text and percentages alongside color, keyboard
actions, labeled errors and reduced-motion behavior. Empty, loading, offline, expired-session and catch-up
states must be explicit.
Future rendering option
If private server rendering becomes useful, Next.js may forward a request-scoped cookie to a fixed internal
API URL with caching disabled. It still must not use Prisma or independently implement reward rules. The pilot
does not need this additional request path. See [1].

## Page 5

KAIZEN / System architecture / v1.0 / 13 Nov 2026
5
KAIZEN / ARCHITECTURE 05
Backend modules
One deployable domain backend, organized by responsibility rather than by screen.
Module
Owns
Accounts
Registration, bcrypt verification, session lifecycle, profile, settings and account deletion.
Quest catalog
Quest definitions, ownership, validation, archiving and effective-dated schedule versions. Habits are
recurring quests.
Calendar
Day plans, occurrence snapshots, priority locking, rest plans, timezone transitions and chronological
catch-up.
Completion
The sole entry point for recording a task as done and initiating its reward transaction.
Progression
Pure rule calculations for XP, health, levels, streak transitions and seal eligibility. Called inside the
owner transaction.
Read queries
Screen-specific DTOs from shared tables: no separate screen-owned copies of task completion.
Worker
Due-day finalization, bounded missed-day catch-up, expired-session cleanup and operational job
reporting.
Request pipeline
Request ID -> body-size limit -> session lookup -> CSRF/origin protection -> runtime schema validation ->
owned-resource lookup -> service -> transaction -> DTO serializer -> centralized error handler. Public
authentication endpoints use their own rate limits and input validation.
Dependency direction
Routes call services. Services orchestrate domain calculations and Prisma queries. Domain calculations do
not import Express or UI code. Pass the transaction client to every write helper; do not accidentally write
through a global client halfway through a transaction.
Suggested source layout
apps/web contains Next.js routes, components and API access. apps/api contains HTTP routes, middleware,
services, domain rules, data queries and jobs. packages/contracts contains public DTO schemas.
apps/api/prisma contains the database schema and migrations. The worker is a command from apps/api, not a
second copy of its rules.
Ledger terminology
Use relational current state plus an append-only progression ledger. This is not full event sourcing: quest
definitions, sessions and other state are not reconstructed exclusively from events. PlayerState is updated
atomically with the ledger and periodically reconciled.

## Page 6

KAIZEN / System architecture / v1.0 / 13 Nov 2026
6
KAIZEN / ARCHITECTURE 06
Relational model
Each habit completion and each quest completion resolves to the same occurrence identity.
User
1:1 PlayerState
1:N sessions / quests / days
Quest
1:N ScheduleVersion
1:N QuestOccurrence
DayPlan
1:N occurrences
User + local date
QuestOccurrence
Quest + day unique
Reward / title snapshot
Pending or completed
ProgressEvent
User + event sequence
Unique award key
XP / actual health delta
UserAchievement
User + code unique
Trigger occurrence/day
One bonus event
CompletionReceipt
User + operation ID
Request hash
Committed result
Entity
Important columns
User / Session
User: id, normalizedEmail UNIQUE, passwordHash, timezone, createdAt. Session: tokenHash
UNIQUE, userId, expiresAt, createdAt.
PlayerState
userId PK/FK, totalXp, health, currentStreak, bestStreak, lastFinalizedDate, stateVersion,
nextEventSequence. Created with the account.
Quest / ScheduleVersion
Quest: id, userId, title, category, pillar, archivedAt, version. ScheduleVersion: questId,
effectiveFrom, effectiveTo, recurrence, weekdays, difficulty, target, ruleVersion.
DayPlan / occurrence
Day: userId, localDate, timezoneSnapshot, startsAtUtc, deadlineUtc, status, priorityId,
priorityLockedAt, plannedCount, healthGainAccounted, streakApplied, closedAt. Occurrence:
questId, dayPlanId, planned, status, completedAt and immutable task/reward snapshots.
Supporting tables and ownership constraints continue on page 7. Arrows show principal relationships; receipts are request records
scoped directly to the user.

## Page 7

KAIZEN / System architecture / v1.0 / 13 Nov 2026
7
KAIZEN / ARCHITECTURE 07
Constraints & history
Model historical meaning explicitly; do not reconstruct yesterday from today's edited routine.
Record / constraint
Implementation intent
Schedule and day preferences
Keep effective-dated ScheduleVersion and DayPreferenceVersion rows. Reject overlapping
effective ranges per owner. Preserve old rules so a worker can reconstruct days never opened
in the browser.
DayPlan
UNIQUE(userId, localDate); deadline later than start; priority must reference a planned
occurrence in this day. Store day status OPEN / ACTIVE / MISSED / REST / EMPTY
independently from closedAt.
QuestOccurrence
UNIQUE(questId, dayPlanId). Snapshot title, category, pillar, difficulty, target, rewardXp and
ruleVersion. A one-off Quick Quest has its own quest ID and planned=false.
ProgressEvent
userId, sequence, awardKey, kind, occurrenceId/dayId/sealCode, xpDelta, healthDelta,
ruleVersion and recordedAt. UNIQUE(userId, awardKey) and UNIQUE(userId, sequence).
Achievement /
UserAchievement
Versioned definition code and eligibility rule. UNIQUE(userId, achievementCode); unlockedAt,
qualifying occurrence or day, and bonus XP snapshot.
CompletionReceipt
UNIQUE(userId, operationId), requestHash, responseBody, createdAt. Keep for 30 days as a
proposed retention period; award uniqueness persists beyond receipt expiry.
Database integrity
Use foreign keys, NOT NULL where meaningful, bounded integer health and nonnegative XP/targets. Carry
userId through day/occurrence relationships and use composite foreign keys where practical to prevent
cross-owner references. Add SQL constraints through reviewed migrations when the selected Prisma version
cannot express them. Enforce priority membership in the service transaction as well.
Indexes and query shape
Index Quest(userId, archivedAt), DayPlan(deadlineUtc) for unclosed days, occurrence(dayPlanId, status),
event(userId, sequence), Session(expiresAt) and each effective schedule lookup. Unique keys already index
user/date and user/award. Paginate ledgers by sequence; avoid unbounded joins and N+1 queries.
Archive and retention
Archive quests instead of deleting history. Corrections use compensating events under a future audited policy;
MVP offers no reward undo. Append-only applies during account life, not indefinitely after account deletion. No
raw passwords or session tokens belong in these tables.

## Page 8

KAIZEN / System architecture / v1.0 / 13 Nov 2026
8
KAIZEN / ARCHITECTURE 08
HTTP API contract
Versioned JSON endpoints under /api/v1. Authentication determines user identity.
Endpoint
Behavior
POST /auth/register; POST /auth/login
Validate credentials; create account/session or authenticate. Set
cookie. Generic login errors.
GET /auth/session; POST /auth/logout
Return safe user/session context; revoke session and clear cookie.
POST /calendar/sync
Materialize today and catch up elapsed dates. 200 ready; 202 catching
up with Retry-After when bounded work remains.
GET /today; GET /quests
Today DTO and paginated/filterable quest definitions. Reads do not
materialize plans.
POST /quests; PATCH /quests/:id
Create or version an owned quest; expectedVersion prevents lost
edits. Archive via explicit field.
POST /quick-quests
Create an unplanned occurrence for today. Client-generated resource
ID makes creation retries safe; creation itself awards no XP.
PATCH /day-plans/:id/priority
Select an owned planned occurrence before priority lock.
POST /occurrences/:id/complete
Require operationId; return occurrence, progression deltas, seals and
stateVersion.
GET /habits?week=YYYY-MM-DD
Seven-day occurrence grid; historical scheduled counts determine
compliance.
GET /progress; GET /profile
Bounded date aggregates, 365-day heatmap, cursor ledger, seals,
rank and pillar totals.
PATCH /settings; DELETE /account
Validated settings with effective calendar change; deletion requires
recent reauthentication.
Validation and response rules
Validate UUIDs, enums, title lengths and date ranges; reject unexpected privilege fields. Never accept client
XP, health, userId or completion timestamp as authority. Return {data, requestId} or {error: {code, message,
details}, requestId}. Dates use ISO UTC strings plus explicit localDate where needed.
Status and consistency
400 invalid input; 401 no valid session; 403 failed origin/CSRF check; 404 absent or foreign resource; 409
version conflict, late completion or mismatched operation ID; 429 rate limit; 503 transient dependency failure.
On 202 calendar sync, show a catch-up state and poll. Mutation services also ensure calendar readiness, so
skipping the client sync cannot bypass it.

## Page 9

KAIZEN / System architecture / v1.0 / 13 Nov 2026
9
KAIZEN / ARCHITECTURE 09
Atomic completion
One successful transaction is the unit of progress, even when the network loses the response.
Order
Inside the completion operation
1 / Authenticate
Validate session and input. Canonical request hash includes route, occurrence ID and accepted payload.
First ensure chronological catch-up has completed; do not partially reward a new day.
2 / Lock
Start a short PostgreSQL transaction and lock the user's PlayerState row with SELECT ... FOR UPDATE
via a parameterized Prisma query. Recheck session validity and calendar/deadline after acquiring the lock.
3 / Deduplicate
Look up (userId, operationId). Identical hash returns saved result; different hash returns 409. If occurrence
is already complete under another key, return alreadyCompleted with no new award.
4 / Validate
Load owned occurrence and plan. Evaluate current database wall-clock time after lock wait. A pending
occurrence must be before its stored deadline; closed or expired days reject new completion.
5 / Apply
Lock priority on the first planned completion. Mark occurrence complete. Insert unique completion XP
event; compute incremental health. Transition to ACTIVE once priority is complete and apply streak only if
not already applied.
6 / Evaluate
Evaluate seals against the updated transaction state. Insert unique unlocks and bonus events. Update
PlayerState totals, event sequence and stateVersion; store response receipt.
7 / Commit
Commit every write together. Return authoritative values, exact deltas and event IDs. The browser
refreshes affected screens and animates only committed progress.
Concurrency policy
All progression-changing operations and calendar edits acquire the same user lock first, then days in date
order, then occurrences in deterministic order. PostgreSQL READ COMMITTED plus this enforced
serialization and unique constraints is the proposed strategy. Every writer must follow it. Other users can
proceed concurrently. See [3], [4].
Failure behavior
A pre-commit error rolls back all writes. A timeout after commit is retried with the same operation ID and
returns the receipt. Retry deadlock/transient transaction failures at most three times with jitter; never retry
validation failures. Network calls, password hashing and animation are outside the transaction. Transaction
and lock-wait timeouts must be finite.

## Page 10

KAIZEN / System architecture / v1.0 / 13 Nov 2026
10
KAIZEN / ARCHITECTURE 10
Calendar & day lifecycle
Use local dates for the user's routine and fixed UTC instants for acceptance deadlines.
Opening a plan
Calendar sync materializes elapsed missing dates in order using historical schedule and rest versions, then
opens today. Resolve local midnight boundaries using an IANA timezone library; do not assume a day is
always 24 hours. Snapshot N planned occurrences, their rewards and the default priority. Schedule edits apply
only to future unopened dates.
State transitions
A scheduled day starts OPEN. The first planned completion locks the selected or displayed default priority.
Completing that priority changes OPEN to ACTIVE and increments the streak exactly once. Other completed
tasks still earn rewards if the priority remains incomplete. At deadline OPEN becomes MISSED and resets the
streak; ACTIVE remains ACTIVE. closedAt prevents repeat finalization.
Rest and empty days
A preplanned REST day has no planned occurrences and no health effects. An undesignated day with N=0 is
EMPTY. REST and EMPTY preserve streak length without incrementing it. Quick Quests may be logged on
these days but cannot convert them to ACTIVE or change their health. Per-habit streaks use each habit's own
scheduled dates and completions.
Finalization and catch-up
An hourly worker checks existing overdue plans and accounts whose local calendar is behind, including dates
with no plan yet. Process at most 30 dates per user per batch as a starting limit. Commit each day in order with
a unique close event. A crash resumes from lastFinalizedDate. Request-driven sync uses the same services;
incomplete catch-up returns 202 without accepting fresh progress.
Midnight race
Completion and finalization serialize on the user lock. Accept a new completion only if the wall clock checked
after lock acquisition is earlier than deadlineUtc. A request sent before midnight but processed after it is late. A
previously committed completion may still return its receipt after midnight. Client clocks and network arrival
time do not override this rule.
Timezone changes
Store changes as pending until the next unopened boundary after the current plan closes. Never reopen a
completed local date. Choose the first new-zone date strictly after the last materialized date, with start no
earlier than the previous deadline; label any transition gap as excused and non-rewarding. Show the effective
date before saving. Restrict repeated zone changes during the pilot and test east/west travel as well as DST.

## Page 11

KAIZEN / System architecture / v1.0 / 13 Nov 2026
11
KAIZEN / ARCHITECTURE 11
Progression rules
Versioned defaults carried forward from the system design; tune through playtesting.
Metric
Rule / implication
XP and level
Easy 10, Medium 20, Hard 35 XP, once per occurrence. Level = 1 + floor(totalXp / 100). Level
progress = totalXp mod 100. No XP loss from missed days. Rank thresholds are versioned
configuration.
Health gain
Start at 70 with an initialization event. For N>0 planned occurrences and C completed, cumulative
earned health = floor(5*C/N). Apply only the increase since healthGainAccounted. Track the calculated
allowance even when health is clamped at 100.
Health close
For N>0, apply -ceil(5*(N-C)/N) once at close. Clamp resulting health to 0-100 and record actual delta.
For N=0 or REST, skip both formulas entirely.
Quick Quests
Proposed XP-only policy: planned=false, excluded from N, health, daily priority and planned
compliance. They count toward lifetime completion milestones.
Seals
25 XP once each: Seven-Day Warrior at 7 ACTIVE days in a continuous streak; Iron Will on the first
ACTIVE day after a miss; Hundred Gates at 100 distinct completed occurrences. Rest/empty days do
not erase pending recovery.
Pillars and recovery
Pillar XP comes only from quest completion events; seal bonuses remain unassigned. Recovery
suggests a small existing commitment or simpler future plan; it does not erase missed dates or grant
an automatic streak repair.
Worked example
With four planned tasks, completing two earns floor(5*2/4)=2 cumulative health points. Closing with two
incomplete applies -ceil(5*2/4)=-3. Net health is -1 before clamping. If the locked priority was among the
completed tasks, the day is ACTIVE despite the partial-plan health penalty. These metrics intentionally
describe different aspects of consistency.
Explainable read models
Weekly compliance = completed planned occurrences / scheduled planned occurrences in the selected
elapsed interval; display N/A for zero denominator. Heatmap intensity uses distinct completions by the stored
local date, with REST/EMPTY labels. Ledger ordering uses user sequence, not timestamp ties. Keep historical
rule versions and actual deltas so current balance changes do not rewrite earlier totals.

## Page 12

KAIZEN / System architecture / v1.0 / 13 Nov 2026
12
KAIZEN / ARCHITECTURE 12
Authentication & security
bcrypt protects passwords; sessions and ownership checks protect account access.
Password storage
Use asynchronous bcrypt hashing and comparison in Express. Start with configurable cost 12, benchmark on
deployment hardware, and increase through rehash-on-login when appropriate. Each hash receives a
library-generated salt. Enforce a clear password policy, proposed minimum 12 characters and maximum 72
UTF-8 bytes, at registration and password change. Reject oversize input rather than silently truncating; never
trim or normalize passwords. See [6].
Opaque server-side sessions
Generate at least 32 cryptographically random bytes for each token. Store only a SHA-256 token digest in
Session; a fast hash is appropriate for a high-entropy random token, unlike a password. Set
__Host-kaizen_session with Secure, HttpOnly, SameSite=Lax, Path=/ and no Domain. Proposed absolute
lifetime: seven days. Rotate on login; revoke on logout, password change and deletion.
Request protection
Require a matching configured Origin and a session-bound CSRF token on authenticated mutations.
Registration/login also enforce origin checks. Apply a restrictive CORS policy; production needs no
cross-origin credentialed access. Validate proxy trust configuration so forged forwarded headers cannot
bypass HTTPS or IP rate limits. Set security headers and a CSP compatible with the actual Next.js build. See
[5].
Authorization is independent of authentication
Every query and mutation constrains ownership by the authenticated user ID. Foreign IDs return 404 without
exposing another account's existence. Validate ownership for nested priority IDs, quest IDs and date ranges.
Do not rely on UI hiding, unpredictable UUIDs or a logged-in session alone.
Abuse and resource limits
Limit login attempts by both account identifier and IP; use generic failures and a dummy bcrypt comparison for
unknown accounts. Bound JSON bodies, title sizes, page sizes and daily Quick Quest counts. Use
per-instance limits only for the single-instance pilot; introduce a shared limiter before multiple API replicas.
Account launch boundary
The private pilot can use invited accounts without an email integration. Before public signup, add verified email
and single-use, expiring, hashed reset tokens through a chosen mail provider. Never implement password
recovery by emailing an existing password or storing reversible passwords.

## Page 13

KAIZEN / System architecture / v1.0 / 13 Nov 2026
13
KAIZEN / ARCHITECTURE 13
Encryption & privacy
Encrypt transport and storage while clearly defining who can still access the plaintext.
Data / boundary
Required protection
Browser traffic
HTTPS only in production; redirect HTTP and enable HSTS after validating the deployment.
Never put credentials in URLs.
Database connection
Use PostgreSQL TLS with certificate verification. Avoid configurations that encrypt traffic but
skip server verification.
Database disks and backups
Select a provider with encryption at rest and encrypted backups; verify the chosen plan, key
management and restore permissions before launch. This is a deployment requirement, not
an already-enabled feature.
Passwords and session tokens
bcrypt password hashes and digests of random session tokens. Do not attempt to decrypt
passwords.
Runtime secrets
Database credentials and signing/CSRF secrets in the deployment secret store. Separate
dev/prod credentials, rotate when exposed, and never use NEXT_PUBLIC_ for secrets.
Quest text and personal history
Private by default, accessible only through owned-resource API reads. Do not log task titles,
notes, passwords, tokens or full request/response bodies.
What encryption does not do
Provider disk encryption protects storage media and backups; the application and authorized database
operators can still read records. This design does not offer end-to-end encryption. User ownership checks and
limited operational access remain essential. Avoid collecting sensitive journals or proof uploads in the MVP;
revisit field-level encryption and key recovery if that scope changes.
Retention and deletion
Proposed defaults: expire sessions promptly, retain receipts 30 days and operational logs 14 days, and keep
activity history while the account is active. Deletion revokes sessions and removes the account's records in a
transaction. Encrypted backup copies expire within a documented retention window, proposed 30 days; they
are not instantly erased.
Restore and export safeguards
Maintain a minimal deletion manifest outside database snapshots so a restore can reapply deletions before
serving traffic; retain it only for the backup window. Later exports should be authenticated, generated on
demand and private/no-store. Do not introduce permanent public report URLs by default. Review these
retention choices before handling real student data.

## Page 14

KAIZEN / System architecture / v1.0 / 13 Nov 2026
14
KAIZEN / ARCHITECTURE 14
Deployment & delivery
A small deployment can preserve strong boundaries and remain straightforward to operate.
Unit
Deployment plan
Ingress
One HTTPS hostname; reverse proxy to Next.js and /api/v1 to Express. Preserve request IDs, apply
body/time limits, and disable caching for private API paths.
Web
Next.js production build in its own Node process/container. Only public configuration; public static assets
may receive immutable cache headers when content-hashed.
API
Long-running Express process/container with Prisma client, runtime secrets and a bounded connection
pool. Graceful SIGTERM drains HTTP requests before closing the pool.
Worker
Scheduled CLI from the API build, initially hourly. No public worker endpoint. Concurrent invocations
remain safe through user locks and unique close events.
Database
Managed PostgreSQL in the same region and private network where possible. Runtime role has only
necessary data permissions; a separate migration role owns schema changes.
Connection budget
One Prisma client per process, not per request. Initial budget example: API pool 5 connections and worker
pool 2; reserve capacity for migrations and operations. These are tuning proposals. Total connection budget
must account for every replica. Verify the selected Prisma major's pooling and adapter configuration before
implementation.
Build and release pipeline
On each change: lockfile install, typecheck/lint, domain tests, PostgreSQL integration tests, Next.js production
build and critical browser tests. Build versioned images. Apply reviewed migrations once using the migration
role; deploy API and web, run readiness and smoke checks, then enable the worker. Keep API contract
changes backward compatible during rolling releases.
Schema and rollback
Use expand/contract migrations: add compatible columns first, backfill in bounded jobs, switch reads, remove
old fields in a later release. Reverting an image does not reverse a migration. Take a backup before risky
changes and rehearse restore. Seed demo accounts separately from production data; do not ship known
demo credentials to a public instance.
Local development
Run Next.js, Express and a disposable PostgreSQL database. Configure a local /api proxy for the same
request shape as production. Use a development-only non-Secure cookie name over localhost HTTP. Never
weaken production cookie/TLS configuration to solve local development problems.

## Page 15

KAIZEN / System architecture / v1.0 / 13 Nov 2026
15
KAIZEN / ARCHITECTURE 15
Reliability & observability
Recover safely from ordinary failures before adding infrastructure.
Failure
Expected behavior
Database unavailable
API returns a sanitized 503; no success animation or local XP award. Client retries safe
reads and retains a pending operation ID for an ambiguous completion.
API crash after commit
Retry returns stored receipt or already-completed state. Database uniqueness prevents
another reward.
Worker outage
Stored deadlines still reject late completions. Next sync catches up historical days in
bounded batches; worker resumes chronological processing later.
Two tabs / concurrent worker
User lock serializes progression changes. Unique occurrence awards and day-close events
remain the final duplicate guard.
Connection exhaustion / lock wait
Bound concurrency and query duration, stop automatic retries after the cap, return retry
guidance and alert on sustained saturation.
Stale frontend deployment
Versioned API contracts and stateVersion checks protect consistency. Deployment smoke
tests detect incompatible response assumptions.
Signals worth recording
Structured logs include request ID, route template, result code, duration, deployment version and a restricted
pseudonymous actor ID. Track API error rate/p95, database pool waits, lock conflicts, duplicate-award
conflicts, catch-up backlog, oldest overdue deadline and worker success time. Redact cookies and
authorization headers at ingress as well as application logs.
Health checks and alerts
/health/live confirms the process is running; /health/ready checks a bounded database query and compatible
schema. Neither exposes secrets. Suggested alerts: sustained 5xx above 2%, worker silence beyond two
hours and backup failure. Calibrate thresholds from pilot traffic to avoid noisy paging.
Recovery and reconciliation
Back up daily and test restoration into an isolated database before launch, then periodically. Reconcile
PlayerState XP and health against ordered ledger deltas including initialization; reconcile streaks against
DayPlan history. Investigate discrepancies before repairs. If a system outage unfairly affects users, a future
explicit repair command must append an audited correction rather than silently edit history.

## Page 16

KAIZEN / System architecture / v1.0 / 13 Nov 2026
16
KAIZEN / ARCHITECTURE 16
Verification plan
These are release gates to implement, not tests already executed for an application.
Layer
Required scenarios
Domain tests
N=0, partial completion, health 0/100, quick-quest exclusion, level boundaries, priority lock, seal
thresholds, REST/EMPTY between ACTIVE days and recovery eligibility after a miss.
Real PostgreSQL tests
Two simultaneous completions of one occurrence yield one reward; different occurrences retain
both rewards. Inject failure after event insert and verify rollback. Race completion with finalizer.
Reuse operation ID with a changed payload and expect 409.
Calendar tests
DST 23/25-hour days; UTC and Asia/Kolkata; east/west timezone changes; edits before/after plan
opening; 7-day and 90-day absence; worker restart midway through catch-up; late request after
lock wait.
API security tests
Two accounts cannot access each other's quests, days, receipts or profile. Test session
expiry/revocation, origin/CSRF rejection, bcrypt multibyte byte limit, body limits, bad IDs and
generic authentication failures.
Browser journey
Register -> onboard -> select priority -> complete via Today -> see same state in Habits -> view
ledger and profile. Reload, use another tab, simulate lost response, expire session and verify
reduced-motion behavior.
Operational tests
Load representative data with 20 active sessions, measure latency and locks, test worker overlap,
verify database TLS, restore backup, reapply deletion manifest and rehearse a compatible
deployment rollback.
Acceptance evidence
For a duplicate request, assert one occurrence transition, one completion award, the correct health allowance
and one seal unlock at most. For a crash, assert every transactional write committed or none did. For a
cross-user request, verify both the HTTP result and that no database row changed.
Performance dataset
Seed at least 100 users with one year of plans, occurrences and ledger entries, including frequent habits and
archived quests. Inspect query plans for Today and the annual heatmap. Measure under concurrent reads,
writes and finalization rather than reporting a fast empty-database benchmark.
Completion criterion
The architecture is implemented when the end-to-end journey, concurrency tests, authorization tests and a
restore rehearsal pass on the actual deployment configuration. A PDF or a successful build alone does not
establish these properties.

## Page 17

KAIZEN / System architecture / v1.0 / 13 Nov 2026
17
KAIZEN / ARCHITECTURE 17
Decisions & implementation order
Keep the architecture coherent as the project moves from specification to code.
Decision
Reason / tradeoff
Separate Next.js + Express
Matches the chosen stack and keeps domain logic portable. Costs two runtime
processes rather than the previous static frontend deployment.
One backend with internal modules
Enables atomic progression without distributed transactions. Modules can be extracted
later only if measured constraints justify it.
PostgreSQL + Prisma
Relational ownership, constraints and transactional writes suit the domain. A few
reviewed parameterized SQL operations may still be needed for locking and constraints.
Database sessions + bcrypt
Simple server-side revocation with the requested password hashing. Adds a database
session lookup; expiry and cleanup must be operated.
User-level write serialization
Makes the daily rules tractable at pilot scale. Heavy activity for one account serializes;
lock time must remain short.
No offline reward submission
Avoids trusting client clocks and resolving backdated conflicts. Users need a successful
online submission before the day deadline.
Build in five demonstrable slices
1. Establish Next.js/Express/PostgreSQL, Prisma migrations, bcrypt login and ownership tests.
2. Add quest definitions, schedule versions and deterministic day materialization.
3. Implement completion, receipts, locking, health/streak rules and concurrency tests.
4. Connect all five screens, ledger, seals, character feedback and accessibility.
5. Finish worker catch-up, deployment hardening, load checks and restore rehearsal.
Resolve during implementation
Pin compatible Node, Next.js, Express, Prisma and PostgreSQL versions. Select the hosting provider and
verify storage/backup encryption. Benchmark bcrypt cost and pool sizes. Playtest XP/health formulas and
Quick Quest limits. Define rank thresholds and final character artwork without changing historical reward
snapshots.
Scale only on evidence
First optimize indexes, payloads and bounded queries. Add API replicas when needed, with shared rate limits
and a combined database connection budget. Add a job queue only when external reminders or exports need
durable asynchronous delivery; use an outbox to coordinate those later side effects with database commits.

## Page 18

KAIZEN / System architecture / v1.0 / 13 Nov 2026
18
KAIZEN / ARCHITECTURE 18
References & provenance
Primary technical references checked on 13 November 2026.
Local product inputs: README.md, KAIZEN_Feature_List.pdf and KAIZEN_System_Design.pdf (v1.1). These
establish the product loop and earlier decisions; this document does not claim the repository already
implements them.
[1] Next.js: Server and Client Components
https://nextjs.org/docs/app/getting-started/server-and-client-components
Rendering boundaries and browser interactivity.
[2] Next.js: Self-hosting
https://nextjs.org/docs/app/guides/self-hosting
Separate runtime deployment and reverse-proxy considerations.
[3] Prisma: Transactions and batch queries, v7 reference
https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions
Atomic transactions and short transaction duration. This is a versioned reference, not a decision to pin Prisma v7.
[4] PostgreSQL: Explicit locking
https://www.postgresql.org/docs/current/explicit-locking.html
Row locks, concurrency and deadlock behavior.
[5] Express: Production security practices
https://expressjs.com/en/advanced/best-practice-security/
TLS, cookies, input handling and deployment security.
[6] node.bcrypt.js: Project documentation
https://github.com/kelektiv/node.bcrypt.js
Asynchronous hashing, salts, work factor and the 72-byte input limit.
Interpretation and status
The system boundaries, schema, API paths, numeric rules, retention periods and operating targets are
KAIZEN-specific design proposals. External references support the underlying mechanisms, not the suitability
of every proposed default. No competitor's private architecture is assumed or reproduced.
