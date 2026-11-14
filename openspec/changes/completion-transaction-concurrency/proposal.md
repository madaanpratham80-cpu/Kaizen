# Proposal

## Why

Completion needs durable records for rewards, retries, and achievement unlocks before the service can safely handle concurrent requests.

## What Changes

- Plan the schema foundation for the completion transaction, with owner-scoped events, receipts, and achievement unlocks.
- Ensure PlayerState has the version and event sequence fields required for future atomic updates.
- Define pure progression rules and apply them through the completion transaction.
- Verify real PostgreSQL races and expose owned completion through the API.

## Capabilities

### New Capabilities

- `completion-ledger`: Persistent event, receipt, and achievement integrity for completion.

### Modified Capabilities

None.

## Impact

This change depends on Slice 2. Schema, domain tests, domain implementation, completion service, concurrency tests, and route wiring have separate commits. The day finalization transaction is included for concurrency verification. Worker scheduling and receipt cleanup are outside this change.
