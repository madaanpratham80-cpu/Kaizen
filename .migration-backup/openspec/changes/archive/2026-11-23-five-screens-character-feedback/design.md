# Design

## Context

Step 1 uses the Slice 2 calendar and the Slice 3 progression ledger. Pages 8, 10–11 and 14 of the architecture govern the API, historical reads and deletion.

## Goals / Non-Goals

**Goals:** Serve owned committed data, preserve historical interpretations, delete accounts atomically, and present progression consistently across the five screens.

**Non-goals:** Implement restore procedures or change reward rules.

## Decisions

- Treat `week` as the first ISO local date of a seven-date interval. Use stored historical scheduling and snapshots, distinguish future and elapsed dates, and return no compliance ratio for a zero denominator. Reads do not materialize plans.
- Validate date windows, page limits, and cursor shape. Use stored local dates and distinct completions for the 365-day heatmap, preserving REST and EMPTY labels. Paginate the ledger by owner event sequence and use a high-water mark to keep a traversal stable when new events arrive. Use historical deltas, committed unlocks, and the authoritative versioned rank configuration. Attribute quest XP to its snapshot pillar and exclude seal bonuses from pillar totals.
- Derive owner identity from the session on all five routes. Profile returns committed PlayerState and safe account fields. Validate a strict settings allow-list and delegate timezone changes to Slice 2's transition logic, including its effective-date and repeated-change rules.
- For deletion, require a fresh password confirmation on the request and verify it asynchronously outside the transaction with the existing password rules. Apply the established account/IP auth attempt limits to password checks. Recheck session validity and credential identity under the owner lock, then delete sessions first, remove owned dependents in foreign-key order, and delete the user last. Retain global achievement definitions. Clear the session cookie after commit.
- Define semantic colors, spacing, and type in the existing Tailwind theme. Use one health-state mapping for Healthy, Tired, and Fading. Review its cutoffs against the design sources before implementation.
- Pair each component's color with a visible label and named percentage. Use committed health, progress within the level, progress toward the named streak or seal milestone, and quest progress toward its target. For a binary quest or seal use 0% or 100% from the committed state, with the meaning labeled. When the API lacks a meaningful denominator, show the percentage as unavailable and retain the label. Use static values and labels when reduced motion is requested.
- Use App Router layouts for static structure and Client Components for private data. Extend the typed client and use a shared query cache scoped to the active account. Clear it on logout or session changes and keep private data out of persistent browser storage.
- Keep pending, empty, error, offline, expired-session, and catch-up states distinct. Retry calendar sync using the API's Retry-After and stop polling when the screen unmounts or the session expires. Prevent duplicate submissions, reuse the operation ID on retry, discard older stateVersion responses, and refetch Today, Habits, Progress, and Profile together after completion. Deduplicate seal feedback by event ID for the session.
- Keep GSAP inside one character feedback presentation component. Reuse the shared health bands for distinct posture, expression, and color. Animate the XP and health bars for 400 ms only when the client accepts a new committed completion. Initial loads, ordinary refetches, and known replays render the current values immediately. An accepted newer completion supersedes any animation still in flight, and unmount or session replacement cleans up its GSAP work.
- Reveal each committed seal event once per authenticated session, using the event's title and awarded XP. Track only event IDs in session-scoped presentation state that survives screen navigation and reload, and reset it when the authenticated session changes or ends. Keep credentials and private response data out of browser storage. When reduced motion is enabled, immediately update values, labels, character art, and static seal text. Cancel any movement already in flight if the preference changes.

## Risks / Trade-offs

- Calendar and progression rows can reference one another. Review the dependency order and coordinate with the shared lock protocol, including concurrent registration/login session issuance and progression writes. Test rollback with an injected failure after session deletion.
- Deletion removes live records. Existing backup retention and restore safeguards remain governed by the architecture.
