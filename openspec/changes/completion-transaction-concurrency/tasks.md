# Tasks

## 1. Schema additions

- [x] 1.1 After the Slice 2 schema lands, add `ProgressEvent`, `CompletionReceipt`, `UserAchievement`, and `Achievement`. Add missing `PlayerState.stateVersion` and `nextEventSequence` fields, preserving existing values. Include owner-consistent references, versioned achievement definitions and unlock snapshots, owner-scoped uniqueness, counter checks, and ledger lookup indexes. Review the Prisma schema and SQL together.
- [x] 1.2 Create a new additive migration. Verify `slice-3-migration` on empty disposable PostgreSQL and on a Slice 2 database with existing player state. Check counter defaults, preservation and invalid-value rejection. Verify owner-scoped uniqueness for sequence, award key, operation ID and achievement code, including rejection of duplicate unlocks across definition versions. Check independent reuse across owners, undefined achievement versions, negative unlock bonuses, cross-owner and mismatched day/occurrence references, and award uniqueness after receipt deletion.
- [x] 1.3 Run the root verification commands in `AGENTS.md` section 4, including `pnpm test:db` against empty disposable PostgreSQL. Record results and commit schema, migration, and their tests separately from service work.

## 2. Progression domain

- [x] 2.1 Write and commit `progression-domain` tests first. Record the expected red run. Cover N=0, partial completion and close, health clamps at 0 and 100, allowance tracked at the cap, level boundaries, Quick Quest exclusions, seal thresholds and repeated eligibility, and REST/EMPTY between ACTIVE days and after a miss.
- [x] 2.2 Implement pure XP, health gain and close, level, streak, and seal functions without Express or Prisma imports. Verify `progression-domain` passes and commit the implementation separately.

## 3. Completion service

- [x] 3.1 Implement the seven-step completion transaction from the architecture: authenticate, lock PlayerState, deduplicate by operation ID, validate the owned occurrence and deadline, apply progress, evaluate seals, and commit. Use the shared lock order, finite transaction and lock-wait timeouts, and bounded retries. Perform request hashing and external work before the transaction. Verify identical replay after deadline and during a new backlog, new attempts gated by catch-up, deadline after lock wait, foreign ownership, and lock timeout behavior using real PostgreSQL. Commit the completion service separately.

## 4. PostgreSQL concurrency tests

- [ ] 4.1 Add `completion-concurrency-postgres` to `pnpm test:db`. Launch competing attempts on separate database connections, coordinate with explicit barriers, and assert overlap through observable lock waits before releasing the held lock. Verify simultaneous completion of the same occurrence awards once; simultaneous completion of distinct occurrences retains both rewards; overlapping identical operation IDs and payloads commit one award and one receipt and return identical authoritative results; and competing requests that reuse an operation ID with different accepted input yield one commit and a 409.
- [ ] 4.2 In the same suite, inject a failure after event insert and verify that occurrence, day, player state, events, unlocks and receipts all roll back. Race completion against the day finalization transaction in both lock acquisition orders. Verify completion before the deadline is reflected once in the final close, and closure first rejects new completion without an award. Exercise the shared finalization transaction directly, with no worker scheduling. Run `pnpm test:db` and commit Step 4 only after the real races pass. Gate Slice 4 on that pass.

## 5. Completion route

- [ ] 5.1 Wire `POST /occurrences/:id/complete` under `/api/v1`. Validate the occurrence ID and required `operationId` with shared contracts, enforce existing session, Origin and CSRF checks, and return committed progression deltas, seals and `stateVersion`. Verify `completion-route-ownership` with Supertest and two PostgreSQL accounts, including foreign IDs returning the missing-resource result with no foreign writes, omitted operation ID, success and changed-input 409. Run all five root checks and commit the route separately.
