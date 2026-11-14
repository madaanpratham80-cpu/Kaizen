# Design

## Context

Step 1 uses the Slice 2 calendar and the Slice 3 progression ledger. Pages 8, 10–11 and 14 of the architecture govern the API, historical reads and deletion.

## Goals / Non-Goals

**Goals:** Serve owned committed data, preserve historical interpretations, and delete accounts atomically.

**Non-goals:** Add screen UI, character animation, restore procedures, or change reward rules.

## Decisions

- Treat `week` as the first ISO local date of a seven-date interval. Use stored historical scheduling and snapshots, distinguish future and elapsed dates, and return no compliance ratio for a zero denominator. Reads do not materialize plans.
- Validate date windows, page limits, and cursor shape. Use stored local dates and distinct completions for the 365-day heatmap, preserving REST and EMPTY labels. Paginate the ledger by owner event sequence and use a high-water mark to keep a traversal stable when new events arrive. Use historical deltas, committed unlocks, and the authoritative versioned rank configuration. Attribute quest XP to its snapshot pillar and exclude seal bonuses from pillar totals.
- Derive owner identity from the session on all five routes. Profile returns committed PlayerState and safe account fields. Validate a strict settings allow-list and delegate timezone changes to Slice 2's transition logic, including its effective-date and repeated-change rules.
- For deletion, require a fresh password confirmation on the request and verify it asynchronously outside the transaction with the existing password rules. Apply the established account/IP auth attempt limits to password checks. Recheck session validity and credential identity under the owner lock, then delete sessions first, remove owned dependents in foreign-key order, and delete the user last. Retain global achievement definitions. Clear the session cookie after commit.

## Risks / Trade-offs

- Calendar and progression rows can reference one another. Review the dependency order and coordinate with the shared lock protocol, including concurrent registration/login session issuance and progression writes. Test rollback with an injected failure after session deletion.
- Deletion removes live records. Existing backup retention and restore safeguards remain governed by the architecture.
