# Tasks

## 1. Day finalization worker

- [x] 1.1 Add the hourly CLI in `apps/api/src/jobs/`. Verify `day-finalization-worker` discovers overdue plans and accounts without a current local plan, closes dates in order under the shared PlayerState lock, and processes at most 30 dates per owner.
- [x] 1.2 Verify `day-finalization-worker` on real PostgreSQL for 7-day and 90-day absences, restart from `lastFinalizedDate`, a concurrent completion, and 23- and 25-hour DST days. Document the command, run the root checks, and commit Step 1.

## 2. Session cleanup job

- [x] 2.1 Add the independent session cleanup CLI. Verify `session-cleanup-job` on real PostgreSQL removes expired sessions in bounded batches and preserves active sessions.
- [x] 2.2 Document the separate command, run the root checks, and commit Step 2.

## 3. Deployment hardening

- [x] 3.1 Implement bounded readiness, graceful shutdown, allow-listed request logs, and production HSTS. Verify real PostgreSQL readiness and the HTTP drain and logging boundaries.
- [x] 3.2 Add a same-origin HTTPS ingress template and separate migration credentials. Verify routing and the runtime and migration database role boundaries. Run project checks and commit Step 3.

## 4. Verification and load checks

- [x] 4.1 Seed 100 accounts with 365 dates each. Inspect Today and heatmap plans and measure warm p95 with 20 distinct sessions.
- [x] 4.2 Rehearse backup and restore in isolated PostgreSQL and reconcile ordered ledger events with PlayerState. Record the measured results in the Step 4 commit.

## 5. Full final check

- [ ] 5.1 Run verification commands and verify the complete browser journey, including onboarding, cross-screen progression, a lost response, session expiry, and reduced motion.
- [ ] 5.2 Archive the completed change and push the verified branch.
