# Design

## Context

Slice 1 stores accounts and sessions. Use the architecture's data ownership and calendar rules, especially pages 6–8 and 10–11, for this change.

## Goals / Non-Goals

**Goals:** Preserve effective rules and snapshots across concurrent writes, with database constraints as a second line of defense.

**Non-goals:** Apply rewards or close elapsed days. The initialization ledger event, completion rules, and worker finalization belong to later slices.

## Decisions

- Use PostgreSQL DATE values and half-open intervals [from, to), with NULL as the unbounded end. Schedule overlap is scoped to the owned quest so different quests can coexist. Rest preference overlap is scoped to the user. Enforce ranges in reviewed SQL, including exclusion constraints, and cover any required PostgreSQL extension in the migration test.
- Keep the archive action timestamp distinct from the effective local date. Preserve every schedule version, including queued versions. The archive cutoff takes precedence over all schedule versions on and after that date. Reject stale and repeated archives and schedule edits after an archive is scheduled with a conflict and no changes.
- Append schedule versions strictly after the last scheduled start. Reject inserting at or before an already queued start with a conflict. Close the preceding open interval and insert its successor in the same transaction as the quest version bump. A rejected write rolls back all three changes.
- PostgreSQL enforces nonempty effective ranges, overlap exclusion per owned quest or rest preference owner, owner-consistent foreign keys, unique owner/local date and quest/day pairs, and deadlines after starts. The priority reference must point to an occurrence on the same owned day through a composite foreign key. Whether the referenced occurrence is planned is checked by the later day service in its transaction.
- Serialize catalog edits, rest changes, and materialization on the same owned PlayerState row. Use the server clock after obtaining the lock, reject already opened or elapsed dates, and apply quest version checks inside the transaction. During the staged rollout before task 3.1, a missing baseline fails closed with a retryable service error and no catalog writes. Reconcile accounts created after the schema backfill before enabling catalog access for them. Initialize new baselines with stateVersion 0 and nextEventSequence 1.
- Keep mutable catalog metadata separate from immutable historical inputs. Effective versions carry the fields needed to reconstruct historical occurrence snapshots, including title, category, pillar and reward rule inputs. Use the architecture's versioned XP defaults when snapshotting, without awarding XP.
- Store UTC start and deadline from consecutive local midnights using an IANA-aware library selected during implementation. Store pending timezone transitions durably and apply them under the owner lock at the next unopened boundary after the previous plan ends. Pick the first new-zone local date strictly after the last materialized date, with start at or after the previous deadline. Persist the owner-scoped skipped local-date interval and UTC gap as excused and non-rewarding in the same transaction as transition activation. Catch-up consults the saved intervals on every batch and advances past excused dates after restart without creating plans or counting them as missed. Preserve existing date keys and snapshots. Choose default priority by stable quest ID order.
- Use account creation's local date as the first eligible date. Materialize missing dates oldest first in batches of at most 30, committing each date atomically. This prepares historical plans for later finalization without advancing progression or marking missed days.
- Keep Today and catalog reads side-effect free. Calendar sync returns 202 with Retry-After until today's plan is ready. Today reads committed PlayerState values and supplies a recovery hint only when existing history supports one.
- Create Quick Quests and unplanned occurrences atomically on an eligible current day. Resolve existing owner-scoped IDs before checking current-day eligibility so a retry after midnight can return the original occurrence. Compare the original creation input on replay and return a conflict on changed input. If a globally unique ID belongs to another owner, return a generic conflict without exposing that owner's resource. Leave planned count, priority and progression unchanged.
- Change priority under the owner lock only for an owned planned occurrence on the requested day while priority is unlocked and the deadline has not passed.
- The API uses `archive: true` on quest patches for effective-date archival. Quest lists accept `after`, `limit`, `category`, and `archived` (whether an archive cutoff has been set).
- The pilot limit is 20 new Quick Quests per owned day. Matching retries return the existing occurrence even when the limit has been reached or that day has ended.
- The migration and services get separate commits. Apply the migration and account backfill before releasing registration changes that create PlayerState transactionally. Coordinate API writers during rollout so registration cannot create accounts between backfill and the updated release.

## Risks / Trade-offs

- Range constraints and optional priority references exceed what Prisma alone expresses. Verify SQL constraints on real PostgreSQL and check priority membership inside the transaction.
- Historical catch-up can be large. Bound batches and expose continuation; finalization remains a later responsibility.

## Migration Plan

Add the tables, indexes, constraints and backfill in a new reviewed migration. Verify the full migration chain on an empty disposable database and the upgrade from Slice 1 with preexisting accounts. Retain the new tables and historical data during an application rollback.
