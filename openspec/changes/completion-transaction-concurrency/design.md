# Design

## Context

The architecture defines the ledger, receipts and versioned achievements on pages 6–7 and the completion transaction on page 9. Slice 2 is pending and its PlayerState design already names both counters.

## Goals / Non-Goals

**Goals:** Enforce persistence invariants for future completion writers and preserve existing data during upgrade.

**Non-goals:** Schedule finalization workers or implement receipt cleanup.

## Decisions

- Use owner-scoped uniqueness for event sequence, award key, receipt operation ID, and achievement code per user. Retain award uniqueness independently of receipts so deleting an expired receipt cannot remove the award guard.
- Use composite owner references for owned occurrences and days. When both references are present, enforce that the occurrence belongs to the referenced day. Store achievement definition versions by code and rule version, require unlocks to reference an existing definition version, and record unlock provenance and nonnegative bonus XP snapshots. Keep unlock uniqueness on owner and achievement code across definition versions.
- Reconcile PlayerState with the delivered Slice 2 migration. If both counters and their invariants already exist, reuse them without recreating the columns. Initialize missing stateVersion to 0 and missing nextEventSequence to 1 when no ledger events exist. Preserve and validate existing values. Reject negative versions, nonpositive sequences, and NULL counters. Abort the migration on invalid existing values rather than resetting them.
- Pure domain functions take snapshots and explicit inputs. Calculate XP from the stored reward snapshot, level as 1 + floor(totalXp / 100), and incremental health from floor(5*C/N) minus previously accounted gain. Track earned allowance even at the health cap. At close use -ceil(5*(N-C)/N) and clamp health to [0,100]. Skip health formulas when N=0 or on REST. Quick Quests earn XP only and count toward lifetime completion seals. ACTIVE increments streak once, MISSED resets it at close, and REST and EMPTY preserve streak and pending recovery.
- Evaluate seals against committed-to-be state, excluding already unlocked codes. Use the architecture thresholds for Seven-Day Warrior, Iron Will, and Hundred Gates. Record each unlock and its bonus once.
- Authenticate, validate input, canonicalize and hash the request, before starting the transaction. Use READ COMMITTED, a parameterized PlayerState row lock first, days in date order second, and occurrences in deterministic order last. Recheck session and calendar state under lock, and read database wall-clock time after waiting for locks.
- While locked, replay an identical saved receipt before checking catch-up readiness or deadline eligibility for new work. If no receipt exists and catch-up is pending, return the catch-up result without applying progression. A changed hash for the same operation ID returns 409. A completed occurrence under another operation ID returns alreadyCompleted without a second award. For new completions, require an owned pending occurrence on an open, unexpired plan. Apply completion, priority lock, awards, streak, unlocks, counters and receipt in one transaction. Respond only after commit.
- Set finite transaction and lock-wait timeouts. Retry only deadlocks or transient transaction failures, at most three times with jitter outside the transaction. Keep writes append-only and pass the transaction client to every write helper. Keep network calls, hashing and animation outside the transaction.
- Write domain tests first and record the expected red run before committing them. The immediately following implementation commit restores the domain and root checks. This test-first checkpoint is the requested exception to the usual passing-test commit rule.

## Risks / Trade-offs

- Use separate PostgreSQL connections and wait for evidence of lock contention in race tests. Use bounded waits and release barriers in cleanup so failures cannot hang the suite. Both race outcomes must preserve the deadline rule even though a valid completion can precede a later successful close.

- Parallel planning could duplicate PlayerState columns. Verify Slice 2 is merged and inspect its schema and migrations before generating this migration.
- Owner-scoped keys must distinguish same-user conflicts from legitimate reuse by a different user. Test both.

## Migration Plan

Add a new migration after Slice 2. Verify the full chain in disposable PostgreSQL and a separate upgrade with existing Slice 2 state. Retain added tables during application rollback.
