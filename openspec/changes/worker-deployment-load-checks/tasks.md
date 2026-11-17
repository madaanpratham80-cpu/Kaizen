# Tasks

## 1. Day finalization worker

- [x] 1.1 Add the hourly CLI in `apps/api/src/jobs/`. Verify `day-finalization-worker` discovers overdue plans and accounts without a current local plan, closes dates in order under the shared PlayerState lock, and processes at most 30 dates per owner.
- [x] 1.2 Verify `day-finalization-worker` on real PostgreSQL for 7-day and 90-day absences, restart from `lastFinalizedDate`, a concurrent completion, and 23- and 25-hour DST days. Document the command, run the root checks, and commit Step 1.

## 2. Session cleanup job

- [x] 2.1 Add the independent session cleanup CLI. Verify `session-cleanup-job` on real PostgreSQL removes expired sessions in bounded batches and preserves active sessions.
- [x] 2.2 Document the separate command, run the root checks, and commit Step 2.
